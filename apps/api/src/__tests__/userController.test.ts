import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerUser, getUserDetails, logoutUser } from '../controllers/userController.js';
import { prisma } from '../database.js';
import jwt from 'jsonwebtoken';

vi.mock('../database.js', () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    carbonEvent: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    league: {
      updateMany: vi.fn(),
    }
  },
  seedUserChallenges: vi.fn(),
  seedWeeklyLeague: vi.fn()
}));

vi.mock('../services/electricityMaps.js', () => ({
  getGridCarbonFactor: vi.fn().mockResolvedValue(0.5)
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mocked-token')
  }
}));

describe('userController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerUser', () => {
    it('returns 400 if display_name is missing', async () => {
      const req = { body: {} } as any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any;

      await registerUser(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Display name is required' });
    });

    it('creates a user and returns 201', async () => {
      const req = { body: { display_name: 'TestUser', postal_code: '12345' } } as any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        cookie: vi.fn()
      } as any;

      // Mock findUnique to return the created user
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-id',
        displayName: 'TestUser',
        currentLevel: 1,
        totalLeaves: 0,
        postalCode: '12345',
        createdAt: new Date()
      });

      await registerUser(req, res);

      expect(prisma.user.create).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledWith('footprint_auth_token', 'mocked-token', expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        token: 'mocked-token',
        user: expect.any(Object)
      }));
    });
  });

  describe('getUserDetails', () => {
    it('returns 403 if userId does not match params id', async () => {
      const req = { userId: '123', params: { id: '456' } } as any;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      } as any;

      await getUserDetails(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns user details if user exists', async () => {
      const req = { userId: '123', params: { id: '123' } } as any;
      const res = {
        json: vi.fn()
      } as any;

      (prisma.user.findUnique as any).mockResolvedValue({
        id: '123',
        displayName: 'Test',
        currentLevel: 1,
        totalLeaves: 10,
        postalCode: '00000',
        createdAt: new Date()
      });

      await getUserDetails(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        id: '123',
        display_name: 'Test'
      }));
    });
  });

  describe('logoutUser', () => {
    it('clears cookie and returns success', async () => {
      const req = {} as any;
      const res = {
        clearCookie: vi.fn(),
        json: vi.fn()
      } as any;

      await logoutUser(req, res);
      expect(res.clearCookie).toHaveBeenCalledWith('footprint_auth_token', expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({ status: 'success', message: 'Logged out successfully' });
    });
  });
});
