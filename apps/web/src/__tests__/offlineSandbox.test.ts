import { describe, it, expect } from 'vitest';
import type { User, Challenge } from '@footprint/shared-types';
import {
  simulateOfflineState,
  calculateLocalLeavesAwarded,
  simulateOfflineChallengeToggle,
  simulateOfflineRedeemVoucher
} from '../utils/offlineSandbox';

describe('offlineSandbox utility tests', () => {
  const mockUser: User = {
    id: 'test-user-id',
    display_name: 'Green Hero',
    current_level: 1,
    total_leaves: 200,
    postal_code: '90210',
    created_at: new Date().toISOString()
  };

  describe('simulateOfflineState', () => {
    it('generates a robust initial sandbox state', () => {
      const state = simulateOfflineState(
        'user-123',
        'Eco Champ',
        '90210',
        'townhouse',
        'balanced',
        'hybrid'
      );

      expect(state.user.id).toBe('user-123');
      expect(state.user.display_name).toBe('Eco Champ');
      expect(state.baseline.total).toBe(4200 + 2800 + 1800); // townhouse (4200) + hybrid (2800) + balanced (1800)
      expect(state.events.length).toBe(18); // 3 categories * 6 months
      expect(state.challenges.length).toBe(2);
      expect(state.leaderboard.length).toBe(30);
      expect(state.insights.length).toBe(3);
      expect(state.recommendations.length).toBe(3);
    });
  });

  describe('calculateLocalLeavesAwarded', () => {
    it('awards extra points for eco-conscious actions', () => {
      // EV or Transit transport -> 30 leaves
      expect(calculateLocalLeavesAwarded('transport', 'ev')).toBe(30);
      expect(calculateLocalLeavesAwarded('transport', 'transit')).toBe(30);
      // Vegan food -> 25 leaves
      expect(calculateLocalLeavesAwarded('food', 'vegan')).toBe(25);
      // Solar housing -> 35 leaves
      expect(calculateLocalLeavesAwarded('housing', 'solar')).toBe(35);
      // Standard choices -> 15 leaves
      expect(calculateLocalLeavesAwarded('transport', 'gas_car')).toBe(15);
    });
  });

  describe('simulateOfflineChallengeToggle', () => {
    const initialChallenges: Challenge[] = [
      {
        id: 'cw-123',
        userId: '123',
        type: 'cold-wash',
        title: 'Cold Wash',
        description: 'Description',
        rewardLeaves: 100,
        targetDays: 7,
        currentStreak: 0,
        completed: false,
        progressLogs: [false, false, false, false, false, false, false],
        rewardApplied: false,
        updatedAt: new Date().toISOString()
      }
    ];

    it('toggles a single day streak correctly', () => {
      const result = simulateOfflineChallengeToggle(
        initialChallenges,
        'cold-wash',
        0,
        false,
        mockUser
      );

      expect(result).not.toBeNull();
      expect(result?.updatedChallenge.progressLogs[0]).toBe(true);
      expect(result?.updatedChallenge.currentStreak).toBe(1);
      expect(result?.rewardAwarded).toBe(false);
    });

    it('awards leaves and level updates when all days are completed', () => {
      const almostDoneChallenges: Challenge[] = [
        {
          ...initialChallenges[0],
          progressLogs: [true, true, true, true, true, true, false]
        }
      ];

      const result = simulateOfflineChallengeToggle(
        almostDoneChallenges,
        'cold-wash',
        6,
        false,
        mockUser
      );

      expect(result).not.toBeNull();
      expect(result?.updatedChallenge.completed).toBe(true);
      expect(result?.rewardAwarded).toBe(true);
      expect(result?.leavesAwarded).toBe(100);
      expect(result?.updatedUser.total_leaves).toBe(300); // 200 initial + 100 reward
      expect(result?.updatedUser.current_level).toBe(3);  // 300 leaves is level 3
    });
  });

  describe('simulateOfflineRedeemVoucher', () => {
    it('deducts leaves and generates a valid voucher', () => {
      const result = simulateOfflineRedeemVoucher(
        'Oatly',
        'discount',
        100,
        mockUser
      );

      expect(result.updatedUser.total_leaves).toBe(100);
      expect(result.newVoucher.sponsorName).toBe('Oatly');
      expect(result.newVoucher.costLeaves).toBe(100);
      expect(result.newVoucher.couponCode).toMatch(/^OATLY-15-[A-Z0-9]{4}$/);
    });
  });
});
