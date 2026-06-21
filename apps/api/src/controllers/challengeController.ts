import { Response } from 'express';
import { prisma, seedUserChallenges } from '../database.js';
import { AuthenticatedRequest } from '../auth.js';
import { calculateLevel } from '../utils.js';
import { Challenge } from '@footprint/shared-types';

// 5. GET /api/challenges/:userId - Fetch active challenges (Secured)
export async function getChallenges(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      type: r.type as 'cold-wash' | 'vampire-hunt',
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
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
}

// 6. POST /api/challenges/progress - Log daily progress for a 7-day streak challenge (Secured)
export async function updateChallengeProgress(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      type: updatedRow.type as 'cold-wash' | 'vampire-hunt',
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
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
}
