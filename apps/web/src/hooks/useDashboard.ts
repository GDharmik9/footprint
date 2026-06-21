import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type {
  User,
  CarbonEvent,
  Challenge,
  Voucher,
  ArchetypeOptions
} from '@footprint/shared-types';
import {
  computeHousingCO2,
  computeTransportCO2,
  computeFoodCO2,
  computeArchetypeBaseline
} from '@footprint/carbon-math';
import Radar from 'radar-sdk-js';
import {
  COUNTRY_CONFIGS,
  calculateLevel,
  generateRandomEcoName,
  detectIPLocation,
  type Recommendation
} from '../utils/dashboardUtils';
import {
  simulateOfflineState as runSimulateOfflineState,
  calculateLocalLeavesAwarded,
  simulateOfflineChallengeToggle,
  simulateOfflineRedeemVoucher
} from '../utils/offlineSandbox';

const API_BASE = 'http://localhost:3001/api';

export interface LeaderboardMember {
  id: string;
  userId: string;
  username: string;
  level: number;
  leaves: number;
}

export function useDashboard() {
  // Authentication & Onboarding State
  const [user, setUser] = useState<User | null>(null);
  const [baseline, setBaseline] = useState<{ housing: number; transport: number; food: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Progressive Calibration States
  const [isCalibrating, setIsCalibrating] = useState<boolean>(() => {
    return !localStorage.getItem('footprint_calibration_completed');
  });
  const [calibrationStep, setCalibrationStep] = useState<number>(1);

  // Onboarding Form inputs
  const [displayName, setDisplayName] = useState('');
  const [country, setCountry] = useState('us');
  const [postalCode, setPostalCode] = useState('');
  const [housingArchetype, setHousingArchetype] = useState<'apartment' | 'townhouse' | 'family'>('townhouse');
  const [dietArchetype, setDietArchetype] = useState<'vegan' | 'balanced' | 'meat'>('balanced');
  const [commuteArchetype, setCommuteArchetype] = useState<'transit' | 'hybrid' | 'gas'>('hybrid');

  // Reset postal code when country changes to avoid validation mismatch
  useEffect(() => {
    setPostalCode('');
  }, [country]);

  // Restrict postal code input values based on country's numeric constraints
  const handleChangePostalCode = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const config = COUNTRY_CONFIGS[country];
    if (config.numericOnly) {
      const numericVal = val.replace(/\D/g, '');
      if (config.zipLength && numericVal.length > config.zipLength) {
        return;
      }
      setPostalCode(numericVal);
    } else {
      if (val.length <= 10) {
        setPostalCode(val);
      }
    }
  };

  // Dashboard state
  const [events, setEvents] = useState<CarbonEvent[]>([]);
  const [chartViewMode, setChartViewMode] = useState<'total' | 'breakdown'>('total');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);

  // Interactive Simulator Options state
  const [simHousing, setSimHousing] = useState<'standard' | 'smart_thermostat' | 'solar'>('standard');
  const [simTransport, setSimTransport] = useState<'suv' | 'gas_car' | 'hybrid' | 'ev' | 'transit'>('gas_car');
  const [simDiet, setSimDiet] = useState<'meat' | 'balanced' | 'vegan'>('balanced');

  // Alert popup state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Eco-Leagues Leaderboard and Tab state
  const [ecoSphereTab, setEcoSphereTab] = useState<'sphere' | 'league'>('sphere');
  const [leaderboard, setLeaderboard] = useState<LeaderboardMember[]>([]);
  const [coachInsights, setCoachInsights] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  // Webhook simulator state
  const [simRadarDistance, setSimRadarDistance] = useState<number>(12);
  const [simRadarMode, setSimRadarMode] = useState<'suv' | 'gas_car' | 'hybrid' | 'ev' | 'transit'>('gas_car');
  const [simArcadiaKwh, setSimArcadiaKwh] = useState<number>(250);
  const [simNestEco, setSimNestEco] = useState<boolean>(true);

  // Local Storage load
  useEffect(() => {
    Radar.initialize('prj_test_pk_0000000000000000000000000000000000000000');

    const cachedUserId = localStorage.getItem('footprint_user_id');
    const cachedBaseline = localStorage.getItem('footprint_baseline');
    if (cachedUserId) {
      fetchUser(cachedUserId);
      if (cachedBaseline) {
        setBaseline(JSON.parse(cachedBaseline));
      }
    } else {
      triggerFrictionlessOnboarding();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch all user dashboard data
  async function fetchUser(userId: string) {
    setLoading(true);
    const token = localStorage.getItem('footprint_auth_token');
    const authHeaders = {
      'Authorization': `Bearer ${token}`
    };
    const fetchOpts = { headers: authHeaders, credentials: 'include' as RequestCredentials };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    try {
      const userRes = await fetch(`${API_BASE}/users/${userId}`, { ...fetchOpts, signal: controller.signal });
      if (!userRes.ok) throw new Error('User not found on server');
      const userData = await userRes.json();
      setUser(userData);
      localStorage.setItem('footprint_user_id', userId);

      await Promise.allSettled([
        fetch(`${API_BASE}/carbon-events/${userId}`, { ...fetchOpts, signal: controller.signal }).then(async res => {
          if (res.ok) setEvents(await res.json());
        }),
        fetch(`${API_BASE}/challenges/${userId}`, { ...fetchOpts, signal: controller.signal }).then(async res => {
          if (res.ok) setChallenges(await res.json());
        }),
        fetch(`${API_BASE}/vouchers/${userId}`, { ...fetchOpts, signal: controller.signal }).then(async res => {
          if (res.ok) setVouchers(await res.json());
        }),
        fetch(`${API_BASE}/leagues/${userId}`, { ...fetchOpts, signal: controller.signal }).then(async res => {
          if (res.ok) setLeaderboard(await res.json());
        }),
        fetch(`${API_BASE}/users/${userId}/insights`, { ...fetchOpts, signal: controller.signal }).then(async res => {
          if (res.ok) {
            const data = await res.json();
            setCoachInsights(data.insights);
            setRecommendations(data.recommendations);
          }
        })
      ]);
    } catch {
      console.warn('Backend server connection failed or timed out. Falling back to simulated local state.');
      simulateOfflineState(userId);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  // Logout: clear cookie on server and reset client state
  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch {
      // Ignore network errors
    }
    localStorage.removeItem('footprint_auth_token');
    localStorage.removeItem('footprint_user_id');
    localStorage.removeItem('footprint_baseline');
    localStorage.removeItem('footprint_calibration_completed');
    setUser(null);
    setBaseline(null);
    setEvents([]);
    setChallenges([]);
    setVouchers([]);
    setLeaderboard([]);
    setCoachInsights([]);
    setRecommendations([]);
    setIsCalibrating(true);
    setCalibrationStep(1);
    triggerToast('You have been logged out.', 'info');
  };

  // Delete a carbon event log
  const deleteCarbonEvent = async (eventId: string) => {
    setLoading(true);
    const token = localStorage.getItem('footprint_auth_token');
    try {
      if (!token) throw new Error('No auth token found');

      const response = await fetch(`${API_BASE}/carbon-events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete event on backend');
      }

      const data = await response.json();

      if (data.user) {
        setUser(data.user);
      }

      setEvents(prev => prev.filter(e => e.id !== eventId));

      if (user) {
        fetchUser(user.id);
      }

      triggerToast(`Carbon event deleted. -${data.leavesDeducted} Leaves deducted.`, 'success');
    } catch {
      console.warn('API error during deletion. Simulating deletion locally.');

      const eventToDelete = events.find(e => e.id === eventId);
      if (!eventToDelete) {
        triggerToast('Event not found.', 'error');
        setLoading(false);
        return;
      }

      let leavesDeducted = 15;
      const { category, raw_value, computed_co2e_kg } = eventToDelete;

      if (category === 'transport') {
        if (raw_value > 0) {
          const factor = computed_co2e_kg / raw_value;
          if (Math.abs(factor - 0.03) < 0.02 || Math.abs(factor - 0.08) < 0.02) {
            leavesDeducted = 30;
          }
        }
      } else if (category === 'food') {
        if (raw_value > 0) {
          const factor = computed_co2e_kg / raw_value;
          if (Math.abs(factor - 0.5) < 0.1) {
            leavesDeducted = 25;
          }
        }
      } else if (category === 'housing') {
        if (raw_value > 0) {
          const ratio = computed_co2e_kg / raw_value / 0.38;
          if (Math.abs(ratio - 0.15) < 0.05) {
            leavesDeducted = 35;
          }
        }
      }

      if (user) {
        const newLeaves = Math.max(0, user.total_leaves - leavesDeducted);
        const newLevel = calculateLevel(newLeaves);
        const updatedUser = {
          ...user,
          total_leaves: newLeaves,
          current_level: newLevel
        };
        setUser(updatedUser);

        setLeaderboard(prev => {
          const updated = prev.map(m => m.userId === user.id ? { ...m, leaves: newLeaves, level: newLevel } : m);
          return [...updated].sort((a, b) => b.leaves - a.leaves);
        });
      }

      setEvents(prev => prev.filter(e => e.id !== eventId));
      triggerToast(`Local Mode: Carbon event deleted. -${leavesDeducted} Leaves deducted.`, 'info');
    } finally {
      setLoading(false);
    }
  };

  const simulateOfflineState = (userId: string) => {
    const data = runSimulateOfflineState(
      userId,
      displayName,
      postalCode,
      housingArchetype,
      dietArchetype,
      commuteArchetype
    );
    setUser(data.user);
    setBaseline(data.baseline);
    localStorage.setItem('footprint_baseline', JSON.stringify(data.baseline));
    setEvents(data.events);
    setChallenges(data.challenges);
    setLeaderboard(data.leaderboard);
    setCoachInsights(data.insights);
    setRecommendations(data.recommendations);
  };

  async function triggerFrictionlessOnboarding() {
    setLoading(true);
    try {
      const location = await detectIPLocation();
      const randName = generateRandomEcoName();

      setDisplayName(randName);
      setPostalCode(location.postalCode);
      setCountry(location.country);

      const initialArchetype = {
        housing: 'townhouse' as const,
        diet: 'balanced' as const,
        commute: 'hybrid' as const
      };

      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: randName,
          postal_code: location.postalCode,
          archetype: initialArchetype
        })
      });

      if (!response.ok) throw new Error('Frictionless onboarding registration failed');

      const data = await response.json();
      setUser(data.user);
      setBaseline(data.baseline);
      localStorage.setItem('footprint_user_id', data.user.id);
      localStorage.setItem('footprint_auth_token', data.token);
      localStorage.setItem('footprint_baseline', JSON.stringify(data.baseline));

      setIsCalibrating(true);
      setCalibrationStep(1);

      triggerToast(`Welcome, ${randName}! Silent setup completed via IP GeoIP.`, 'success');
      fetchUser(data.user.id);
    } catch {
      console.warn('Backend offline. Initializing local sandbox session...');
      const fallbackId = crypto.randomUUID();
      const randName = generateRandomEcoName();
      setDisplayName(randName);
      setPostalCode('90210');
      setCountry('us');
      simulateOfflineState(fallbackId);
      setIsCalibrating(true);
      setCalibrationStep(1);
      triggerToast('Frictionless setup: local sandbox ready.', 'info');
    } finally {
      setLoading(false);
    }
  }

  const handleProgressiveProfileUpdate = async (updatePayload: {
    displayName?: string;
    postalCode?: string;
    archetype?: {
      housing: 'apartment' | 'townhouse' | 'family';
      diet: 'vegan' | 'balanced' | 'meat';
      commute: 'transit' | 'hybrid' | 'gas';
    };
  }) => {
    if (!user) return;
    setLoading(true);

    try {
      const token = localStorage.getItem('footprint_auth_token');
      const response = await fetch(`${API_BASE}/users/${user.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatePayload)
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        if (data.baseline) {
          setBaseline(data.baseline);
          localStorage.setItem('footprint_baseline', JSON.stringify(data.baseline));
        }
        triggerToast('Calibrated baseline updated in cloud database!', 'success');
        fetchUser(user.id);
      } else {
        throw new Error('Failed to patch progressive profile');
      }
    } catch {
      console.warn('API error. Simulating progressive profile locally.');
      const updatedUser = {
        ...user,
        display_name: updatePayload.displayName || user.display_name,
        postal_code: updatePayload.postalCode || user.postal_code
      };
      setUser(updatedUser);

      if (updatePayload.archetype) {
        const localBaseline = computeArchetypeBaseline(updatePayload.archetype);
        setBaseline(localBaseline);
        localStorage.setItem('footprint_baseline', JSON.stringify(localBaseline));
        triggerToast('Calibrated baseline updated locally!', 'success');
      }
    } finally {
      setLoading(false);
    }
  };

  const nextCalibrationStep = (stepPayload?: Record<string, unknown>) => {
    if (stepPayload) {
      if (stepPayload.housing) setHousingArchetype(stepPayload.housing as any);
      if (stepPayload.diet) setDietArchetype(stepPayload.diet as any);
      if (stepPayload.commute) setCommuteArchetype(stepPayload.commute as any);

      const nextHousing = (stepPayload.housing as any) || housingArchetype;
      const nextDiet = (stepPayload.diet as any) || dietArchetype;
      const nextCommute = (stepPayload.commute as any) || commuteArchetype;

      handleProgressiveProfileUpdate({
        archetype: {
          housing: nextHousing,
          diet: nextDiet,
          commute: nextCommute
        }
      });
    }
    setCalibrationStep(prev => prev + 1);
  };

  const triggerQuickLog = async (
    category: 'food' | 'transport' | 'housing',
    modeOrOption: string,
    value: number,
    unit: string
  ) => {
    if (!user) return;
    setLoading(true);

    try {
      const token = localStorage.getItem('footprint_auth_token');
      const response = await fetch(`${API_BASE}/carbon-events`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.id,
          category,
          source_provider: 'manual',
          raw_value: value,
          raw_unit: unit,
          transportMode: category === 'transport' ? modeOrOption : undefined,
          dietType: category === 'food' ? modeOrOption : undefined,
          housingOption: category === 'housing' ? modeOrOption : undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        fetchUser(user.id);
        triggerToast(`Quick Log successful! Earned +${data.leavesAwarded} Leaves! 🍃`, 'success');
      } else {
        throw new Error('Quick log API returned error');
      }
    } catch {
      console.warn('API error. Executing quick log locally in sandbox.');
      let computedCO2 = 0;
      if (category === 'housing') {
        computedCO2 = computeHousingCO2(value, modeOrOption as any);
      } else if (category === 'transport') {
        computedCO2 = computeTransportCO2(value, modeOrOption as any);
      } else if (category === 'food') {
        computedCO2 = computeFoodCO2(value, modeOrOption as any);
      }

      const newEvent: CarbonEvent = {
        id: crypto.randomUUID(),
        user_id: user.id,
        category,
        source_provider: 'manual',
        raw_value: value,
        raw_unit: unit,
        computed_co2e_kg: computedCO2,
        timestamp: new Date().toISOString()
      };

      setEvents(prev => [newEvent, ...prev]);

      const leavesAwarded = calculateLocalLeavesAwarded(category, modeOrOption);

      const newLeaves = user.total_leaves + leavesAwarded;
      const newLevel = calculateLevel(newLeaves);
      const updatedUser = {
        ...user,
        total_leaves: newLeaves,
        current_level: newLevel
      };
      setUser(updatedUser);
      setLeaderboard(prev => {
        const updated = prev.map(m => m.userId === user.id ? { ...m, leaves: newLeaves, level: newLevel } : m);
        return [...updated].sort((a, b) => b.leaves - a.leaves);
      });
      triggerToast(`Local Mode: Quick logged! Earned +${leavesAwarded} Leaves.`, 'success');
    } finally {
      setLoading(false);
    }
  };

  const handleOnboarding = async (e: FormEvent) => {
    e.preventDefault();
    if (!displayName) return;

    const cleanCode = postalCode.trim();
    if (cleanCode) {
      const config = COUNTRY_CONFIGS[country];
      const localRegex = new RegExp(config.pattern);

      if (!localRegex.test(cleanCode)) {
        triggerToast(`Please enter a valid postal code format for ${config.name}.`, 'error');
        return;
      }

      setLoading(true);
      try {
        const apiCode = cleanCode.replace(/\s+/g, '').toLowerCase();
        let isValid = false;

        if (country === 'in') {
          const url = `https://api.postalpincode.in/pincode/${apiCode}`;
          console.log(`Verifying Indian PIN code ${cleanCode} via official API: ${url}`);
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data) && data[0]?.Status === 'Success') {
              isValid = true;
            }
          }
        } else {
          const url = `https://api.zippopotam.us/${country.toUpperCase()}/${apiCode}`;
          console.log(`Verifying postal code ${cleanCode} via Zippopotam API: ${url}`);
          const response = await fetch(url);
          if (response.ok) {
            isValid = true;
          }
        }

        if (!isValid) {
          triggerToast(`Invalid postal code "${cleanCode}" for ${config.name}. Please enter a valid one.`, 'error');
          setLoading(false);
          return;
        }

      } catch (err) {
        console.warn('External postal code verification API failed. Falling back to local pattern check.', err);
        if (!localRegex.test(cleanCode)) {
          triggerToast(`Please enter a valid postal code format for ${config.name}.`, 'error');
          setLoading(false);
          return;
        }
      }
    }

    setLoading(true);
    const archetype: ArchetypeOptions = {
      housing: housingArchetype,
      diet: dietArchetype,
      commute: commuteArchetype
    };

    try {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          postal_code: postalCode,
          archetype
        })
      });

      if (!response.ok) throw new Error('Failed to register user onboarding');

      const data = await response.json();
      setUser(data.user);
      setBaseline(data.baseline);
      localStorage.setItem('footprint_user_id', data.user.id);
      localStorage.setItem('footprint_auth_token', data.token);
      localStorage.setItem('footprint_baseline', JSON.stringify(data.baseline));
      triggerToast('Welcome to Footprint! Archetype baseline generated.', 'success');

      fetchUser(data.user.id);
    } catch {
      console.warn('Backend server offline. Setting up local session...');
      const fallbackId = crypto.randomUUID();
      simulateOfflineState(fallbackId);
      triggerToast('Offline sandbox session started.', 'info');
    } finally {
      setLoading(false);
    }
  };

  const toggleChallengeDay = async (challengeType: 'cold-wash' | 'vampire-hunt', dayIndex: number, currentCompleted: boolean) => {
    if (!user) return;

    try {
      const token = localStorage.getItem('footprint_auth_token');
      const response = await fetch(`${API_BASE}/challenges/progress`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.id,
          challengeType,
          dayIndex,
          completed: !currentCompleted
        })
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setChallenges(challenges.map(c => c.type === challengeType ? data.challenge : c));

        if (data.rewardAwarded) {
          triggerToast(`Streak Complete! Challenge Finished. Earned +${data.leavesAwarded} Leaves! 🏆`, 'success');
        } else {
          triggerToast(`Day ${dayIndex + 1} logged for ${challengeType === 'cold-wash' ? 'Cold-Wash' : 'Vampire Hunt'}.`);
        }
      } else {
        throw new Error('Failed to update challenge');
      }
    } catch {
      const result = simulateOfflineChallengeToggle(challenges, challengeType, dayIndex, currentCompleted, user);
      if (result) {
        setChallenges(challenges.map(c => c.type === challengeType ? result.updatedChallenge : c));
        setUser(result.updatedUser);

        if (result.rewardAwarded) {
          const newLeaves = result.updatedUser.total_leaves;
          const newLevel = result.updatedUser.current_level;
          setLeaderboard(prev => {
            const updated = prev.map(m => m.userId === user.id ? { ...m, leaves: newLeaves, level: newLevel } : m);
            return [...updated].sort((a, b) => b.leaves - a.leaves);
          });
          triggerToast(`Local Mode: Challenge Completed! Earned +${result.leavesAwarded} Leaves! 🏆`, 'success');
        } else {
          triggerToast(`Local Mode: Toggled Day ${dayIndex + 1}.`);
        }
      }
    }
  };

  const redeemVoucher = async (sponsorName: string, rewardType: 'tree' | 'discount' | 'plug', costLeaves: number) => {
    if (!user) return;
    if (user.total_leaves < costLeaves) {
      triggerToast('Insufficient Leaves. Keep taking low-carbon actions!', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('footprint_auth_token');
      const response = await fetch(`${API_BASE}/sponsors/redeem`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.id,
          sponsorName,
          rewardType,
          costLeaves
        })
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        fetchUser(user.id);
        triggerToast(`Success! Redeemed ${costLeaves} Leaves for ${sponsorName} reward.`, 'success');
      } else {
        throw new Error('Failed to redeem voucher');
      }
    } catch {
      const result = simulateOfflineRedeemVoucher(sponsorName, rewardType, costLeaves, user);
      setVouchers([result.newVoucher, ...vouchers]);
      setUser(result.updatedUser);
      setLeaderboard(prev => {
        const updated = prev.map(m => m.userId === user.id ? { ...m, leaves: result.updatedUser.total_leaves, level: result.updatedUser.current_level } : m);
        return [...updated].sort((a, b) => b.leaves - a.leaves);
      });
      triggerToast(`Local Mode: Redeemed ${costLeaves} Leaves successfully!`, 'success');
    }
  };

  const triggerRadarWebhook = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const trackRes = await Radar.trackOnce();
      const lat = trackRes.location?.latitude || 34.05;
      const lon = trackRes.location?.longitude || -118.24;
      console.log(`Radar location lat: ${lat}, lon: ${lon}`);

      const response = await fetch(`${API_BASE}/webhooks/radar`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          distanceMiles: simRadarDistance,
          mode: simRadarMode,
          coordinates: { lat, lon }
        })
      });
      if (response.ok) {
        triggerToast(`Radar SDK: Location tracked (${lat.toFixed(2)}, ${lon.toFixed(2)}) and trip summary ingestion queued.`, 'success');
        setTimeout(() => fetchUser(user.id), 1500);
      } else {
        throw new Error('Radar webhook returned non-200');
      }
    } catch {
      const computedCO2 = computeTransportCO2(simRadarDistance, simRadarMode);
      const newEvent: CarbonEvent = {
        id: crypto.randomUUID(),
        user_id: user.id,
        category: 'transport',
        source_provider: 'radar_sdk',
        raw_value: simRadarDistance,
        raw_unit: 'miles',
        computed_co2e_kg: computedCO2,
        timestamp: new Date().toISOString()
      };
      setEvents(prev => [newEvent, ...prev]);

      let leavesAwarded = 15;
      if (simRadarMode === 'ev' || simRadarMode === 'transit') {
        leavesAwarded += 15;
      }
      const newLeaves = user.total_leaves + leavesAwarded;
      const newLevel = calculateLevel(newLeaves);
      const updatedUser = {
        ...user,
        total_leaves: newLeaves,
        current_level: newLevel
      };
      setUser(updatedUser);
      setLeaderboard(prev => {
        const updated = prev.map(m => m.userId === user.id ? { ...m, leaves: newLeaves, level: newLevel } : m);
        return [...updated].sort((a, b) => b.leaves - a.leaves);
      });
      triggerToast(`Local Mode: Geolocation tracked. Trip event logged: +${leavesAwarded} Leaves!`, 'success');
    } finally {
      setLoading(false);
    }
  };

  const triggerArcadiaWebhook = async () => {
    if (!user) return;

    if ((window as any).ArcadiaConnect) {
      const connect = new (window as any).ArcadiaConnect({
        clientToken: 'mock_client_token_for_hackathon',
        onSuccess: async (authCode: string) => {
          triggerToast('Arcadia Connected! Linking utility account...', 'info');
          try {
            const token = localStorage.getItem('footprint_auth_token');
            const res = await fetch(`${API_BASE}/integrations/arcadia/callback`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ authCode })
            });
            if (res.ok) {
              triggerToast('Utility Account linked successfully via Arcadia Connect widget!', 'success');

              await fetch(`${API_BASE}/webhooks/arcadia`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: user.id,
                  kwh: simArcadiaKwh
                })
              });
              setTimeout(() => fetchUser(user.id), 1500);
            }
          } catch (err) {
            console.error('Failed to link utility account:', err);
          }
        },
        onClose: () => {
          console.log('Arcadia Connect widget closed.');
        }
      });
      connect.open();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/webhooks/arcadia`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          kwh: simArcadiaKwh
        })
      });
      if (response.ok) {
        triggerToast(`Arcadia: Billing file ingestion queued. Processing...`, 'success');
        setTimeout(() => fetchUser(user.id), 1500);
      } else {
        throw new Error('Arcadia webhook returned non-200');
      }
    } catch {
      const computedCO2 = computeHousingCO2(simArcadiaKwh, 'standard');
      const newEvent: CarbonEvent = {
        id: crypto.randomUUID(),
        user_id: user.id,
        category: 'housing',
        source_provider: 'arcadia',
        raw_value: simArcadiaKwh,
        raw_unit: 'kWh',
        computed_co2e_kg: computedCO2,
        timestamp: new Date().toISOString()
      };
      setEvents(prev => [newEvent, ...prev]);

      const leavesAwarded = 15;
      const newLeaves = user.total_leaves + leavesAwarded;
      const newLevel = calculateLevel(newLeaves);
      const updatedUser = {
        ...user,
        total_leaves: newLeaves,
        current_level: newLevel
      };
      setUser(updatedUser);
      setLeaderboard(prev => {
        const updated = prev.map(m => m.userId === user.id ? { ...m, leaves: newLeaves, level: newLevel } : m);
        return [...updated].sort((a, b) => b.leaves - a.leaves);
      });
      triggerToast(`Local Mode: Simulated Arcadia billing event logged. Earned +${leavesAwarded} Leaves!`, 'success');
    } finally {
      setLoading(false);
    }
  };

  const triggerNestWebhook = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/webhooks/nest`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id
        })
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        triggerToast(`Nest SDM: Live ambient checked (${data.ambientTemperature}°C). Eco-Mode active: ${data.ecoModeActive ? 'Yes' : 'No'}. Earned +${data.leavesAwarded} Leaves!`, 'success');
        setTimeout(() => fetchUser(user.id), 500);
      } else {
        throw new Error('Nest webhook returned non-200');
      }
    } catch {
      const leavesAwarded = simNestEco ? 25 : 5;
      const newLeaves = user.total_leaves + leavesAwarded;
      const newLevel = calculateLevel(newLeaves);
      const updatedUser = {
        ...user,
        total_leaves: newLeaves,
        current_level: newLevel
      };
      setUser(updatedUser);
      setLeaderboard(prev => {
        const updated = prev.map(m => m.userId === user.id ? { ...m, leaves: newLeaves, level: newLevel } : m);
        return [...updated].sort((a, b) => b.leaves - a.leaves);
      });
      triggerToast(`Local Mode: Nest thermostat check verified. Nest Eco-Mode active: +${leavesAwarded} Leaves!`, 'success');
    } finally {
      setLoading(false);
    }
  };

  const calculateSimulatedFootprint = () => {
    const resolveClientRegionCode = (): string => {
      if (!user?.postal_code) return 'default';
      const clean = user.postal_code.trim();
      if (clean.startsWith('9')) return 'US-CA';
      if (clean.startsWith('6')) return 'US-MROW';
      if (clean.startsWith('11') || clean.startsWith('40') || clean.startsWith('70')) return 'IN-WR';
      return 'default';
    };

    const regionCode = resolveClientRegionCode();

    const housingCO2 = computeHousingCO2(6000, simHousing, regionCode) / 1000;
    const transportCO2 = computeTransportCO2(8000, simTransport) / 1000;
    const foodCO2 = computeFoodCO2(1095, simDiet) / 1000;

    const total = housingCO2 + transportCO2 + foodCO2;
    return {
      housing: parseFloat(housingCO2.toFixed(1)),
      transport: parseFloat(transportCO2.toFixed(1)),
      food: parseFloat(foodCO2.toFixed(1)),
      total: parseFloat(total.toFixed(1))
    };
  };

  const simFootprint = calculateSimulatedFootprint();
  const baselineTons = baseline ? parseFloat((baseline.total / 1000).toFixed(1)) : 15.0;
  const targetTons = parseFloat((baselineTons * 0.65).toFixed(1));
  const simReduction = parseFloat((baselineTons - simFootprint.total).toFixed(1));

  const getChartDataPoints = () => {
    if (events.length === 0) return [];
    const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const monthlyMap: Record<string, { housing: number; transport: number; food: number; total: number; label: string }> = {};

    sorted.forEach(e => {
      const date = new Date(e.timestamp);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const label = date.toLocaleDateString('default', { month: 'short' });

      if (!monthlyMap[key]) {
        monthlyMap[key] = { housing: 0, transport: 0, food: 0, total: 0, label };
      }

      monthlyMap[key][e.category] += e.computed_co2e_kg;
      monthlyMap[key].total += e.computed_co2e_kg;
    });

    return Object.values(monthlyMap);
  };

  const chartData = getChartDataPoints();

  return {
    user,
    baseline,
    loading,
    isCalibrating,
    setIsCalibrating,
    calibrationStep,
    displayName,
    setDisplayName,
    country,
    setCountry,
    postalCode,
    handleChangePostalCode,
    housingArchetype,
    setHousingArchetype,
    dietArchetype,
    setDietArchetype,
    commuteArchetype,
    setCommuteArchetype,
    events,
    chartViewMode,
    setChartViewMode,
    challenges,
    vouchers,
    simHousing,
    setSimHousing,
    simTransport,
    setSimTransport,
    simDiet,
    setSimDiet,
    toast,
    ecoSphereTab,
    setEcoSphereTab,
    leaderboard,
    coachInsights,
    recommendations,
    simRadarDistance,
    setSimRadarDistance,
    simRadarMode,
    setSimRadarMode,
    simArcadiaKwh,
    setSimArcadiaKwh,
    simNestEco,
    setSimNestEco,
    triggerToast,
    fetchUser,
    handleLogout,
    deleteCarbonEvent,
    triggerQuickLog,
    handleOnboarding,
    toggleChallengeDay,
    redeemVoucher,
    triggerRadarWebhook,
    triggerArcadiaWebhook,
    triggerNestWebhook,
    nextCalibrationStep,
    handleProgressiveProfileUpdate,
    simFootprint,
    baselineTons,
    targetTons,
    simReduction,
    chartData
  };
}
