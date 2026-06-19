import { describe, it, expect, vi } from 'vitest';
import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { validate, RegisterUserSchema, CreateEventSchema, RedeemVoucherSchema, ChallengeProgressSchema } from '../validation.js';

// Helper: build a minimal express app with a single POST route using a schema
function buildTestApp(schema: Parameters<typeof validate>[0]) {
  const app = express();
  app.use(express.json());
  app.post('/test', validate(schema), (_req: Request, res: Response) => {
    res.json({ ok: true });
  });
  return app;
}

describe('validate() middleware', () => {
  it('passes valid body through and calls next', async () => {
    const app = buildTestApp(RegisterUserSchema);
    const res = await request(app)
      .post('/test')
      .send({ display_name: 'Alice' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('returns 400 with details array on invalid body', async () => {
    const app = buildTestApp(RegisterUserSchema);
    const res = await request(app)
      .post('/test')
      .send({ display_name: '' }); // min length 1
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(res.body.details[0]).toHaveProperty('field');
    expect(res.body.details[0]).toHaveProperty('message');
  });

  it('returns 400 when body is missing entirely', async () => {
    const app = buildTestApp(RegisterUserSchema);
    const res = await request(app)
      .post('/test')
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('RegisterUserSchema', () => {
  it('accepts minimal valid payload', () => {
    const result = RegisterUserSchema.safeParse({ display_name: 'Alice' });
    expect(result.success).toBe(true);
  });

  it('rejects empty display_name', () => {
    const result = RegisterUserSchema.safeParse({ display_name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects display_name over 50 chars', () => {
    const result = RegisterUserSchema.safeParse({ display_name: 'A'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('accepts optional archetype with valid enums', () => {
    const result = RegisterUserSchema.safeParse({
      display_name: 'Bob',
      archetype: { housing: 'apartment', diet: 'vegan', commute: 'ev' }
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid archetype enum', () => {
    const result = RegisterUserSchema.safeParse({
      display_name: 'Bob',
      archetype: { housing: 'mansion' } // not in enum
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateEventSchema', () => {
  const validBase = {
    category: 'transport',
    raw_value: 10,
    raw_unit: 'miles',
    transportMode: 'gas_car'
  };

  it('accepts valid transport event', () => {
    const result = CreateEventSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('accepts valid food event', () => {
    const result = CreateEventSchema.safeParse({
      category: 'food',
      raw_value: 3,
      raw_unit: 'meals',
      dietType: 'vegan'
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative raw_value', () => {
    const result = CreateEventSchema.safeParse({ ...validBase, raw_value: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid category', () => {
    const result = CreateEventSchema.safeParse({ ...validBase, category: 'air' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid transportMode', () => {
    const result = CreateEventSchema.safeParse({ ...validBase, transportMode: 'rocket' });
    expect(result.success).toBe(false);
  });
});

describe('RedeemVoucherSchema', () => {
  it('accepts valid voucher redemption', () => {
    const result = RedeemVoucherSchema.safeParse({
      sponsorName: 'EcoMart',
      rewardType: 'tree',
      costLeaves: 100
    });
    expect(result.success).toBe(true);
  });

  it('rejects zero costLeaves', () => {
    const result = RedeemVoucherSchema.safeParse({
      sponsorName: 'EcoMart',
      rewardType: 'tree',
      costLeaves: 0
    });
    expect(result.success).toBe(false);
  });
});

describe('ChallengeProgressSchema', () => {
  it('accepts valid progress update', () => {
    const result = ChallengeProgressSchema.safeParse({
      challengeType: 'cold-wash',
      dayIndex: 3,
      completed: true
    });
    expect(result.success).toBe(true);
  });

  it('rejects dayIndex out of range', () => {
    const result = ChallengeProgressSchema.safeParse({
      challengeType: 'cold-wash',
      dayIndex: 7, // max is 6
      completed: true
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative dayIndex', () => {
    const result = ChallengeProgressSchema.safeParse({
      challengeType: 'cold-wash',
      dayIndex: -1,
      completed: false
    });
    expect(result.success).toBe(false);
  });
});
