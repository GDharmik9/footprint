import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../database.js';
import { publishCarbonEvent } from '../gcp.js';
import { verifyWebhookSignature } from '../services/signatureVerification.js';
import { fetchNestThermostatStatus } from '../services/nest.js';
import { evaluateCompetitiveLeagues } from '../services/cron.js';
import { calculateLevel } from '../utils.js';
import { AuthenticatedRequest } from '../auth.js';

// 10. POST /api/webhooks/radar - Ingest trip summaries from Radar.io SDK (Open/Mock with security)
export async function handleRadarWebhook(req: Request, res: Response): Promise<void> {
  try {
    const signature = req.headers['x-radar-signature'] as string;
    const isValid = await verifyWebhookSignature(JSON.stringify(req.body), signature, 'RADAR_WEBHOOK_SECRET');
    if (!isValid) {
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }

    let userId = req.body.userId;
    let distanceMiles = req.body.distanceMiles;
    let transportMode = req.body.mode;

    // Parse raw Radar.io webhook format if available
    if (req.body.event && req.body.event.user) {
      userId = req.body.event.user.id;
      const meters = req.body.event.trip?.distanceMeters || 0;
      distanceMiles = parseFloat((meters / 1609.34).toFixed(2));
      
      const rawMode = req.body.event.trip?.transportMode;
      if (rawMode === 'car') transportMode = 'gas_car';
      else if (rawMode === 'foot' || rawMode === 'bike') transportMode = 'transit';
      else if (rawMode === 'train') transportMode = 'transit';
      else transportMode = 'gas_car';
    }

    if (!userId || !distanceMiles) {
      res.status(400).json({ error: 'Missing webhook properties' });
      return;
    }

    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await publishCarbonEvent({
      userId,
      category: 'transport',
      source_provider: 'radar_sdk',
      raw_value: distanceMiles,
      raw_unit: 'miles',
      transportMode: transportMode || 'gas_car',
      eventId,
      timestamp
    } as any);

    res.json({ status: 'queued', eventId, distanceMiles, mode: transportMode });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// 11. POST /api/webhooks/arcadia - Ingest monthly energy billing files (Open/Mock with security)
export async function handleArcadiaWebhook(req: Request, res: Response): Promise<void> {
  try {
    const signature = req.headers['x-arcadia-signature'] as string;
    const isValid = await verifyWebhookSignature(JSON.stringify(req.body), signature, 'ARCADIA_WEBHOOK_SECRET');
    if (!isValid) {
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }

    const { userId, kwh } = req.body;
    if (!userId || !kwh) {
      res.status(400).json({ error: 'Missing parameters' });
      return;
    }

    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await publishCarbonEvent({
      userId,
      category: 'housing',
      source_provider: 'arcadia',
      raw_value: kwh,
      raw_unit: 'kWh',
      housingOption: 'standard',
      eventId,
      timestamp
    } as any);

    res.json({ status: 'queued', eventId, kwh });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// 12. POST /api/webhooks/nest - Smart Home thermostat check (Live Nest API SDM Check)
export async function handleNestWebhook(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'Missing userId parameter' });
      return;
    }

    // Query Nest live status
    const status = await fetchNestThermostatStatus(userId);
    const ecoModeActive = status.ecoMode === 'MANUAL_ECO';

    const leavesAwarded = ecoModeActive ? 25 : 5;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    let updatedUser = null;
    
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
      
      const userUpdated = await prisma.user.findUnique({ where: { id: userId } });
      if (userUpdated) {
        updatedUser = {
          id: userUpdated.id,
          display_name: userUpdated.displayName,
          total_leaves: userUpdated.totalLeaves,
          current_level: userUpdated.currentLevel,
          postal_code: userUpdated.postalCode,
          created_at: userUpdated.createdAt.toISOString()
        };
      }
    }

    res.json({
      status: 'success',
      hvacMode: status.hvacStatus,
      ecoModeActive,
      leavesAwarded,
      ambientTemperature: status.ambientTempCelsius,
      user: updatedUser
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// 13. POST /api/integrations/arcadia/callback - Handle Connect Widget OAuth callback
export async function handleArcadiaCallback(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { authCode } = req.body;
    const userId = req.userId!;
    if (!authCode) {
      res.status(400).json({ error: 'Auth code is required' });
      return;
    }

    console.log(`Arcadia callback: Exchanging authCode ${authCode} for utility token for user ${userId}...`);
    // In production, we call Arcadia's token exchange endpoint:
    // POST https://api.arcadia.com/v2/tokens
    const mockUtilityToken = `arcadia_token_${crypto.randomBytes(8).toString('hex')}`;
    
    res.status(200).json({ status: 'connected', utilityToken: mockUtilityToken });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// 14. POST /api/admin/leagues/evaluate - Admin trigger to manually evaluate and reset leagues (Testing only)
export async function evaluateLeaguesAdmin(req: Request, res: Response): Promise<void> {
  try {
    await evaluateCompetitiveLeagues();
    res.json({ status: 'success', message: 'Leagues evaluation completed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
