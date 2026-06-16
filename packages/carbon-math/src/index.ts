import { ArchetypeOptions } from '@footprint/shared-types';

// Electricity Grid emission factors (kg CO2e per kWh)
export const GRID_FACTORS: Record<string, number> = {
  'US-MROW': 0.52,  // High coal electricity grid (Midwest)
  'IN-WR': 0.72,    // High coal electricity grid (India West)
  'US-CA': 0.22,    // Cleaner grid (California)
  'default': 0.38,  // National average
};

// Transport emission factors (kg CO2e per mile)
export const TRANSPORT_FACTORS = {
  suv: 0.40,
  gas_car: 0.30,
  hybrid: 0.18,
  ev: 0.08,
  transit: 0.03, // Public transit, cycling, walking
};

// Dietary emission factors (kg CO2e per meal)
export const DIET_FACTORS = {
  meat: 3.0,      // Heavy Meat / Beef Enthusiast
  balanced: 1.5,  // Balanced / Poultry / Low Beef
  vegan: 0.5,     // Plant-Forward / Vegan
};

/**
 * Computes housing carbon emissions based on usage and configuration.
 */
export function computeHousingCO2(
  kwh: number,
  option: 'standard' | 'smart_thermostat' | 'solar',
  regionCode: string = 'default'
): number {
  const factor = GRID_FACTORS[regionCode] || GRID_FACTORS.default;
  let baseEmission = kwh * factor;

  if (option === 'smart_thermostat') {
    baseEmission *= 0.90; // 10% reduction
  } else if (option === 'solar') {
    baseEmission *= 0.15; // 85% reduction (using grid only 15% of the time or solar offset)
  }

  return parseFloat(baseEmission.toFixed(2));
}

/**
 * Computes transport emissions based on distance and mode.
 */
export function computeTransportCO2(
  miles: number,
  mode: keyof typeof TRANSPORT_FACTORS
): number {
  const factor = TRANSPORT_FACTORS[mode] || TRANSPORT_FACTORS.gas_car;
  return parseFloat((miles * factor).toFixed(2));
}

/**
 * Computes food emissions based on meals and diet type.
 */
export function computeFoodCO2(
  meals: number,
  dietType: keyof typeof DIET_FACTORS
): number {
  const factor = DIET_FACTORS[dietType] || DIET_FACTORS.balanced;
  return parseFloat((meals * factor).toFixed(2));
}

/**
 * Generates an initial baseline profile (in kg CO2e / year) from the quick onboarding archetype.
 */
export function computeArchetypeBaseline(options: ArchetypeOptions): {
  housing: number;
  transport: number;
  food: number;
  total: number;
} {
  // Annual baselines in kg CO2e
  const housingBaselines = {
    apartment: 1800,  // low energy usage
    townhouse: 4200,  // medium energy usage
    family: 6800,     // high energy usage
  };

  const transportBaselines = {
    transit: 900,     // public transit / bike
    hybrid: 2800,     // hybrid / EV vehicle
    gas: 6000,        // standard gas car / SUV
  };

  const foodBaselines = {
    vegan: 900,       // plant-forward
    balanced: 1800,   // poultry / balanced
    meat: 3500,       // beef heavy
  };

  const housing = housingBaselines[options.housing] || housingBaselines.townhouse;
  const transport = transportBaselines[options.commute] || transportBaselines.hybrid;
  const food = foodBaselines[options.diet] || foodBaselines.balanced;

  return {
    housing,
    transport,
    food,
    total: housing + transport + food,
  };
}
