import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Response } from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { authenticateToken, JWT_SECRET, AuthenticatedRequest } from '../auth.js';

// Use the actual JWT_SECRET constant from auth.ts (module-level const, not env var)
const TEST_SECRET = JWT_SECRET;

function buildTestApp() {
  const app = express();
  app.use(cookieParser());  // Required for cookie-based auth
  app.use(express.json());
  // Protected route for testing
  app.get('/protected', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    res.json({ userId: req.userId });
  });
  return app;
}

describe('authenticateToken middleware', () => {
  let app: ReturnType<typeof buildTestApp>;

  beforeEach(() => {
    app = buildTestApp();
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 403 when token is invalid/malformed', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 403 when token is expired', async () => {
    const expiredToken = jwt.sign({ userId: 'user-123' }, TEST_SECRET, { expiresIn: -1 });
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(403);
  });

  it('passes with a valid Authorization header Bearer token', async () => {
    const token = jwt.sign({ userId: 'user-abc' }, TEST_SECRET, { expiresIn: '1h' });
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('user-abc');
  });

  it('passes with a valid cookie token (cookie takes priority)', async () => {
    const token = jwt.sign({ userId: 'user-cookie' }, TEST_SECRET, { expiresIn: '1h' });
    const res = await request(app)
      .get('/protected')
      .set('Cookie', `footprint_auth_token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('user-cookie');
  });
});
