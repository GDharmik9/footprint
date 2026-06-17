import { getSecret } from '../gcp.js';

export interface NestStatus {
  ambientTempCelsius: number;
  ecoMode: 'MANUAL_ECO' | 'OFF';
  hvacStatus: 'HEATING' | 'COOLING' | 'OFF';
}

/**
 * Fetches the Nest Thermostat status for a given user from Google Nest SDM API.
 * Uses stored OAuth credentials or falls back to a realistic simulated status.
 */
export async function fetchNestThermostatStatus(userId: string): Promise<NestStatus> {
  const projectId = await getSecret('GOOGLE_CLOUD_PROJECT') || 'footprint-gcp-project';
  const nestEnterpriseId = await getSecret('NEST_ENTERPRISE_ID');

  if (!nestEnterpriseId) {
    console.log(`Nest SDM: No NEST_ENTERPRISE_ID secret configured. Simulating live thermostat check for user: ${userId}`);
    // Simulate realistic ambient temperature and eco mode status
    const hour = new Date().getHours();
    const isNight = hour < 7 || hour > 22;
    return {
      ambientTempCelsius: isNight ? 19.5 : 21.0,
      ecoMode: isNight ? 'MANUAL_ECO' : 'OFF',
      hvacStatus: isNight ? 'OFF' : 'HEATING'
    };
  }

  try {
    // In production, we retrieve the user's stored Google OAuth Access Token
    // For this implementation, we assume we fetch it via a helper or query SDM directly
    const sdmAccessToken = await getSecret(`NEST_ACCESS_TOKEN_${userId}`) || await getSecret('NEST_DEVELOPER_ACCESS_TOKEN');
    if (!sdmAccessToken) {
      throw new Error(`No OAuth access token stored for user: ${userId}`);
    }

    const url = `https://smartdevicemanagement.googleapis.com/v1/enterprises/${nestEnterpriseId}/devices`;
    console.log(`Nest SDM: Fetching device statuses for user ${userId} from enterprise ${nestEnterpriseId}...`);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${sdmAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Nest SDM API returned status ${response.status}`);
    }

    const data = await response.json() as any;
    // Find first thermostat device in enterprise
    const thermostat = data.devices?.find((d: any) => d.type === 'sdm.devices.types.THERMOSTAT');
    if (!thermostat) {
      throw new Error('No thermostat devices found in user Nest Account');
    }

    const ambientTempCelsius = thermostat.traits?.['sdm.devices.traits.Temperature']?.ambientTemperatureCelsius || 21.0;
    const ecoMode = thermostat.traits?.['sdm.devices.traits.ThermostatEco']?.mode || 'OFF';
    const hvacStatus = thermostat.traits?.['sdm.devices.traits.ThermostatHvac']?.status || 'OFF';

    return {
      ambientTempCelsius,
      ecoMode,
      hvacStatus
    };
  } catch (err) {
    console.warn(`Nest SDM API query failed for user ${userId}. Falling back to default baseline:`, err);
    return {
      ambientTempCelsius: 20.5,
      ecoMode: 'MANUAL_ECO',
      hvacStatus: 'OFF'
    };
  }
}
