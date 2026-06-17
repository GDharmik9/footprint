import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { 
  initDatabase, 
  prisma,
  seedUserChallenges,
  seedWeeklyLeague
} from './database.js';
import { 
  publishCarbonEvent, 
  startPubSubSubscriber 
} from './gcp.js';
import { 
  computeHousingCO2, 
  computeTransportCO2, 
  computeFoodCO2, 
  computeArchetypeBaseline,
  GRID_FACTORS
} from '@footprint/carbon-math';
import { 
  User, 
  CarbonEvent, 
  Challenge, 
  Voucher 
} from '@footprint/shared-types';
import { 
  authenticateToken, 
  AuthenticatedRequest, 
  JWT_SECRET 
} from './auth.js';
import { getGridCarbonFactor } from './services/electricityMaps.js';
import { fetchNestThermostatStatus } from './services/nest.js';
import { verifyWebhookSignature } from './services/signatureVerification.js';
import { startLeaguesEvaluationCron, evaluateCompetitiveLeagues } from './services/cron.js';
import { triggerTreePlanting } from './services/eden.js';
import { generateShopifyDiscountCode } from './services/shopify.js';


const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize Database before starting
initDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
});

// Helper: Calculate user level from leaves
function calculateLevel(leaves: number): number {
  if (leaves < 100) return 1;
  if (leaves < 250) return 2;
  if (leaves < 500) return 3;
  if (leaves < 1000) return 4;
  return 5 + Math.floor((leaves - 1000) / 1000);
}

