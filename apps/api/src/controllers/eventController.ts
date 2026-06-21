import { Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../database.js';
import { publishCarbonEvent } from '../gcp.js';
import { 
  computeHousingCO2, 
  computeTransportCO2, 
  computeFoodCO2, 
  GRID_FACTORS
} from '@footprint/carbon-math';
import { AuthenticatedRequest } from '../auth.js';
import { getGridCarbonFactor } from '../services/electricityMaps.js';
import { calculateLevel, calculateLeavesAwarded } from '../utils.js';
import { IngestCarbonEventPayload } from '@footprint/shared-types';

// 3. GET /api/carbon-events/:userId - Retrieve carbon footprint logs (Secured)
export async function getEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (req.userId !== req.params.userId) {
      res.status(403).json({ error: 'Access denied: User mismatch' });
      return;
    }

    const events = await prisma.carbonEvent.findMany({
      where: { userId: req.params.userId },
      orderBy: { timestamp: 'desc' }
    });
    res.json(events.map(e => ({
      id: e.id,
      user_id: e.userId,
      category: e.category,
      source_provider: e.sourceProvider,
      raw_value: e.rawValue,
      raw_unit: e.rawUnit,
      computed_co2e_kg: e.computedCo2eKg,
      region_code: e.regionCode,
      timestamp: e.timestamp.toISOString()
    })));
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
}

// 3b. DELETE /api/carbon-events/:id - Delete a carbon tracking event (Secured)
export async function deleteEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const eventId = req.params.id;
    const userId = req.userId!;

    // Find the event
    const event = await prisma.carbonEvent.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      res.status(404).json({ error: 'Carbon event not found' });
      return;
    }

    if (event.userId !== userId) {
      res.status(403).json({ error: 'Access denied: Event owner mismatch' });
      return;
    }

    // Calculate leaves to deduct
    let leavesDeducted = 15;
    const category = event.category;
    const rawValue = event.rawValue;
    const computedCo2eKg = event.computedCo2eKg;
    const regionCode = event.regionCode;

    if (category === 'transport') {
      if (rawValue > 0) {
        const factor = computedCo2eKg / rawValue;
        if (Math.abs(factor - 0.03) < 0.02 || Math.abs(factor - 0.08) < 0.02) {
          leavesDeducted = 30; // ev or transit bonus (15 + 15)
        }
      }
    } else if (category === 'food') {
      if (rawValue > 0) {
        const factor = computedCo2eKg / rawValue;
        if (Math.abs(factor - 0.5) < 0.1) {
          leavesDeducted = 25; // vegan bonus (15 + 10)
        }
      }
    } else if (category === 'housing') {
      if (rawValue > 0) {
        let baseFactor = 0.38;
        if (regionCode && GRID_FACTORS[regionCode]) {
          baseFactor = GRID_FACTORS[regionCode];
        }
        const ratio = computedCo2eKg / rawValue / baseFactor;
        if (Math.abs(ratio - 0.15) < 0.05) {
          leavesDeducted = 35; // solar bonus (15 + 20)
        }
      }
    }

    // Delete the event
    await prisma.carbonEvent.delete({
      where: { id: eventId }
    });

    // Update user leaves and level
    const user = await prisma.user.findUnique({ where: { id: userId } });
    let updatedUser = null;
    if (user) {
      const newLeaves = Math.max(0, user.totalLeaves - leavesDeducted);
      const newLevel = calculateLevel(newLeaves);
      await prisma.user.update({
        where: { id: userId },
        data: { totalLeaves: newLeaves, currentLevel: newLevel }
      });

      // Update league standing
      const leagueEntry = await prisma.league.findFirst({ where: { userId } });
      if (leagueEntry) {
        await prisma.league.updateMany({
          where: { userId },
          data: {
            leaves: Math.max(0, leagueEntry.leaves - leavesDeducted)
          }
        });
      }

      const freshUser = await prisma.user.findUnique({ where: { id: userId } });
      if (freshUser) {
        updatedUser = {
          id: freshUser.id,
          display_name: freshUser.displayName,
          total_leaves: freshUser.totalLeaves,
          current_level: freshUser.currentLevel,
          postal_code: freshUser.postalCode,
          created_at: freshUser.createdAt.toISOString()
        };
      }
    }

    res.json({
      status: 'success',
      message: 'Carbon event deleted successfully',
      leavesDeducted,
      user: updatedUser
    });
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
}

// 4. POST /api/carbon-events - Log carbon tracking event (Secured)
export async function createEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { 
      category, 
      source_provider, 
      raw_value, 
      raw_unit, 
      region_code, 
      transportMode, 
      dietType,
      housingOption
    } = req.body;

    const userId = req.userId!;

    if (!category || !raw_value || !raw_unit) {
      res.status(400).json({ error: 'Missing required carbon event fields' });
      return;
    }

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

    const eventId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const payload: IngestCarbonEventPayload = {
      userId,
      category,
      source_provider: source_provider || 'manual',
      raw_value,
      raw_unit,
      region_code: customRegionKey,
      timestamp
    };

    // Publish ingestion payload to GCP Pub/Sub
    await publishCarbonEvent(payload);

    const leavesAwarded = calculateLeavesAwarded(category, { transportMode, dietType, housingOption });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const updatedUser = user 
      ? {
          id: user.id,
          display_name: user.displayName,
          total_leaves: user.totalLeaves + leavesAwarded,
          current_level: calculateLevel(user.totalLeaves + leavesAwarded),
          postal_code: user.postalCode,
          created_at: user.createdAt.toISOString()
        }
      : null;

    const projectedEvent = {
      id: eventId,
      user_id: userId,
      category,
      source_provider: source_provider || 'manual',
      raw_value,
      raw_unit,
      computed_co2e_kg: computedCO2,
      region_code: customRegionKey,
      timestamp
    };

    res.status(201).json({ event: projectedEvent, user: updatedUser, leavesAwarded });
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
}
