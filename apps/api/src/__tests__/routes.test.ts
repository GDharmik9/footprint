import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../database.js', () => ({
  prisma: {
    user: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    carbonEvent: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), delete: vi.fn(), createMany: vi.fn() },
    challenge: { findMany: vi.fn(), upsert: vi.fn() },
    league: { findMany: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
    voucher: { findMany: vi.fn(), create: vi.fn() }
  },
  initDatabase: vi.fn().mockResolvedValue(undefined),
  seedUserChallenges: vi.fn().mockResolvedValue(undefined),
  seedWeeklyLeague: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../gcp.js', () => ({
  startPubSubSubscriber: vi.fn().mockResolvedValue(undefined),
  publishCarbonEvent: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('../services/electricityMaps.js', () => ({
  getGridCarbonFactor: vi.fn().mockResolvedValue(0.38)
}));

vi.mock('../services/cron.js', () => ({
  startLeaguesEvaluationCron: vi.fn()
}));

import { app } from '../server.js';
import { prisma } from '../database.js';
import { JWT_SECRET } from '../auth.js';

function makeToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

describe('POST /api/users — User Registration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when display_name is missing', async () => {
    const res = await request(app).post('/api/users').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 400 when display_name is empty string', async () => {
    const res = await request(app).post('/api/users').send({ display_name: '' });
    expect(res.status).toBe(400);
  });

  it('creates user and returns 201 with valid payload', async () => {
    const mockUser = { id: 'user-1', displayName: 'Alice', totalLeaves: 0, currentLevel: 1, postalCode: null, createdAt: new Date() };
    (prisma.user.create as any).mockResolvedValue(mockUser);
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    const res = await request(app).post('/api/users').send({ display_name: 'Alice' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('user');
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.display_name).toBe('Alice');
  });
});

describe('GET /api/users/:id — Get User Profile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when no auth token provided', async () => {
    const res = await request(app).get('/api/users/user-1');
    expect(res.status).toBe(401);
  });

  it('returns 403 when token belongs to different user', async () => {
    const token = makeToken('user-other');
    const res = await request(app).get('/api/users/user-1').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('returns 404 when user does not exist', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    const token = makeToken('user-1');
    const res = await request(app).get('/api/users/user-1').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/carbon-events — Create Carbon Event', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/carbon-events')
      .send({ category: 'transport', raw_value: 10, raw_unit: 'miles', transportMode: 'gas_car' });
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid schema (negative raw_value)', async () => {
    const token = makeToken('user-1');
    const res = await request(app).post('/api/carbon-events')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'transport', raw_value: -5, raw_unit: 'miles', transportMode: 'gas_car' });
    expect(res.status).toBe(400);
  });

  it('returns 400 on invalid category', async () => {
    const token = makeToken('user-1');
    const res = await request(app).post('/api/carbon-events')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'invalid_category', raw_value: 10, raw_unit: 'miles' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/logout — Logout', () => {
  it('returns 200 and clears the auth cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/logged out/i);
  });
});

describe('POST /api/challenges/progress — Update Challenge', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/challenges/progress')
      .send({ challengeType: 'cold-wash', dayIndex: 0, completed: true });
    expect(res.status).toBe(401);
  });

  it('returns 400 with invalid dayIndex (out of range)', async () => {
    const token = makeToken('user-1');
    const res = await request(app).post('/api/challenges/progress')
      .set('Authorization', `Bearer ${token}`)
      .send({ challengeType: 'cold-wash', dayIndex: 10, completed: true });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/sponsors/redeem — Redeem Voucher', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/sponsors/redeem')
      .send({ sponsorName: 'EcoMart', rewardType: 'tree_planting', costLeaves: 100 });
    expect(res.status).toBe(401);
  });

  it('returns 400 when costLeaves is zero', async () => {
    const token = makeToken('user-1');
    const res = await request(app).post('/api/sponsors/redeem')
      .set('Authorization', `Bearer ${token}`)
      .send({ sponsorName: 'EcoMart', rewardType: 'tree', costLeaves: 0 });
    expect(res.status).toBe(400);
  });
});
