import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { 
  initDatabase, 
  query, 
  queryOne, 
  run, 
  seedUserChallenges 
} from './database.js';
import { 
  computeHousingCO2, 
  computeTransportCO2, 
  computeFoodCO2, 
  computeArchetypeBaseline 
} from '@footprint/carbon-math';
import { 
  User, 
  CarbonEvent, 
  Challenge, 
  Voucher 
} from '@footprint/shared-types';

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
  // Level 1: 0 - 99 leaves
  // Level 2: 100 - 249 leaves
  // Level 3: 250 - 499 leaves
  // Level 4: 500 - 999 leaves
  // Level 5+: 1000+ leaves
  if (leaves < 100) return 1;
  if (leaves < 250) return 2;
  if (leaves < 500) return 3;
  if (leaves < 1000) return 4;
  return 5 + Math.floor((leaves - 1000) / 1000);
}

// 1. POST /api/users - Onboarding Archetype Selection
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
    await run(`
      INSERT INTO users (id, display_name, current_level, total_leaves, postal_code)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, display_name, 1, 0, postal_code || '']);

    // Seed challenges
    await seedUserChallenges(userId);

    // Seed historical baseline events for the last 6 months (to display rich charts)
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const eventDate = new Date(now.getFullYear(), now.getMonth() - i, 15);
      const timestamp = eventDate.toISOString();

      // Seed housing event (monthly)
      const housingKWh = archetype?.housing === 'apartment' ? 300 : archetype?.housing === 'family' ? 1000 : 6000/12;
      const housingCO2 = computeHousingCO2(housingKWh, 'standard');
      await run(`
        INSERT INTO carbon_events (id, user_id, category, source_provider, raw_value, raw_unit, computed_co2e_kg, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [crypto.randomUUID(), userId, 'housing', 'manual', housingKWh, 'kWh', housingCO2, timestamp]);

      // Seed transport event (monthly)
      const transportMiles = archetype?.commute === 'transit' ? 100 : archetype?.commute === 'gas' ? 1200 : 600;
      const transportMode = archetype?.commute === 'transit' ? 'transit' : archetype?.commute === 'gas' ? 'suv' : 'hybrid';
      const transportCO2 = computeTransportCO2(transportMiles, transportMode as any);
      await run(`
        INSERT INTO carbon_events (id, user_id, category, source_provider, raw_value, raw_unit, computed_co2e_kg, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [crypto.randomUUID(), userId, 'transport', 'manual', transportMiles, 'miles', transportCO2, timestamp]);

      // Seed food event (monthly)
      const foodMeals = 90; // ~3 meals a day
      const foodDiet = archetype?.diet || 'balanced';
      const foodCO2 = computeFoodCO2(foodMeals, foodDiet);
      await run(`
        INSERT INTO carbon_events (id, user_id, category, source_provider, raw_value, raw_unit, computed_co2e_kg, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [crypto.randomUUID(), userId, 'food', 'manual', foodMeals, 'meals', foodCO2, timestamp]);
    }

    const createdUser = await queryOne<User>('SELECT * FROM users WHERE id = ?', [userId]);
    res.status(201).json({ user: createdUser, baseline });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. GET /api/users/:id - Fetch user details
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await queryOne<User>('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. GET /api/carbon-events/:userId - Retrieve carbon footprint logs
app.get('/api/carbon-events/:userId', async (req, res) => {
  try {
    const events = await query<CarbonEvent>(
      'SELECT * FROM carbon_events WHERE user_id = ? ORDER BY timestamp DESC',
      [req.params.userId]
    );
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. POST /api/carbon-events - Log carbon tracking event (Manual or integrations)
app.post('/api/carbon-events', async (req, res) => {
  try {
    const { 
      userId, 
      category, 
      source_provider, 
      raw_value, 
      raw_unit, 
      region_code, 
      transportMode, 
      dietType,
      housingOption
    } = req.body;

    if (!userId || !category || !raw_value || !raw_unit) {
      res.status(400).json({ error: 'Missing required carbon event fields' });
      return;
    }

    let computedCO2 = 0;
    if (category === 'housing') {
      computedCO2 = computeHousingCO2(raw_value, housingOption || 'standard', region_code || 'default');
    } else if (category === 'transport') {
      computedCO2 = computeTransportCO2(raw_value, transportMode || 'gas_car');
    } else if (category === 'food') {
      computedCO2 = computeFoodCO2(raw_value, dietType || 'balanced');
    }

    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await run(`
      INSERT INTO carbon_events (id, user_id, category, source_provider, raw_value, raw_unit, computed_co2e_kg, region_code, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [eventId, userId, category, source_provider || 'manual', raw_value, raw_unit, computedCO2, region_code || 'default', timestamp]);

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

    // Update user leaves
    const user = await queryOne<User>('SELECT * FROM users WHERE id = ?', [userId]);
    if (user) {
      const newLeaves = user.total_leaves + leavesAwarded;
      const newLevel = calculateLevel(newLeaves);
      await run('UPDATE users SET total_leaves = ?, current_level = ? WHERE id = ?', [newLeaves, newLevel, userId]);
    }

    const createdEvent = await queryOne<CarbonEvent>('SELECT * FROM carbon_events WHERE id = ?', [eventId]);
    const updatedUser = await queryOne<User>('SELECT * FROM users WHERE id = ?', [userId]);

    res.status(201).json({ event: createdEvent, user: updatedUser, leavesAwarded });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. GET /api/challenges/:userId - Fetch active challenges
app.get('/api/challenges/:userId', async (req, res) => {
  try {
    // Ensure seeded
    await seedUserChallenges(req.params.userId);

    const rows = await query<any>('SELECT * FROM challenges WHERE user_id = ?', [req.params.userId]);
    const challenges: Challenge[] = rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      type: r.type,
      title: r.title,
      description: r.description,
      rewardLeaves: r.reward_leaves,
      targetDays: r.target_days,
      currentStreak: r.current_streak,
      completed: r.completed === 1,
      progressLogs: JSON.parse(r.progress_logs),
      rewardApplied: r.reward_applied === 1,
      updatedAt: r.updated_at
    }));

    res.json(challenges);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. POST /api/challenges/progress - Log daily progress for a 7-day streak challenge
app.post('/api/challenges/progress', async (req, res) => {
  try {
    const { userId, challengeType, dayIndex, completed } = req.body;
    if (!userId || !challengeType || dayIndex === undefined) {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }

    const r = await queryOne<any>('SELECT * FROM challenges WHERE user_id = ? AND type = ?', [userId, challengeType]);
    if (!r) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }

    const progressLogs = JSON.parse(r.progress_logs);
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

    if (isCompleted && r.reward_applied === 0) {
      rewardAwarded = true;
      leavesAwarded = r.reward_leaves;
      
      const user = await queryOne<User>('SELECT * FROM users WHERE id = ?', [userId]);
      if (user) {
        const newLeaves = user.total_leaves + leavesAwarded;
        const newLevel = calculateLevel(newLeaves);
        await run('UPDATE users SET total_leaves = ?, current_level = ? WHERE id = ?', [newLeaves, newLevel, userId]);
      }
    }

    await run(`
      UPDATE challenges
      SET progress_logs = ?, current_streak = ?, completed = ?, reward_applied = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND type = ?
    `, [
      JSON.stringify(progressLogs),
      currentStreak,
      isCompleted ? 1 : 0,
      (isCompleted || r.reward_applied === 1) ? 1 : 0,
      userId,
      challengeType
    ]);

    const updatedRow = await queryOne<any>('SELECT * FROM challenges WHERE user_id = ? AND type = ?', [userId, challengeType]);
    const updatedChallenge: Challenge = {
      id: updatedRow.id,
      userId: updatedRow.user_id,
      type: updatedRow.type,
      title: updatedRow.title,
      description: updatedRow.description,
      rewardLeaves: updatedRow.reward_leaves,
      targetDays: updatedRow.target_days,
      currentStreak: updatedRow.current_streak,
      completed: updatedRow.completed === 1,
      progressLogs: JSON.parse(updatedRow.progress_logs),
      rewardApplied: updatedRow.reward_applied === 1,
      updatedAt: updatedRow.updated_at
    };

    const updatedUser = await queryOne<User>('SELECT * FROM users WHERE id = ?', [userId]);

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

// 7. POST /api/sponsors/redeem - Spend leaves to redeem real B-Corp reward
app.post('/api/sponsors/redeem', async (req, res) => {
  try {
    const { userId, sponsorName, rewardType, costLeaves } = req.body;
    if (!userId || !sponsorName || !rewardType || !costLeaves) {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }

    const user = await queryOne<User>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.total_leaves < costLeaves) {
      res.status(400).json({ error: 'Insufficient Leaves points' });
      return;
    }

    // Deduct leaves
    const newLeaves = user.total_leaves - costLeaves;
    const newLevel = calculateLevel(newLeaves);
    await run('UPDATE users SET total_leaves = ?, current_level = ? WHERE id = ?', [newLeaves, newLevel, userId]);

    // Create Voucher
    const voucherId = crypto.randomUUID();
    const couponCode = rewardType === 'discount' 
      ? `OATLY-15-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
      : rewardType === 'plug' 
      ? `ARCADIA-PLUG-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
      : undefined;

    let title = '';
    let description = '';

    if (rewardType === 'tree') {
      title = 'Eden Projects tree planting';
      description = `1 physical tree has been funded in your name through ${sponsorName}.`;
    } else if (rewardType === 'discount') {
      title = '15% Off Oatly Products';
      description = `Get 15% discount checkout coupon code funded by Oatly.`;
    } else if (rewardType === 'plug') {
      title = 'Smart Utility energy plug';
      description = `A complimentary Smart Energy plug delivered to your doorstep.`;
    }

    await run(`
      INSERT INTO vouchers (id, user_id, sponsor_name, title, description, reward_type, coupon_code, cost_leaves)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [voucherId, userId, sponsorName, title, description, rewardType, couponCode || null, costLeaves]);

    const createdVoucher = await queryOne<Voucher>('SELECT * FROM vouchers WHERE id = ?', [voucherId]);
    const updatedUser = await queryOne<User>('SELECT * FROM users WHERE id = ?', [userId]);

    res.status(201).json({ voucher: createdVoucher, user: updatedUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. GET /api/vouchers/:userId - Fetch all vouchers for a user
app.get('/api/vouchers/:userId', async (req, res) => {
  try {
    const vouchers = await query<Voucher>('SELECT * FROM vouchers WHERE user_id = ? ORDER BY redeemed_at DESC', [req.params.userId]);
    res.json(vouchers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Footprint API server listening on http://localhost:${PORT}`);
});
