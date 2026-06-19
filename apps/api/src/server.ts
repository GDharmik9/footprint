import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { 
  initDatabase, 
  prisma,
} from './database.js';
import { 
  startPubSubSubscriber 
} from './gcp.js';
import { 
  computeHousingCO2, 
  computeTransportCO2, 
  computeFoodCO2, 
  GRID_FACTORS
} from '@footprint/carbon-math';
import { 
  authenticateToken, 
} from './auth.js';
import { getGridCarbonFactor } from './services/electricityMaps.js';
import { startLeaguesEvaluationCron } from './services/cron.js';
import { calculateLevel } from './utils.js';

import { registerUser, getUserDetails, updateUserProfile, getUserInsights, logoutUser } from './controllers/userController.js';
import { getEvents, deleteEvent, createEvent } from './controllers/eventController.js';
import { getChallenges, updateChallengeProgress } from './controllers/challengeController.js';
import { redeemVoucher, getVouchers, getLeaguesLeaderboard } from './controllers/sponsorController.js';
import { handleRadarWebhook, handleArcadiaWebhook, handleNestWebhook, handleArcadiaCallback, evaluateLeaguesAdmin } from './controllers/webhookController.js';
import { 
  validate, 
  RegisterUserSchema, 
  UpdateUserSchema, 
  CreateEventSchema, 
  ChallengeProgressSchema, 
  RedeemVoucherSchema, 
  ArcadiaCallbackSchema 
} from './validation.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

// Global Rate Limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200, // Limit each IP to 200 requests per `window`
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Strict Rate Limiter for auth, onboarding, and profile edits
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 30, // Limit each IP to 30 requests per `window`
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests to this endpoint, please try again later.' }
});

// Apply global rate limiter to all routes
app.use(globalLimiter);

// Initialize Database before starting
initDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
});

// User routes
app.post('/api/users', authLimiter, validate(RegisterUserSchema), registerUser);
app.get('/api/users/:id', authenticateToken, getUserDetails);
app.patch('/api/users/:id', authenticateToken, authLimiter, validate(UpdateUserSchema), updateUserProfile);
app.get('/api/users/:id/insights', authenticateToken, getUserInsights);
app.post('/api/auth/logout', authLimiter, logoutUser);

// Carbon event routes
app.get('/api/carbon-events/:userId', authenticateToken, getEvents);
app.delete('/api/carbon-events/:id', authenticateToken, deleteEvent);
app.post('/api/carbon-events', authenticateToken, validate(CreateEventSchema), createEvent);

// Challenge routes
app.get('/api/challenges/:userId', authenticateToken, getChallenges);
app.post('/api/challenges/progress', authenticateToken, validate(ChallengeProgressSchema), updateChallengeProgress);

// Sponsor/Reward/League routes
app.post('/api/sponsors/redeem', authenticateToken, validate(RedeemVoucherSchema), redeemVoucher);
app.get('/api/vouchers/:userId', authenticateToken, getVouchers);
app.get('/api/leagues/:userId', authenticateToken, getLeaguesLeaderboard);

// Telemetry Webhook routes
app.post('/api/webhooks/radar', handleRadarWebhook);
app.post('/api/webhooks/arcadia', handleArcadiaWebhook);
app.post('/api/webhooks/nest', handleNestWebhook);
app.post('/api/integrations/arcadia/callback', authenticateToken, validate(ArcadiaCallbackSchema), handleArcadiaCallback);

// Admin routes
app.post('/api/admin/leagues/evaluate', evaluateLeaguesAdmin);

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
