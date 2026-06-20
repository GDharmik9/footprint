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
  authenticateToken, 
} from './auth.js';
import { startLeaguesEvaluationCron } from './services/cron.js';
import { processIngestPayload } from './services/pubsubProcessor.js';

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

export const app = express();
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
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Strict Rate Limiter for auth, onboarding, and profile edits
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests to this endpoint, please try again later.' }
});

app.use(globalLimiter);

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

// Only start listening when this file is the direct entry point (not imported by tests)
const isMain = process.argv[1]?.endsWith('server.js') || process.argv[1]?.endsWith('server.ts');
if (isMain) {
  initDatabase().catch(err => {
    console.error('Failed to initialize database:', err);
  });

  app.listen(PORT, () => {
    console.log(`Footprint API server listening on http://localhost:${PORT}`);
    startLeaguesEvaluationCron();
  });

  // Start Pub/Sub background listener
  startPubSubSubscriber(processIngestPayload).catch(err => {
    console.error('Failed to start Pub/Sub subscriber:', err);
  });
}
