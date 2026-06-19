import {
  computeHousingCO2,
  computeTransportCO2,
  computeFoodCO2,
  computeArchetypeBaseline,
  GRID_FACTORS,
  TRANSPORT_FACTORS,
  DIET_FACTORS,
  getCarbonEquivalents,
  getCarbonEquivalentsDescription
} from './index.js';

describe('Carbon Math Library Unit Tests', () => {
  describe('computeHousingCO2', () => {
    it('should compute base emission using default grid factor when regionCode is omitted or unknown', () => {
      // default: 0.38 kg CO2e per kWh
      // 100 kWh * 0.38 = 38
      expect(computeHousingCO2(100, 'standard')).toBe(38);
      expect(computeHousingCO2(100, 'standard', 'UNKNOWN')).toBe(38);
    });

    it('should compute housing emission using regional factors', () => {
      // US-CA: 0.22 kg CO2e per kWh
      // 100 * 0.22 = 22
      expect(computeHousingCO2(100, 'standard', 'US-CA')).toBe(22);

      // IN-WR: 0.72 kg CO2e per kWh
      // 100 * 0.72 = 72
      expect(computeHousingCO2(100, 'standard', 'IN-WR')).toBe(72);
    });

    it('should apply 10% reduction for smart_thermostat', () => {
      // default: 100 * 0.38 = 38 * 0.90 = 34.2
      expect(computeHousingCO2(100, 'smart_thermostat')).toBe(34.2);
    });

    it('should apply 85% reduction for solar option', () => {
      // default: 100 * 0.38 = 38 * 0.15 = 5.7
      expect(computeHousingCO2(100, 'solar')).toBe(5.7);
    });
  });

  describe('computeTransportCO2', () => {
    it('should compute correct emission for SUV', () => {
      // suv factor: 0.40
      expect(computeTransportCO2(100, 'suv')).toBe(40);
    });

    it('should compute correct emission for EV', () => {
      // ev factor: 0.08
      expect(computeTransportCO2(100, 'ev')).toBe(8);
    });

    it('should default to gas_car when mode is invalid', () => {
      // gas_car factor: 0.30
      // @ts-expect-error - testing fallback for invalid input
      expect(computeTransportCO2(100, 'rocket')).toBe(30);
    });
  });

  describe('computeFoodCO2', () => {
    it('should compute correct emission for vegan meals', () => {
      // vegan factor: 0.5
      expect(computeFoodCO2(10, 'vegan')).toBe(5);
    });

    it('should compute correct emission for meat meals', () => {
      // meat factor: 3.0
      expect(computeFoodCO2(10, 'meat')).toBe(30);
    });

    it('should default to balanced when diet type is invalid', () => {
      // balanced factor: 1.5
      // @ts-expect-error - testing fallback for invalid input
      expect(computeFoodCO2(10, 'junk')).toBe(15);
    });
  });

  describe('computeArchetypeBaseline', () => {
    it('should correctly calculate combinations of baselines', () => {
      // apartment: 1800, hybrid: 2800, vegan: 900
      const options = {
        housing: 'apartment' as const,
        commute: 'hybrid' as const,
        diet: 'vegan' as const,
      };

      const result = computeArchetypeBaseline(options);
      expect(result).toEqual({
        housing: 1800,
        transport: 2800,
        food: 900,
        total: 5500,
      });
    });

    it('should fall back to defaults when options are invalid or missing', () => {
      // townhouse: 4200, hybrid: 2800, balanced: 1800
      // @ts-expect-error - testing defaults
      const result = computeArchetypeBaseline({});
      expect(result).toEqual({
        housing: 4200,
        transport: 2800,
        food: 1800,
        total: 8800,
      });
    });
  });

  describe('getCarbonEquivalents', () => {
    it('should correctly calculate equivalents for 22 kg CO2e', () => {
      const res = getCarbonEquivalents(22);
      expect(res.treesPlanted).toBe(1);
      expect(res.smartphoneCharges).toBe(Math.round(22 / 0.0083));
      expect(res.carMilesDriven).toBe(parseFloat((22 / 0.40).toFixed(1)));
      expect(res.plasticBottlesAvoided).toBe(Math.round(22 / 0.083));
    });
  });

  describe('getCarbonEquivalentsDescription', () => {
    it('should return default text for 0 or negative input', () => {
      expect(getCarbonEquivalentsDescription(0)).toBe('No carbon emissions saved yet.');
    });

    it('should return smartphones description for small values', () => {
      expect(getCarbonEquivalentsDescription(2)).toContain('smartphones');
    });

    it('should return plastic bottles description for medium values', () => {
      expect(getCarbonEquivalentsDescription(10)).toContain('plastic bottles');
    });

    it('should return trees description for large values', () => {
      expect(getCarbonEquivalentsDescription(50)).toContain('trees');
      expect(getCarbonEquivalentsDescription(200)).toContain('trees');
    });
  });
});
