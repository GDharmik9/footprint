import { getSecret } from '../gcp.js';

interface CacheEntry {
  factor: number; // in kg CO2e per kWh
  expiresAt: number; // timestamp in ms
}

const cache = new Map<string, CacheEntry>();
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 Hour cache

interface LatLon {
  lat: number;
  lon: number;
  defaultFactor: number;
}

// Simple mapping for demo postal codes to coordinates and baseline factors
function resolvePostalCode(postalCode: string): LatLon {
  const cleanCode = postalCode.trim();

  if (cleanCode.startsWith('9')) {
    // California area
    return { lat: 34.05, lon: -118.24, defaultFactor: 0.22 };
  } else if (cleanCode.startsWith('6')) {
    // Midwest area
    return { lat: 41.88, lon: -87.62, defaultFactor: 0.52 };
  } else if (cleanCode.startsWith('11') || cleanCode.startsWith('40') || cleanCode.startsWith('70')) {
    // India area
    return { lat: 28.61, lon: 77.20, defaultFactor: 0.72 };
  }

  // National/Default average fallback
  return { lat: 37.09, lon: -95.71, defaultFactor: 0.38 };
}

/**
 * Fetches the real-time grid carbon emission factor (kg CO2e per kWh)
 * based on user's postal code. Uses an in-memory 1-hour cache.
 */
export async function getGridCarbonFactor(postalCode: string): Promise<number> {
  const cleanCode = postalCode.trim() || 'default';
  const cached = cache.get(cleanCode);

  if (cached && cached.expiresAt > Date.now()) {
    console.log(`Cache Hit: Grid factor for postal code "${cleanCode}" is ${cached.factor} kg CO2e/kWh`);
    return cached.factor;
  }

  const location = resolvePostalCode(cleanCode);
  const apiKey = await getSecret('ELECTRICITY_MAPS_API_KEY');

  if (!apiKey) {
    console.log(`Electricity Maps: No API key detected. Using default fallback factor for postal code "${cleanCode}": ${location.defaultFactor} kg CO2e/kWh`);
    // Cache the fallback factor
    cache.set(cleanCode, {
      factor: location.defaultFactor,
      expiresAt: Date.now() + CACHE_DURATION_MS
    });
    return location.defaultFactor;
  }

  try {
    const url = `https://api.electricitymaps.com/v3/carbon-intensity/latest?lat=${location.lat}&lon=${location.lon}`;
    console.log(`Electricity Maps API Call: Fetching live factor for lat:${location.lat}, lon:${location.lon}...`);
    
    const response = await fetch(url, {
      headers: {
        'auth-token': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Electricity Maps API returned status code ${response.status}`);
    }

    const data = await response.json() as any;
    // Electricity Maps yields intensity in gCO2eq/kWh.
    // Convert to kg CO2e/kWh by dividing by 1000.
    const carbonIntensityG = data.carbonIntensity;
    if (typeof carbonIntensityG !== 'number') {
      throw new Error('Electricity Maps API returned invalid carbonIntensity payload');
    }

    const factor = parseFloat((carbonIntensityG / 1000).toFixed(4));
    console.log(`Electricity Maps API Success: Live factor is ${factor} kg CO2e/kWh`);

    cache.set(cleanCode, {
      factor,
      expiresAt: Date.now() + CACHE_DURATION_MS
    });

    return factor;
  } catch (err) {
    console.warn(`Electricity Maps API query failed. Using fallback factor ${location.defaultFactor}:`, err);
    // Cache fallback for a shorter time (e.g. 5 minutes) to retry soon
    cache.set(cleanCode, {
      factor: location.defaultFactor,
      expiresAt: Date.now() + 5 * 60 * 1000
    });
    return location.defaultFactor;
  }
}