// 1. POST /api/users - Onboarding Archetype Selection (Open endpoint)
app.post('/api/users', async (req, res) => {
  try {
    const { display_name, postal_code, archetype } = req.body;
    if (!display_name) {
      res.status(400).json({ error: 'Display name is required' });
      return;
    }

    const userId = crypto.randomUUID();
    const baseline = computeArchetypeBaseline(archetype || {
      housing: 'townhouse',
      diet: 'balanced',
      commute: 'hybrid'
    });

    // Save user
    await prisma.user.create({
      data: {
        id: userId,
        displayName: display_name,
        currentLevel: 1,
        totalLeaves: 0,
        postalCode: postal_code || ''
      }
    });

    // Seed challenges
    await seedUserChallenges(userId);

    // Seed weekly Eco-Leagues leaderboard
    await seedWeeklyLeague(userId);

    // Get live grid factor for user postal code
    const gridFactor = await getGridCarbonFactor(postal_code || '');
    const customRegionKey = `custom-${postal_code || ''}`;
    GRID_FACTORS[customRegionKey] = gridFactor;

    // Seed historical baseline events for the last 6 months (to display rich charts)
    const now = new Date();
    const eventDataList = [];
    for (let i = 5; i >= 0; i--) {
      const eventDate = new Date(now.getFullYear(), now.getMonth() - i, 15);
      const timestamp = eventDate;

      // Seed housing event (monthly)
      const housingKWh = archetype?.housing === 'apartment' ? 300 : archetype?.housing === 'family' ? 1000 : 6000/12;
      const housingCO2 = computeHousingCO2(housingKWh, 'standard', customRegionKey);
      eventDataList.push({
        id: crypto.randomUUID(),
        userId,
        category: 'housing',
        sourceProvider: 'manual',
        rawValue: housingKWh,
        rawUnit: 'kWh',
        computedCo2eKg: housingCO2,
        regionCode: customRegionKey,
        timestamp
      });

      // Seed transport event (monthly)
      const transportMiles = archetype?.commute === 'transit' ? 100 : archetype?.commute === 'gas' ? 1200 : 600;
      const transportMode = archetype?.commute === 'transit' ? 'transit' : archetype?.commute === 'gas' ? 'suv' : 'hybrid';
      const transportCO2 = computeTransportCO2(transportMiles, transportMode as any);
      eventDataList.push({
        id: crypto.randomUUID(),
        userId,
        category: 'transport',
        sourceProvider: 'manual',
        rawValue: transportMiles,
        rawUnit: 'miles',
        computedCo2eKg: transportCO2,
        timestamp
      });

      // Seed food event (monthly)
      const foodMeals = 90; // ~3 meals a day
      const foodDiet = archetype?.diet || 'balanced';
      const foodCO2 = computeFoodCO2(foodMeals, foodDiet);
      eventDataList.push({
        id: crypto.randomUUID(),
        userId,
        category: 'food',
        sourceProvider: 'manual',
        rawValue: foodMeals,
        rawUnit: 'meals',
        computedCo2eKg: foodCO2,
        timestamp
      });
    }

    await prisma.carbonEvent.createMany({
      data: eventDataList
    });

    const createdUser = await prisma.user.findUnique({ where: { id: userId } });
    if (createdUser) {
      // Sign JWT token
      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({
        user: {
          id: createdUser.id,
          display_name: createdUser.displayName,
          current_level: createdUser.currentLevel,
          total_leaves: createdUser.totalLeaves,
          postal_code: createdUser.postalCode,
          created_at: createdUser.createdAt.toISOString()
        },
        token,
        baseline
      });
    } else {
      res.status(500).json({ error: 'Failed to retrieve created user' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. GET /api/users/:id - Fetch user details (Secured)
app.get('/api/users/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.userId !== req.params.id) {
      res.status(403).json({ error: 'Access denied: User mismatch' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({
      id: user.id,
      display_name: user.displayName,
      current_level: user.currentLevel,
      total_leaves: user.totalLeaves,
      postal_code: user.postalCode,
      created_at: user.createdAt.toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. GET /api/carbon-events/:userId - Retrieve carbon footprint logs (Secured)
app.get('/api/carbon-events/:userId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.userId !== req.params.userId) {
      res.status(403).json({ error: 'Access denied: User mismatch' });
      return;
    }

    const events = await prisma.carbonEvent.findMany({
      where: { userId: req.params.userId },
      orderBy: { timestamp: 'desc' }
    });
    res.json(events.map(e => ({
      id: e.id,
      user_id: e.userId,
      category: e.category,
      source_provider: e.sourceProvider,
      raw_value: e.rawValue,
      raw_unit: e.rawUnit,
      computed_co2e_kg: e.computedCo2eKg,
      region_code: e.regionCode,
      timestamp: e.timestamp.toISOString()
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. POST /api/carbon-events - Log carbon tracking event (Secured)
app.post('/api/carbon-events', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { 
      category, 
      source_provider, 
      raw_value, 
      raw_unit, 
      region_code, 
      transportMode, 
      dietType,
      housingOption
    } = req.body;

    const userId = req.userId!;

    if (!category || !raw_value || !raw_unit) {
      res.status(400).json({ error: 'Missing required carbon event fields' });
      return;
    }

    let computedCO2 = 0;
    let customRegionKey = region_code || 'default';

    if (category === 'housing') {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const postalCode = user?.postalCode || '';
      const gridFactor = await getGridCarbonFactor(postalCode);
      customRegionKey = `custom-${postalCode}`;
      GRID_FACTORS[customRegionKey] = gridFactor;
      
      computedCO2 = computeHousingCO2(raw_value, housingOption || 'standard', customRegionKey);
    } else if (category === 'transport') {
      computedCO2 = computeTransportCO2(raw_value, transportMode || 'gas_car');
    } else if (category === 'food') {
      computedCO2 = computeFoodCO2(raw_value, dietType || 'balanced');
    }

    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Publish ingestion payload to GCP Pub/Sub
    await publishCarbonEvent({
      userId,
      category,
      source_provider: source_provider || 'manual',
      raw_value,
      raw_unit,
      region_code: customRegionKey,
      transportMode,
      dietType,
      housingOption,
      eventId,
      timestamp
    } as any);

    // Award leaves for registering an event: 15 Leaves standard
    let leavesAwarded = 15;

    // Bonus leaves for green choices
    if (category === 'transport' && (transportMode === 'ev' || transportMode === 'transit')) {
      leavesAwarded += 15; // 30 leaves total
    } else if (category === 'food' && dietType === 'vegan') {
      leavesAwarded += 10; // 25 leaves total
    } else if (category === 'housing' && housingOption === 'solar') {
      leavesAwarded += 20; // 35 leaves total
    }

    // Update leaves inside the user's active competitive league standing
    await prisma.league.updateMany({
      where: { userId },
      data: {
        leaves: {
          increment: leavesAwarded
        }
      }
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const updatedUser = user 
      ? {
          id: user.id,
          display_name: user.displayName,
          total_leaves: user.totalLeaves + leavesAwarded,
          current_level: calculateLevel(user.totalLeaves + leavesAwarded),
          postal_code: user.postalCode,
          created_at: user.createdAt.toISOString()
        }
      : null;

    const projectedEvent: CarbonEvent = {
      id: eventId,
      user_id: userId,
      category,
      source_provider: source_provider || 'manual',
      raw_value,
      raw_unit,
      computed_co2e_kg: computedCO2,
      region_code: customRegionKey,
      timestamp
    };

    res.status(201).json({ event: projectedEvent, user: updatedUser, leavesAwarded });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. GET /api/challenges/:userId - Fetch active challenges (Secured)
app.get('/api/challenges/:userId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.userId !== req.params.userId) {
      res.status(403).json({ error: 'Access denied: User mismatch' });
      return;
    }

    // Ensure seeded
    await seedUserChallenges(req.params.userId);

    const rows = await prisma.challenge.findMany({ where: { userId: req.params.userId } });
    const challenges: Challenge[] = rows.map(r => ({
      id: r.id,
      userId: r.userId,
      type: r.type as any,
      title: r.title,
      description: r.description,
      rewardLeaves: r.rewardLeaves,
      targetDays: r.targetDays,
      currentStreak: r.currentStreak,
      completed: r.completed === 1,
      progressLogs: JSON.parse(r.progressLogs),
      rewardApplied: r.rewardApplied === 1,
      updatedAt: r.updatedAt.toISOString()
    }));

    res.json(challenges);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. POST /api/challenges/progress - Log daily progress for a 7-day streak challenge (Secured)
app.post('/api/challenges/progress', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { challengeType, dayIndex, completed } = req.body;
    const userId = req.userId!;

    if (!challengeType || dayIndex === undefined) {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }

    const r = await prisma.challenge.findFirst({ where: { userId, type: challengeType } });
    if (!r) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }

    const progressLogs = JSON.parse(r.progressLogs);
    progressLogs[dayIndex] = completed;

    // Calculate Streak (consecutive true days from index 0)
    let currentStreak = 0;
    for (const log of progressLogs) {
      if (log) currentStreak++;
      else break;
    }

    // Completed if all 7 days are complete
    const isCompleted = progressLogs.filter(Boolean).length === 7;
    let rewardAwarded = false;
    let leavesAwarded = 0;

    if (isCompleted && r.rewardApplied === 0) {
      rewardAwarded = true;
      leavesAwarded = r.rewardLeaves;
      
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const newLeaves = user.totalLeaves + leavesAwarded;
        const newLevel = calculateLevel(newLeaves);
        await prisma.user.update({
          where: { id: userId },
          data: { totalLeaves: newLeaves, currentLevel: newLevel }
        });
        await prisma.league.updateMany({
          where: { userId },
          data: { leaves: { increment: leavesAwarded }, level: newLevel }
        });
      }
    }

    await prisma.challenge.update({
      where: { id: r.id },
      data: {
        progressLogs: JSON.stringify(progressLogs),
        currentStreak,
        completed: isCompleted ? 1 : 0,
        rewardApplied: (isCompleted || r.rewardApplied === 1) ? 1 : 0
      }
    });

    const updatedRow = await prisma.challenge.findUnique({ where: { id: r.id } });
    if (!updatedRow) {
      res.status(500).json({ error: 'Failed to retrieve updated challenge' });
      return;
    }

    const updatedChallenge: Challenge = {
      id: updatedRow.id,
      userId: updatedRow.userId,
      type: updatedRow.type as any,
      title: updatedRow.title,
      description: updatedRow.description,
      rewardLeaves: updatedRow.rewardLeaves,
      targetDays: updatedRow.targetDays,
      currentStreak: updatedRow.currentStreak,
      completed: updatedRow.completed === 1,
      progressLogs: JSON.parse(updatedRow.progressLogs),
      rewardApplied: updatedRow.rewardApplied === 1,
      updatedAt: updatedRow.updatedAt.toISOString()
    };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const updatedUser = user ? {
      id: user.id,
      display_name: user.displayName,
      total_leaves: user.totalLeaves,
      current_level: user.currentLevel,
      postal_code: user.postalCode,
      created_at: user.createdAt.toISOString()
    } : null;

    res.json({
      challenge: updatedChallenge,
      user: updatedUser,
      rewardAwarded,
      leavesAwarded
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. POST /api/sponsors/redeem - Spend leaves to redeem real B-Corp reward (Secured)
app.post('/api/sponsors/redeem', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { sponsorName, rewardType, costLeaves } = req.body;
    const userId = req.userId!;

    if (!sponsorName || !rewardType || !costLeaves) {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.totalLeaves < costLeaves) {
      res.status(400).json({ error: 'Insufficient Leaves points' });
      return;
    }

    // Deduct leaves
    const newLeaves = user.totalLeaves - costLeaves;
    const newLevel = calculateLevel(newLeaves);
    await prisma.user.update({
      where: { id: userId },
      data: { totalLeaves: newLeaves, currentLevel: newLevel }
    });

    // Create Voucher
    const voucherId = crypto.randomUUID();
    let couponCode: string | undefined = undefined;
    let title = '';
    let description = '';

    if (rewardType === 'tree') {
      title = 'Eden Projects tree planting';
      const plantingResult = await triggerTreePlanting(userId, 1);
      description = `1 physical tree has been funded in your name through ${sponsorName}. Tracking receipt: ${plantingResult.trackingUrl}`;
    } else if (rewardType === 'discount') {
      title = '15% Off Oatly Products';
      const discountResult = await generateShopifyDiscountCode(userId, sponsorName, costLeaves);
      couponCode = discountResult.couponCode;
      description = `Get 15% discount checkout coupon code funded by Oatly.`;
    } else if (rewardType === 'plug') {
      title = 'Smart Utility energy plug';
      couponCode = `ARCADIA-PLUG-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      description = `A complimentary Smart Energy plug delivered to your doorstep.`;
    }

    await prisma.voucher.create({
      data: {
        id: voucherId,
        userId,
        sponsorName,
        title,
        description,
        rewardType,
        couponCode: couponCode || null,
        costLeaves
      }
    });

    const createdVoucher = await prisma.voucher.findUnique({ where: { id: voucherId } });
    const userUpdated = await prisma.user.findUnique({ where: { id: userId } });

    res.status(201).json({
      voucher: createdVoucher ? {
        id: createdVoucher.id,
        userId: createdVoucher.userId,
        sponsorName: createdVoucher.sponsorName,
        title: createdVoucher.title,
        description: createdVoucher.description,
        rewardType: createdVoucher.rewardType,
        couponCode: createdVoucher.couponCode,
        costLeaves: createdVoucher.costLeaves,
        redeemedAt: createdVoucher.redeemedAt.toISOString()
      } : null,
      user: userUpdated ? {
        id: userUpdated.id,
        display_name: userUpdated.displayName,
        total_leaves: userUpdated.totalLeaves,
        current_level: userUpdated.currentLevel,
        postal_code: userUpdated.postalCode,
        created_at: userUpdated.createdAt.toISOString()
      } : null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. GET /api/vouchers/:userId - Fetch all vouchers for a user (Secured)
app.get('/api/vouchers/:userId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.userId !== req.params.userId) {
      res.status(403).json({ error: 'Access denied: User mismatch' });
      return;
    }

    const vouchers = await prisma.voucher.findMany({
      where: { userId: req.params.userId },
      orderBy: { redeemedAt: 'desc' }
    });
    res.json(vouchers.map(v => ({
      id: v.id,
      userId: v.userId,
      sponsorName: v.sponsorName,
      title: v.title,
      description: v.description,
      rewardType: v.rewardType,
      couponCode: v.couponCode,
      costLeaves: v.costLeaves,
      redeemedAt: v.redeemedAt.toISOString()
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9. GET /api/leagues/:userId - Fetch Eco-Leagues Leaderboard (Secured)
app.get('/api/leagues/:userId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (req.userId !== req.params.userId) {
      res.status(403).json({ error: 'Access denied: User mismatch' });
      return;
    }

    const { userId } = req.params;
    await seedWeeklyLeague(userId);
    
    // Find user's leagueId group
    const userLeagueEntry = await prisma.league.findFirst({
      where: { userId }
    });
    
    if (!userLeagueEntry) {
      res.status(500).json({ error: 'Failed to retrieve user league entry' });
      return;
    }

    const leaderboard = await prisma.league.findMany({
      where: { leagueId: userLeagueEntry.leagueId }
    });
    
    // Format response
    const sorted = leaderboard.map(l => ({
      id: l.id,
      userId: l.userId,
      username: l.username,
      leaves: l.leaves,
      level: l.level,
      isMock: l.isMock === 1
    }));
    sorted.sort((a, b) => b.leaves - a.leaves);
    
    res.json(sorted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 10. POST /api/webhooks/radar - Ingest trip summaries from Radar.io SDK (Open/Mock with security)
app.post('/api/webhooks/radar', async (req, res) => {
  try {
    const signature = req.headers['x-radar-signature'] as string;
    const isValid = await verifyWebhookSignature(JSON.stringify(req.body), signature, 'RADAR_WEBHOOK_SECRET');
    if (!isValid) {
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }

    let userId = req.body.userId;
    let distanceMiles = req.body.distanceMiles;
    let transportMode = req.body.mode;

    // Parse raw Radar.io webhook format if available
    if (req.body.event && req.body.event.user) {
      userId = req.body.event.user.id;
      const meters = req.body.event.trip?.distanceMeters || 0;
      distanceMiles = parseFloat((meters / 1609.34).toFixed(2));
      
      const rawMode = req.body.event.trip?.transportMode;
      if (rawMode === 'car') transportMode = 'gas_car';
      else if (rawMode === 'foot' || rawMode === 'bike') transportMode = 'transit';
      else if (rawMode === 'train') transportMode = 'transit';
      else transportMode = 'gas_car';
    }

    if (!userId || !distanceMiles) {
      res.status(400).json({ error: 'Missing webhook properties' });
      return;
    }

    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await publishCarbonEvent({
      userId,
      category: 'transport',
      source_provider: 'radar_sdk',
      raw_value: distanceMiles,
      raw_unit: 'miles',
      transportMode: transportMode || 'gas_car',
      eventId,
      timestamp
    } as any);

    res.json({ status: 'queued', eventId, distanceMiles, mode: transportMode });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 11. POST /api/webhooks/arcadia - Ingest monthly energy billing files (Open/Mock with security)
app.post('/api/webhooks/arcadia', async (req, res) => {
  try {
    const signature = req.headers['x-arcadia-signature'] as string;
    const isValid = await verifyWebhookSignature(JSON.stringify(req.body), signature, 'ARCADIA_WEBHOOK_SECRET');
    if (!isValid) {
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }

    const { userId, kwh } = req.body;
    if (!userId || !kwh) {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }

    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await publishCarbonEvent({
      userId,
      category: 'housing',
      source_provider: 'arcadia',
      raw_value: kwh,
      raw_unit: 'kWh',
      housingOption: 'standard',
      eventId,
      timestamp
    } as any);

    res.json({ status: 'queued', eventId, kwh });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 12. POST /api/webhooks/nest - Smart Home thermostat check (Live Nest API SDM Check)
app.post('/api/webhooks/nest', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'Missing userId parameter' });
      return;
    }

    // Query Nest live status
    const status = await fetchNestThermostatStatus(userId);
    const ecoModeActive = status.ecoMode === 'MANUAL_ECO';

    const leavesAwarded = ecoModeActive ? 25 : 5;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    let updatedUser = null;
    
    if (user) {
      const newLeaves = user.totalLeaves + leavesAwarded;
      const newLevel = calculateLevel(newLeaves);
      await prisma.user.update({
        where: { id: userId },
        data: { totalLeaves: newLeaves, currentLevel: newLevel }
      });
      await prisma.league.updateMany({
        where: { userId },
        data: { leaves: { increment: leavesAwarded }, level: newLevel }
      });
      
      const userUpdated = await prisma.user.findUnique({ where: { id: userId } });
      if (userUpdated) {
        updatedUser = {
          id: userUpdated.id,
          display_name: userUpdated.displayName,
          total_leaves: userUpdated.totalLeaves,
          current_level: userUpdated.currentLevel,
          postal_code: userUpdated.postalCode,
          created_at: userUpdated.createdAt.toISOString()
        };
      }
    }

    res.json({
      status: 'success',
      hvacMode: status.hvacStatus,
      ecoModeActive,
      leavesAwarded,
      ambientTemperature: status.ambientTempCelsius,
      user: updatedUser
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 13. POST /api/integrations/arcadia/callback - Handle Connect Widget OAuth callback
app.post('/api/integrations/arcadia/callback', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { authCode } = req.body;
    const userId = req.userId!;
    if (!authCode) {
      res.status(400).json({ error: 'Auth code is required' });
      return;
    }

    console.log(`Arcadia callback: Exchanging authCode ${authCode} for utility token for user ${userId}...`);
    // In production, we call Arcadia's token exchange endpoint:
    // POST https://api.arcadia.com/v2/tokens
    const mockUtilityToken = `arcadia_token_${crypto.randomBytes(8).toString('hex')}`;
    
    res.status(200).json({ status: 'connected', utilityToken: mockUtilityToken });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 14. POST /api/admin/leagues/evaluate - Admin trigger to manually evaluate and reset leagues (Testing only)
app.post('/api/admin/leagues/evaluate', async (req, res) => {
  try {
    await evaluateCompetitiveLeagues();
    res.json({ status: 'success', message: 'Leagues evaluation completed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Footprint API server listening on http://localhost:${PORT}`);
  startLeaguesEvaluationCron();
});

// Start Pub/Sub background listener
startPubSubSubscriber(async (payload: any) => {
  console.log('Pub/Sub subscriber processing payload:', payload);
  const { 
    userId, 
    category, 
    source_provider, 
    raw_value, 
    raw_unit, 
    region_code, 
    transportMode, 
    dietType,
    housingOption,
    eventId,
    timestamp
  } = payload;

  let computedCO2 = 0;
  let customRegionKey = region_code || 'default';

  if (category === 'housing') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const postalCode = user?.postalCode || '';
    const gridFactor = await getGridCarbonFactor(postalCode);
    customRegionKey = `custom-${postalCode}`;
    GRID_FACTORS[customRegionKey] = gridFactor;

    computedCO2 = computeHousingCO2(raw_value, housingOption || 'standard', customRegionKey);
  } else if (category === 'transport') {
    computedCO2 = computeTransportCO2(raw_value, transportMode || 'gas_car');
  } else if (category === 'food') {
    computedCO2 = computeFoodCO2(raw_value, dietType || 'balanced');
  }

  // Insert carbon event into database
  await prisma.carbonEvent.create({
    data: {
      id: eventId,
      userId,
      category,
      sourceProvider: source_provider || 'manual',
      rawValue: raw_value,
      rawUnit: raw_unit,
      computedCo2eKg: computedCO2,
      regionCode: customRegionKey,
      timestamp: new Date(timestamp)
    }
  });

  // Award leaves
  let leavesAwarded = 15;
  if (category === 'transport' && (transportMode === 'ev' || transportMode === 'transit')) {
    leavesAwarded += 15;
  } else if (category === 'food' && dietType === 'vegan') {
    leavesAwarded += 10;
  } else if (category === 'housing' && housingOption === 'solar') {
    leavesAwarded += 20;
  }

  // Increment leaves in league standings
  await prisma.league.updateMany({
    where: { userId },
    data: {
      leaves: {
        increment: leavesAwarded
      }
    }
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    const newLeaves = user.totalLeaves + leavesAwarded;
    const newLevel = calculateLevel(newLeaves);
    await prisma.user.update({
      where: { id: userId },
      data: { totalLeaves: newLeaves, currentLevel: newLevel }
    });
  }
  
  console.log(`Subscriber processed event successfully: ${eventId}`);
}).catch(err => {
  console.error('Failed to start Pub/Sub subscriber:', err);
});
