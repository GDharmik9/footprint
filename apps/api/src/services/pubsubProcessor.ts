import { IngestCarbonEventPayload } from '@footprint/shared-types';
import { prisma } from '../database.js';
import { 
  computeHousingCO2, 
  computeTransportCO2, 
  computeFoodCO2, 
  GRID_FACTORS 
} from '@footprint/carbon-math';
import { getGridCarbonFactor } from './electricityMaps.js';
import { calculateLevel, calculateLeavesAwarded } from '../utils.js';

/**
 * Handles processing of ingested telemetry payloads from Pub/Sub (or local fallback bus).
 */
export async function processIngestPayload(payload: IngestCarbonEventPayload): Promise<void> {
  console.log('Pub/Sub subscriber processing payload:', payload);
  
  // Extract parameters safely
  const {
    userId,
    category,
    source_provider,
    raw_value,
    raw_unit,
    region_code,
    transportMode,
    dietType,
    housingOption,
    eventId,
    timestamp
  } = payload;

  let computedCO2 = 0;
  let customRegionKey = region_code || 'default';

  if (category === 'housing') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const postalCode = user?.postalCode || '';
    const gridFactor = await getGridCarbonFactor(postalCode);
    customRegionKey = `custom-${postalCode}`;
    GRID_FACTORS[customRegionKey] = gridFactor;
    computedCO2 = computeHousingCO2(raw_value, (housingOption as any) || 'standard', customRegionKey);
  } else if (category === 'transport') {
    computedCO2 = computeTransportCO2(raw_value, (transportMode as any) || 'gas_car');
  } else if (category === 'food') {
    computedCO2 = computeFoodCO2(raw_value, (dietType as any) || 'balanced');
  }

  // Persist the carbon event
  await prisma.carbonEvent.create({
    data: {
      id: eventId || crypto.randomUUID(),
      userId,
      category,
      sourceProvider: source_provider || 'manual',
      rawValue: raw_value,
      rawUnit: raw_unit,
      computedCo2eKg: computedCO2,
      regionCode: customRegionKey,
      timestamp: new Date(timestamp || Date.now())
    }
  });

  // Calculate and award leaves gamification rewards
  const leavesAwarded = calculateLeavesAwarded(category, { transportMode, dietType, housingOption });

  await prisma.league.updateMany({
    where: { userId },
    data: { leaves: { increment: leavesAwarded } }
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    const newLeaves = user.totalLeaves + leavesAwarded;
    const newLevel = calculateLevel(newLeaves);
    await prisma.user.update({
      where: { id: userId },
      data: { totalLeaves: newLeaves, currentLevel: newLevel }
    });
  }

  console.log(`Subscriber processed event successfully: ${eventId}`);
}
