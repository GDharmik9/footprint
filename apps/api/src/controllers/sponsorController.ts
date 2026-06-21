import { Response } from 'express';
import crypto from 'crypto';
import { prisma, seedWeeklyLeague } from '../database.js';
import { triggerTreePlanting } from '../services/eden.js';
import { generateShopifyDiscountCode } from '../services/shopify.js';
import { AuthenticatedRequest } from '../auth.js';
import { calculateLevel } from '../utils.js';

// 7. POST /api/sponsors/redeem - Spend leaves to redeem real B-Corp reward (Secured)
export async function redeemVoucher(req: AuthenticatedRequest, res: Response): Promise<void> {
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
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
}

// 8. GET /api/vouchers/:userId - Fetch all vouchers for a user (Secured)
export async function getVouchers(req: AuthenticatedRequest, res: Response): Promise<void> {
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
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
}

// 9. GET /api/leagues/:userId - Fetch Eco-Leagues Leaderboard (Secured)
export async function getLeaguesLeaderboard(req: AuthenticatedRequest, res: Response): Promise<void> {
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
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
}
