import React, { useState, useEffect } from 'react';
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
  computeArchetypeBaseline,
  getCarbonEquivalentsDescription
} from '@footprint/carbon-math';
import Radar from 'radar-sdk-js';
import {
  Leaf,
  Activity,
  Calendar,
  Gift,
  CheckCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import './App.css';
import EcoSphere from './components/EcoSphere';
import QuickTracker from './components/QuickTracker';
import Simulator from './components/Simulator';
import ActivityLogs from './components/ActivityLogs';

const API_BASE = 'http://localhost:3001/api';

const COUNTRY_CONFIGS: Record<
  string,
  { name: string; numericOnly: boolean; pattern: string; placeholder: string; zipLength?: number }
> = {
  us: { name: 'United States', numericOnly: true, pattern: '^[0-9]{5}$', placeholder: 'Enter 5-digit ZIP code (e.g. 90210)', zipLength: 5 },
  in: { name: 'India', numericOnly: true, pattern: '^[0-9]{6}$', placeholder: 'Enter 6-digit PIN code (e.g. 110001)', zipLength: 6 },
  de: { name: 'Germany', numericOnly: true, pattern: '^[0-9]{5}$', placeholder: 'Enter 5-digit postal code (e.g. 10115)', zipLength: 5 },
  fr: { name: 'France', numericOnly: true, pattern: '^[0-9]{5}$', placeholder: 'Enter 5-digit postal code (e.g. 75001)', zipLength: 5 },
  ca: { name: 'Canada', numericOnly: false, pattern: '^[A-Za-z][0-9][A-Za-z]\\s?[0-9][A-Za-z][0-9]$', placeholder: 'Enter postal code (e.g. K1A 0B1)' },
  gb: { name: 'United Kingdom', numericOnly: false, pattern: '^[A-Za-z0-9\\s]{5,8}$', placeholder: 'Enter postal code (e.g. SW1A 1AA)' }
};

// Helper: Calculate user level from leaves
function calculateLevel(leaves: number): number {
  if (leaves < 100) return 1;
  if (leaves < 250) return 2;
  if (leaves < 500) return 3;
  if (leaves < 1000) return 4;
  return 5 + Math.floor((leaves - 1000) / 1000);
}

// Generate a random eco-friendly display name
function generateRandomEcoName(): string {
  const adjectives = [
    'Eco', 'Green', 'Wild', 'Forest', 'Mountain', 'Leafy', 'Sunny', 'River',
    'Wind', 'Solar', 'Mossy', 'Fern', 'Pine', 'Cedar', 'Sage', 'Clover'
  ];
  const nouns = [
    'Ranger', 'Guardian', 'Seedling', 'Sprout', 'Wanderer', 'Champion', 'Warrior',
    'Friend', 'Birch', 'Willow', 'Lily', 'Lotus', 'Breeze', 'Acorn', 'Sapling'
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${adj} ${noun} #${num}`;
}

interface AutoLocation {
  country: string;
  postalCode: string;
}

// Detect IP location silently without requesting GPS permission
async function detectIPLocation(): Promise<AutoLocation> {
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      if (data.postal && data.country_code) {
        return {
          country: data.country_code.toLowerCase(),
          postalCode: data.postal
        };
      }
    }
  } catch (e) {
    console.warn('IP Geolocation lookup failed, falling back to default location.', e);
  }
  return {
    country: 'us',
    postalCode: '90210'
  };
}

// getEventDetails helper function has been moved to components/ActivityLogs.tsx

export default function App() {
  // Authentication & Onboarding State
  const [user, setUser] = useState<User | null>(null);
  const [baseline, setBaseline] = useState<{ housing: number; transport: number; food: number; total: number } | null>(null);
  const [loading, setLoading] = useState(false);

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

  // Reset postal code when country changes to avoid validation mismatch
  useEffect(() => {
    setPostalCode('');
  }, [country]);

  // Restrict postal code input values based on country's numeric constraints
  const handleChangePostalCode = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const config = COUNTRY_CONFIGS[country];
    if (config.numericOnly) {
      // Only keep digit characters
      const numericVal = val.replace(/\D/g, '');
      if (config.zipLength && numericVal.length > config.zipLength) {
        return;
      }
      setPostalCode(numericVal);
    } else {
      // For alphanumeric, let's limit length to 10 characters max
      if (val.length <= 10) {
        setPostalCode(val);
      }
    }
  };
  const [dietArchetype, setDietArchetype] = useState<'vegan' | 'balanced' | 'meat'>('balanced');
  const [commuteArchetype, setCommuteArchetype] = useState<'transit' | 'hybrid' | 'gas'>('hybrid');

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
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [coachInsights, setCoachInsights] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Webhook simulator state
  const [simRadarDistance, setSimRadarDistance] = useState<number>(12);
  const [simRadarMode, setSimRadarMode] = useState<'suv' | 'gas_car' | 'hybrid' | 'ev' | 'transit'>('gas_car');
  const [simArcadiaKwh, setSimArcadiaKwh] = useState<number>(250);
  const [simNestEco, setSimNestEco] = useState<boolean>(true);

  // Local Storage load
  useEffect(() => {
    // Initialize Radar SDK for transit tracking
    Radar.initialize('prj_test_pk_0000000000000000000000000000000000000000');

    const cachedUserId = localStorage.getItem('footprint_user_id');
    const cachedBaseline = localStorage.getItem('footprint_baseline');
    if (cachedUserId) {
      fetchUser(cachedUserId);
      if (cachedBaseline) {
        setBaseline(JSON.parse(cachedBaseline));
      }
    } else {
      // Zero-friction silent registration on first load
      triggerFrictionlessOnboarding();
    }
  }, []);

  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch all user dashboard data
  const fetchUser = async (userId: string) => {
    setLoading(true);
    const token = localStorage.getItem('footprint_auth_token');
    const authHeaders = {
      'Authorization': `Bearer ${token}`
    };
    const fetchOpts = { headers: authHeaders, credentials: 'include' as RequestCredentials };
    try {
      // 1. Fetch User status
      const userRes = await fetch(`${API_BASE}/users/${userId}`, fetchOpts);
      if (!userRes.ok) throw new Error('User not found on server');
      const userData = await userRes.json();
      setUser(userData);
      localStorage.setItem('footprint_user_id', userId);

      // 2. Fetch history
      const historyRes = await fetch(`${API_BASE}/carbon-events/${userId}`, fetchOpts);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setEvents(historyData);
      }

      // 3. Fetch active challenges
      const challengesRes = await fetch(`${API_BASE}/challenges/${userId}`, fetchOpts);
      if (challengesRes.ok) {
        const challengesData = await challengesRes.json();
        setChallenges(challengesData);
      }

      // 4. Fetch vouchers
      const vouchersRes = await fetch(`${API_BASE}/vouchers/${userId}`, fetchOpts);
      if (vouchersRes.ok) {
        const vouchersData = await vouchersRes.json();
        setVouchers(vouchersData);
      }

      // 5. Fetch Eco-Leagues leaderboard
      const leagueRes = await fetch(`${API_BASE}/leagues/${userId}`, fetchOpts);
      if (leagueRes.ok) {
        const leagueData = await leagueRes.json();
        setLeaderboard(leagueData);
      }

      // 6. Fetch personalized AI insights
      const insightsRes = await fetch(`${API_BASE}/users/${userId}/insights`, fetchOpts);
      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        setCoachInsights(insightsData.insights);
        setRecommendations(insightsData.recommendations);
      }
    } catch (e: any) {
      console.warn('Backend server connection failed. Falling back to simulated local state.');
      // Local Fallback simulation for offline testing
      simulateOfflineState(userId);
    } finally {
      setLoading(false);
    }
  };

  // Logout: clear cookie on server and reset client state
  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch {
      // Ignore network errors — still clear local state
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

  // Delete a carbon event log (online or offline fallback)
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

      // Deduct leaves locally and update level
      if (data.user) {
        setUser(data.user);
      }

      // Remove event from state
      setEvents(prev => prev.filter(e => e.id !== eventId));

      // Re-fetch user to make sure standings/leaderboards/challenges are synced
      if (user) {
        fetchUser(user.id);
      }

      triggerToast(`Carbon event deleted. -${data.leavesDeducted} Leaves deducted.`, 'success');
    } catch (err) {
      console.warn('API error during deletion. Simulating deletion locally.');

      // Find the event in our local state to determine category and values
      const eventToDelete = events.find(e => e.id === eventId);
      if (!eventToDelete) {
        triggerToast('Event not found.', 'error');
        setLoading(false);
        return;
      }

      // Calculate how many leaves should be deducted locally
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

        // Update leaderboard
        setLeaderboard(prev => {
          const updated = prev.map(m => m.userId === user.id ? { ...m, leaves: newLeaves, level: newLevel } : m);
          return [...updated].sort((a, b) => b.leaves - a.leaves);
        });
      }

      // Remove event from state
      setEvents(prev => prev.filter(e => e.id !== eventId));
      triggerToast(`Local Mode: Carbon event deleted. -${leavesDeducted} Leaves deducted.`, 'info');
    } finally {
      setLoading(false);
    }
  };

  // Offline Simulation Mode (highly robust testing fallback)
  const simulateOfflineState = (userId: string) => {
    const mockUser: User = {
      id: userId,
      display_name: displayName || 'Eco Champion',
      current_level: 1,
      total_leaves: 120,
      postal_code: postalCode || '90210',
      created_at: new Date().toISOString()
    };
    setUser(mockUser);

    const mockBaseline = computeArchetypeBaseline({
      housing: housingArchetype,
      diet: dietArchetype,
      commute: commuteArchetype
    });
    setBaseline(mockBaseline);
    localStorage.setItem('footprint_baseline', JSON.stringify(mockBaseline));

    // Simulate 6 months of historical events
    const mockEvents: CarbonEvent[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const ts = new Date(now.getFullYear(), now.getMonth() - i, 15).toISOString();
      mockEvents.push({
        id: `m-h-${i}`,
        user_id: userId,
        category: 'housing',
        source_provider: 'manual',
        raw_value: mockBaseline.housing / 12,
        raw_unit: 'kWh',
        computed_co2e_kg: parseFloat((mockBaseline.housing / 12 * 0.38).toFixed(1)),
        timestamp: ts
      });
      mockEvents.push({
        id: `m-t-${i}`,
        user_id: userId,
        category: 'transport',
        source_provider: 'manual',
        raw_value: mockBaseline.transport / 12,
        raw_unit: 'miles',
        computed_co2e_kg: parseFloat((mockBaseline.transport / 12 * 0.3).toFixed(1)),
        timestamp: ts
      });
      mockEvents.push({
        id: `m-f-${i}`,
        user_id: userId,
        category: 'food',
        source_provider: 'manual',
        raw_value: 90,
        raw_unit: 'meals',
        computed_co2e_kg: parseFloat((90 * (dietArchetype === 'vegan' ? 0.5 : dietArchetype === 'meat' ? 3.0 : 1.5)).toFixed(1)),
        timestamp: ts
      });
    }
    setEvents(mockEvents);

    // Initial challenges setup
    setChallenges([
      {
        id: `cw-${userId}`,
        userId,
        type: 'cold-wash',
        title: 'The Cold-Wash Campaign 🧺',
        description: 'Run all laundry washes using cold water settings for 7 consecutive days.',
        rewardLeaves: 100,
        targetDays: 7,
        currentStreak: 0,
        completed: false,
        progressLogs: [false, false, false, false, false, false, false],
        rewardApplied: false,
        updatedAt: now.toISOString()
      },
      {
        id: `vh-${userId}`,
        userId,
        type: 'vampire-hunt',
        title: 'The Vampire Hunt 🧛‍♂️',
        description: 'Disconnect 3 standby home electronics (consoles, idle chargers, secondary displays) before sleeping for 7 consecutive days.',
        rewardLeaves: 120,
        targetDays: 7,
        currentStreak: 0,
        completed: false,
        progressLogs: [false, false, false, false, false, false, false],
        rewardApplied: false,
        updatedAt: now.toISOString()
      }
    ]);

    // Initial local mock leaderboard setup
    const mockLeague = [
      { id: 'user-id', userId, username: displayName || 'Eco Champion', leaves: mockUser.total_leaves, level: mockUser.current_level, isMock: false },
      ...Array.from({ length: 29 }, (_, idx) => {
        const names = [
          'Ivy Green', 'Moss Ranger', 'Fern Forest', 'Pine Seedling', 'Sage Leaf',
          'Willow Branch', 'Cedar Sprout', 'Olive Grove', 'Emerald Spark', 'Hazel Nut',
          'Forest Shade', 'Meadow Grass', 'Clover Patch', 'Bamboo Stem', 'Laurel Wreath',
          'Birch Bark', 'Maple Syrup', 'Oak Acorn', 'Heather Bloom', 'Lily Pad',
          'Flora Eco', 'Sprout Master', 'Herb Garden', 'Lichen Rock', 'Sequoia Giant',
          'Bonsai Caret', 'Lotus Petal', 'Minty Fresh', 'Basil Sweet'
        ];
        // seed leaves between 50 and 600
        const leaves = Math.floor(50 + (idx * 17.5) + Math.random() * 20);
        return {
          id: `mock-l-${idx}`,
          userId: `mock-u-${idx}`,
          username: names[idx] || `Eco Competitor ${idx}`,
          leaves,
          level: calculateLevel(leaves),
          isMock: true
        };
      })
    ];
    mockLeague.sort((a, b) => b.leaves - a.leaves);
    setLeaderboard(mockLeague);

    // Simulate insights and micro-actions offline
    const simulatedInsights = [
      `💡 Your simulated transit emissions are ${commuteArchetype === 'gas' ? 'above average' : 'optimized'}. Try public transit commutes to reduce it.`,
      `🥗 Your diet choices are set to '${dietArchetype}'. Transitioning to plant-based meals cuts food footprint by 60%.`,
      `🏠 Your home grid setup is '${housingArchetype}'. Smart Nest thermostats can shave off up to 15% of annual heating.`
    ];
    setCoachInsights(simulatedInsights);

    const simulatedRecs = [
      {
        id: 'rec-vegan-1',
        title: 'Eat a Plant-Based Meal 🥗',
        description: 'Replace standard animal proteins with a plant-based alternative for one meal today.',
        category: 'food' as const,
        type: 'vegan',
        value: 1,
        unit: 'meals',
        impactKg: 1.0,
        rewardLeaves: 25
      },
      {
        id: 'rec-transit-5',
        title: 'Ditch the Drive (5 mi) 🚲',
        description: 'Take public transit, walk, or bike for 5 miles instead of driving a gas car.',
        category: 'transport' as const,
        type: 'transit',
        value: 5,
        unit: 'miles',
        impactKg: 1.5,
        rewardLeaves: 30
      },
      {
        id: 'rec-solar-15',
        title: 'Clean Solar Generation (15 kWh) ☀️',
        description: 'Log 15 kWh of clean electricity generated from household solar panel systems.',
        category: 'housing' as const,
        type: 'solar',
        value: 15,
        unit: 'kWh',
        impactKg: 5.7,
        rewardLeaves: 35
      }
    ];
    setRecommendations(simulatedRecs);
  };

  // Trigger zero-friction silent registration on first load
  const triggerFrictionlessOnboarding = async () => {
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
    } catch (err) {
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
  };

  // Progressive profile patch updates
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
    } catch (err) {
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

  // Calibration survey progressive steps handler
  const nextCalibrationStep = (stepPayload?: any) => {
    if (stepPayload) {
      if (stepPayload.housing) setHousingArchetype(stepPayload.housing);
      if (stepPayload.diet) setDietArchetype(stepPayload.diet);
      if (stepPayload.commute) setCommuteArchetype(stepPayload.commute);

      const nextHousing = stepPayload.housing || housingArchetype;
      const nextDiet = stepPayload.diet || dietArchetype;
      const nextCommute = stepPayload.commute || commuteArchetype;

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

  // One-Click Quick Log trigger
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
    } catch (err) {
      console.warn('API error. Executing quick log locally in sandbox.');
      // Local fallback simulation
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

      // Award leaves local mock
      let leavesAwarded = 15;
      if (category === 'transport' && (modeOrOption === 'ev' || modeOrOption === 'transit')) {
        leavesAwarded += 15;
      } else if (category === 'food' && modeOrOption === 'vegan') {
        leavesAwarded += 10;
      } else if (category === 'housing' && modeOrOption === 'solar') {
        leavesAwarded += 20;
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
      triggerToast(`Local Mode: Quick logged! Earned +${leavesAwarded} Leaves.`, 'success');
    } finally {
      setLoading(false);
    }
  };

  // Submit onboarding form
  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName) return;

    const cleanCode = postalCode.trim();
    if (cleanCode) {
      const config = COUNTRY_CONFIGS[country];
      const localRegex = new RegExp(config.pattern);

      // Local sanity check on pattern first
      if (!localRegex.test(cleanCode)) {
        triggerToast(`Please enter a valid postal code format for ${config.name}.`, 'error');
        return;
      }

      setLoading(true);
      try {
        // Query external APIs to verify the postal code is real
        const apiCode = cleanCode.replace(/\s+/g, '').toLowerCase();
        let isValid = false;

        if (country === 'in') {
          // Use official Indian Postal PIN Code API for 100% complete coverage
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
          // Use Zippopotam.us for other supported countries
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
        // Robust fallback: if API fails (network offline), we trust the regex format match
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

      // Fetch other data
      fetchUser(data.user.id);
    } catch (err: any) {
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

        // Update challenges state
        setChallenges(challenges.map(c => c.type === challengeType ? data.challenge : c));

        if (data.rewardAwarded) {
          triggerToast(`Streak Complete! Challenge Finished. Earned +${data.leavesAwarded} Leaves! 🏆`, 'success');
        } else {
          triggerToast(`Day ${dayIndex + 1} logged for ${challengeType === 'cold-wash' ? 'Cold-Wash' : 'Vampire Hunt'}.`);
        }
      } else {
        throw new Error('Failed to update challenge');
      }
    } catch (err) {
      // Offline fallback toggle
      const challenge = challenges.find(c => c.type === challengeType);
      if (challenge) {
        const updatedLogs = [...challenge.progressLogs];
        updatedLogs[dayIndex] = !currentCompleted;

        let currentStreak = 0;
        for (const log of updatedLogs) {
          if (log) currentStreak++;
          else break;
        }

        const isCompleted = updatedLogs.filter(Boolean).length === 7;
        let rewardAwarded = false;
        let leavesAwarded = 0;
        let updatedUser = { ...user };

        if (isCompleted && !challenge.rewardApplied) {
          rewardAwarded = true;
          leavesAwarded = challenge.rewardLeaves;
          updatedUser.total_leaves += leavesAwarded;
          updatedUser.current_level = calculateLevel(updatedUser.total_leaves);
        }

        const updatedChallenge: Challenge = {
          ...challenge,
          progressLogs: updatedLogs,
          currentStreak,
          completed: isCompleted,
          rewardApplied: isCompleted || challenge.rewardApplied
        };

        setChallenges(challenges.map(c => c.type === challengeType ? updatedChallenge : c));
        setUser(updatedUser);

        if (rewardAwarded) {
          const newLeaves = updatedUser.total_leaves;
          const newLevel = updatedUser.current_level;
          setLeaderboard(prev => {
            const updated = prev.map(m => m.userId === user.id ? { ...m, leaves: newLeaves, level: newLevel } : m);
            return [...updated].sort((a, b) => b.leaves - a.leaves);
          });
          triggerToast(`Local Mode: Challenge Completed! Earned +${leavesAwarded} Leaves! 🏆`, 'success');
        } else {
          triggerToast(`Local Mode: Toggled Day ${dayIndex + 1}.`);
        }
      }
    }
  };

  // Redeem leaves points for sponsorship voucher rewards
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

        // Refresh vouchers
        fetchUser(user.id);
        triggerToast(`Success! Redeemed ${costLeaves} Leaves for ${sponsorName} reward.`, 'success');
      } else {
        throw new Error('Failed to redeem voucher');
      }
    } catch (err) {
      // Offline fallback
      const newLeaves = user.total_leaves - costLeaves;
      const newLevel = calculateLevel(newLeaves);
      const updatedUser = {
        ...user,
        total_leaves: newLeaves,
        current_level: newLevel
      };

      const codeSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = rewardType === 'discount'
        ? `OATLY-15-${codeSuffix}`
        : rewardType === 'plug'
          ? `ARCADIA-PLUG-${codeSuffix}`
          : undefined;

      const newVoucher: Voucher = {
        id: crypto.randomUUID(),
        userId: user.id,
        sponsorName,
        title: rewardType === 'tree' ? 'Eden Projects tree planting' : rewardType === 'discount' ? '15% Off Oatly Products' : 'Smart Utility energy plug',
        description: rewardType === 'tree' ? '1 physical tree has been funded in your name.' : rewardType === 'discount' ? 'Get 15% discount checkout coupon code funded by Oatly.' : 'A complimentary Smart Energy plug delivered to your doorstep.',
        rewardType,
        couponCode: code,
        costLeaves,
        redeemedAt: new Date().toISOString()
      };

      setVouchers([newVoucher, ...vouchers]);
      setUser(updatedUser);
      setLeaderboard(prev => {
        const updated = prev.map(m => m.userId === user.id ? { ...m, leaves: newLeaves, level: newLevel } : m);
        return [...updated].sort((a, b) => b.leaves - a.leaves);
      });
      triggerToast(`Local Mode: Redeemed ${costLeaves} Leaves successfully!`, 'success');
    }
  };


  // Trigger Radar Webhook (with actual location tracking)
  const triggerRadarWebhook = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Call Radar.io SDK to track coordinates via Promise
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
    } catch (err) {
      // Local fallback simulation
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

  // Trigger Arcadia Connect Widget & Callback
  const triggerArcadiaWebhook = async () => {
    if (!user) return;

    // Launch Arcadia Connect Widget if loaded
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

              // Trigger utility webhook ingestion
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

    // Fallback if widget script is not active/loaded
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
    } catch (err) {
      // Local fallback simulation
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

  // Trigger Nest Webhook
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
    } catch (err) {
      // Local fallback simulation
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

  // Interactive Simulator calculations based on current options
  const calculateSimulatedFootprint = () => {
    // Standard scales:
    // Housing base kWh/year is 6000
    // Transport base miles/year is 8000
    // Food base meals/year is 3 * 365 = 1095 meals
    const housingCO2 = computeHousingCO2(6000, simHousing) / 1000; // in Metric Tons
    const transportCO2 = computeTransportCO2(8000, simTransport) / 1000; // in Metric Tons
    const foodCO2 = computeFoodCO2(1095, simDiet) / 1000; // in Metric Tons

    const total = housingCO2 + transportCO2 + foodCO2;
    return {
      housing: parseFloat(housingCO2.toFixed(1)),
      transport: parseFloat(transportCO2.toFixed(1)),
      food: parseFloat(foodCO2.toFixed(1)),
      total: parseFloat(total.toFixed(1))
    };
  };

  const simFootprint = calculateSimulatedFootprint();
  // Target: 10.0 Tons, or 60% of their baseline
  const baselineTons = baseline ? parseFloat((baseline.total / 1000).toFixed(1)) : 15.0;
  const targetTons = parseFloat((baselineTons * 0.65).toFixed(1));
  const simReduction = parseFloat((baselineTons - simFootprint.total).toFixed(1));
  // filteredEvents and renderEcoSphere have been moved to subcomponents.

  // Group historical events for chart visualization
  const getChartDataPoints = () => {
    if (events.length === 0) return [];

    // Sort events chronological
    const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Group by month
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

  // Render Onboarding Screen if user is not set
  if (!user) {
    return (
      <div className="app-container">
        <header>
          <div className="logo"><Leaf size={24} color="hsl(150, 90%, 60%)" /> Footprint</div>
        </header>

        <div className="onboarding-container">
          <h1 className="onboarding-title">Replace carbon guilt with action.</h1>
          <p className="onboarding-subtitle">Estimate your context-aware environmental baseline in 90 seconds.</p>

          <form onSubmit={handleOnboarding} className="onboarding-card glass-panel">
            <div className="input-group">
              <label htmlFor="name-input">Display Name</label>
              <input
                id="name-input"
                type="text"
                placeholder="How should we call you?"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="country-select">Country</label>
              <select
                id="country-select"
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="input-field"
                style={{ appearance: 'none', background: 'var(--bg-dark)', color: 'var(--text-main)', cursor: 'pointer' }}
              >
                {Object.entries(COUNTRY_CONFIGS).map(([code, config]) => (
                  <option key={code} value={code}>
                    {config.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="zip-input">Postal / Zip Code</label>
              <input
                id="zip-input"
                type="text"
                placeholder={COUNTRY_CONFIGS[country].placeholder}
                value={postalCode}
                onChange={handleChangePostalCode}
                className="input-field"
              />
            </div>

            <div className="archetype-section">
              <h3>1. Housing Infrastructure</h3>
              <div className="grid-selector">
                <div
                  className={`selector-option ${housingArchetype === 'apartment' ? 'selected' : ''}`}
                  onClick={() => setHousingArchetype('apartment')}
                >
                  <span className="icon">🏢</span>
                  <span className="option-label">City Apartment</span>
                  <span className="option-desc">Shared walls, low heating requirements</span>
                </div>
                <div
                  className={`selector-option ${housingArchetype === 'townhouse' ? 'selected' : ''}`}
                  onClick={() => setHousingArchetype('townhouse')}
                >
                  <span className="icon">🏡</span>
                  <span className="option-label">Townhouse</span>
                  <span className="option-desc">Moderate spacing and utility use</span>
                </div>
                <div
                  className={`selector-option ${housingArchetype === 'family' ? 'selected' : ''}`}
                  onClick={() => setHousingArchetype('family')}
                >
                  <span className="icon">🏰</span>
                  <span className="option-label">Single Family</span>
                  <span className="option-desc">Detached setup, high heating/cooling</span>
                </div>
              </div>
            </div>

            <div className="archetype-section">
              <h3>2. Commute & Transit</h3>
              <div className="grid-selector">
                <div
                  className={`selector-option ${commuteArchetype === 'transit' ? 'selected' : ''}`}
                  onClick={() => setCommuteArchetype('transit')}
                >
                  <span className="icon">🚲</span>
                  <span className="option-label">Transit / Bike</span>
                  <span className="option-desc">Subway, bus, cycle, walking options</span>
                </div>
                <div
                  className={`selector-option ${commuteArchetype === 'hybrid' ? 'selected' : ''}`}
                  onClick={() => setCommuteArchetype('hybrid')}
                >
                  <span className="icon">🔌</span>
                  <span className="option-label">Hybrid / EV</span>
                  <span className="option-desc">Partially electrified or highly efficient</span>
                </div>
                <div
                  className={`selector-option ${commuteArchetype === 'gas' ? 'selected' : ''}`}
                  onClick={() => setCommuteArchetype('gas')}
                >
                  <span className="icon">🚗</span>
                  <span className="option-label">SUV / Sedan</span>
                  <span className="option-desc">Standard internal combustion engine</span>
                </div>
              </div>
            </div>

            <div className="archetype-section">
              <h3>3. Dietary Choices</h3>
              <div className="grid-selector">
                <div
                  className={`selector-option ${dietArchetype === 'vegan' ? 'selected' : ''}`}
                  onClick={() => setDietArchetype('vegan')}
                >
                  <span className="icon">🥗</span>
                  <span className="option-label">Plant-Forward</span>
                  <span className="option-desc">Vegan or low-dairy vegetarian diets</span>
                </div>
                <div
                  className={`selector-option ${dietArchetype === 'balanced' ? 'selected' : ''}`}
                  onClick={() => setDietArchetype('balanced')}
                >
                  <span className="icon">🍗</span>
                  <span className="option-label">Balanced</span>
                  <span className="option-desc">White meats, grains, low red meat</span>
                </div>
                <div
                  className={`selector-option ${dietArchetype === 'meat' ? 'selected' : ''}`}
                  onClick={() => setDietArchetype('meat')}
                >
                  <span className="icon">🥩</span>
                  <span className="option-label">Meat Enthusiast</span>
                  <span className="option-desc">Regular beef, pork, dairy heavy</span>
                </div>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Generating eco-profile...' : 'Generate My Eco-Sphere'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render Main Dashboard
  return (
    <div className="app-container">
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 1000,
          background: toast.type === 'success' ? 'var(--success)' : toast.type === 'error' ? 'var(--danger)' : 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          padding: '12px 20px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          animation: 'slideIn 0.3s ease'
        }}>
          <CheckCircle size={18} />
          {toast.message}
        </div>
      )}

      <header>
        <div className="logo">
          <Leaf size={24} color="hsl(150, 90%, 60%)" />
          <span>Footprint</span>
        </div>

        <div className="user-status-widget">
          <div className="leaves-badge glow-leaves">
            <Leaf size={16} fill="var(--leaves-xp)" />
            <span>{user.total_leaves} Leaves</span>
          </div>
          <div className="level-badge">
            Level {user.current_level}
          </div>
          <button onClick={handleLogout} className="btn-secondary" title="Logout" style={{ padding: '6px 10px' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      {isCalibrating && user && (
        <div className="panel-card glass-panel calibration-widget-container" style={{ margin: '0 24px 24px 24px', padding: '24px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
              <Leaf size={20} fill="var(--primary)" /> Calibrate Your Carbon Footprint (Step {calibrationStep}/4)
            </h3>
            <button
              onClick={() => {
                setIsCalibrating(false);
                localStorage.setItem('footprint_calibration_completed', 'true');
              }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
            >
              Skip Setup
            </button>
          </div>

          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginBottom: '20px', overflow: 'hidden' }}>
            <div style={{ width: `${(calibrationStep / 4) * 100}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }} />
          </div>

          {calibrationStep === 1 && (
            <div>
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                What type of home infrastructure best represents your living situation? This sets your housing baseline.
              </p>
              <div className="grid-selector" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div
                  className={`selector-option ${housingArchetype === 'apartment' ? 'selected' : ''}`}
                  onClick={() => nextCalibrationStep({ housing: 'apartment' })}
                  style={{ cursor: 'pointer', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', transition: 'all 0.2s' }}
                >
                  <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🏢</span>
                  <strong style={{ display: 'block', fontSize: '14px' }}>City Apartment</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Shared walls, low utility load</span>
                </div>
                <div
                  className={`selector-option ${housingArchetype === 'townhouse' ? 'selected' : ''}`}
                  onClick={() => nextCalibrationStep({ housing: 'townhouse' })}
                  style={{ cursor: 'pointer', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', transition: 'all 0.2s' }}
                >
                  <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🏡</span>
                  <strong style={{ display: 'block', fontSize: '14px' }}>Townhouse</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Moderate spacing and utilities</span>
                </div>
                <div
                  className={`selector-option ${housingArchetype === 'family' ? 'selected' : ''}`}
                  onClick={() => nextCalibrationStep({ housing: 'family' })}
                  style={{ cursor: 'pointer', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', transition: 'all 0.2s' }}
                >
                  <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🏰</span>
                  <strong style={{ display: 'block', fontSize: '14px' }}>Single Family Home</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Detached, higher heating load</span>
                </div>
              </div>
            </div>
          )}

          {calibrationStep === 2 && (
            <div>
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                How would you describe your typical dietary choices? Food accounts for up to a third of personal emissions.
              </p>
              <div className="grid-selector" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div
                  className={`selector-option ${dietArchetype === 'vegan' ? 'selected' : ''}`}
                  onClick={() => nextCalibrationStep({ diet: 'vegan' })}
                  style={{ cursor: 'pointer', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', transition: 'all 0.2s' }}
                >
                  <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🥗</span>
                  <strong style={{ display: 'block', fontSize: '14px' }}>Plant-Forward</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Vegan or vegetarian baseline</span>
                </div>
                <div
                  className={`selector-option ${dietArchetype === 'balanced' ? 'selected' : ''}`}
                  onClick={() => nextCalibrationStep({ diet: 'balanced' })}
                  style={{ cursor: 'pointer', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', transition: 'all 0.2s' }}
                >
                  <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🍗</span>
                  <strong style={{ display: 'block', fontSize: '14px' }}>Balanced</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>White meat, grains, low red meat</span>
                </div>
                <div
                  className={`selector-option ${dietArchetype === 'meat' ? 'selected' : ''}`}
                  onClick={() => nextCalibrationStep({ diet: 'meat' })}
                  style={{ cursor: 'pointer', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', transition: 'all 0.2s' }}
                >
                  <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🥩</span>
                  <strong style={{ display: 'block', fontSize: '14px' }}>Meat Enthusiast</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Regular beef, pork, dairy heavy</span>
                </div>
              </div>
            </div>
          )}

          {calibrationStep === 3 && (
            <div>
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                How do you typically commute or travel? Transport represents the largest source of transit emissions.
              </p>
              <div className="grid-selector" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div
                  className={`selector-option ${commuteArchetype === 'transit' ? 'selected' : ''}`}
                  onClick={() => nextCalibrationStep({ commute: 'transit' })}
                  style={{ cursor: 'pointer', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', transition: 'all 0.2s' }}
                >
                  <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🚲</span>
                  <strong style={{ display: 'block', fontSize: '14px' }}>Transit / Bike / Walk</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Subway, bus, active modes</span>
                </div>
                <div
                  className={`selector-option ${commuteArchetype === 'hybrid' ? 'selected' : ''}`}
                  onClick={() => nextCalibrationStep({ commute: 'hybrid' })}
                  style={{ cursor: 'pointer', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', transition: 'all 0.2s' }}
                >
                  <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🔌</span>
                  <strong style={{ display: 'block', fontSize: '14px' }}>Hybrid / EV</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Efficient electric/hybrid vehicle</span>
                </div>
                <div
                  className={`selector-option ${commuteArchetype === 'gas' ? 'selected' : ''}`}
                  onClick={() => nextCalibrationStep({ commute: 'gas' })}
                  style={{ cursor: 'pointer', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', transition: 'all 0.2s' }}
                >
                  <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🚗</span>
                  <strong style={{ display: 'block', fontSize: '14px' }}>SUV / Sedan</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Standard gas-powered vehicle</span>
                </div>
              </div>
            </div>
          )}

          {calibrationStep === 4 && (
            <div>
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                Customize your display name and location to wrap up calibration. We auto-detected these from your IP.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px', marginBottom: '20px' }}>
                <div className="input-group" style={{ margin: 0 }}>
                  <label htmlFor="calibrate-name">Display Name</label>
                  <input
                    id="calibrate-name"
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div className="input-group" style={{ margin: 0 }}>
                  <label htmlFor="calibrate-zip">Postal / Zip Code</label>
                  <input
                    id="calibrate-zip"
                    type="text"
                    value={postalCode}
                    onChange={handleChangePostalCode}
                    className="input-field"
                  />
                </div>
              </div>
              <button
                type="button"
                className="btn-primary"
                style={{ width: 'auto', padding: '10px 24px' }}
                onClick={async () => {
                  const cleanCode = postalCode.trim();
                  if (cleanCode) {
                    const config = COUNTRY_CONFIGS[country];
                    const localRegex = new RegExp(config.pattern);
                    if (!localRegex.test(cleanCode)) {
                      triggerToast(`Please enter a valid postal code for ${config.name}.`, 'error');
                      return;
                    }
                  }
                  await handleProgressiveProfileUpdate({
                    displayName,
                    postalCode
                  });
                  setIsCalibrating(false);
                  localStorage.setItem('footprint_calibration_completed', 'true');
                  triggerToast('Calibration complete! Eco-Sphere updated.', 'success');
                }}
              >
                Finish Calibration!
              </button>
            </div>
          )}
        </div>
      )}

      <div className="dashboard-grid">
        {/* Left Side: Carbon Stats, Simulator, History chart */}
        <div className="left-panel">

          {/* Carbon Trajectory Panel */}
          <div className="panel-card glass-panel">
            <div className="trajectory-header">
              <div>
                <span className="simulator-title" style={{ fontSize: '12px' }}>Projected Annual Trajectory</span>
                <div className="trajectory-value">
                  {simFootprint.total} <span>Tons CO2e / Yr</span>
                </div>
              </div>
              <div className="target-info">
                <div>Target: <strong>{targetTons} Tons</strong></div>
                <div>Baseline: {baselineTons} Tons</div>
              </div>
            </div>

            <div className="trajectory-progress-container">
              <div className="progress-bar-container" style={{ height: '14px' }}>
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${Math.min(100, (simFootprint.total / baselineTons) * 100)}%`,
                    background: simFootprint.total <= targetTons
                      ? 'linear-gradient(90deg, var(--primary), var(--accent))'
                      : 'linear-gradient(90deg, var(--warning), var(--danger))'
                  }}
                />
              </div>
              <div className="trajectory-sub-bar">
                <span>Eco Warrior (0T)</span>
                <span>Target ({targetTons}T)</span>
                <span>Onboarding Baseline ({baselineTons}T)</span>
              </div>
            </div>

            {simReduction > 0 ? (
              <div className="projected-reduction-banner" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span className="reduction-label">Projected Annual Reduction:</span>
                  <span className="reduction-value">-{simReduction} Tons/Yr</span>
                </div>
                <div style={{ fontSize: '11px', opacity: 0.85, color: 'var(--accent)', marginTop: '4px', textAlign: 'left' }}>
                  🌿 {getCarbonEquivalentsDescription(simReduction * 1000)}
                </div>
              </div>
            ) : (
              <div className="projected-reduction-banner" style={{ background: 'hsla(346, 84%, 61%, 0.1)', borderColor: 'var(--danger)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span className="reduction-label" style={{ color: 'var(--danger)' }}>Above Onboarding Target:</span>
                  <span className="reduction-value" style={{ color: 'var(--danger)' }}>+{Math.abs(simReduction)} Tons/Yr</span>
                </div>
                <div style={{ fontSize: '11px', opacity: 0.85, color: 'var(--danger)', marginTop: '4px', textAlign: 'left' }}>
                  ⚠️ Try using the Simulator below to lower your annual projected trajectory.
                </div>
              </div>
            )}
          </div>

          {/* Interactive Life Swap Simulator */}
          <Simulator
            simHousing={simHousing}
            setSimHousing={setSimHousing}
            simTransport={simTransport}
            setSimTransport={setSimTransport}
            simDiet={simDiet}
            setSimDiet={setSimDiet}
            housingImpact={simFootprint.housing}
            transportImpact={simFootprint.transport}
            foodImpact={simFootprint.food}
          />

          {/* AI Climate Coach & Recommendations Card */}
          <div className="panel-card glass-panel" style={{ background: 'linear-gradient(135deg, hsla(142, 70%, 45%, 0.1) 0%, hsla(224, 45%, 12%, 0.85) 100%)', border: '1px solid rgba(16, 185, 129, 0.25)', marginBottom: '4px' }}>
            <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="var(--primary)" /> AI Climate Coach
            </h2>

            {/* Insights Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {coachInsights.map((insight, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderLeft: '3px solid var(--primary)',
                    padding: '10px 14px',
                    borderRadius: '0 8px 8px 0',
                    fontSize: '13px',
                    color: 'var(--text-muted)',
                    lineHeight: '1.4',
                    textAlign: 'left'
                  }}
                >
                  {insight}
                </div>
              ))}
            </div>

            {/* Recommendations Section */}
            {recommendations.length > 0 && (
              <div>
                <span className="simulator-title" style={{ fontSize: '11px', display: 'block', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>
                  Recommended Micro-Actions
                </span>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {recommendations.map(rec => {
                    let badgeBg = 'rgba(255,255,255,0.05)';
                    let badgeColor = 'var(--text-muted)';

                    if (rec.category === 'housing') {
                      badgeBg = 'rgba(16, 185, 129, 0.1)';
                      badgeColor = 'hsl(150, 90%, 65%)';
                    } else if (rec.category === 'transport') {
                      badgeBg = 'rgba(59, 130, 246, 0.1)';
                      badgeColor = 'hsl(217, 91%, 65%)';
                    } else if (rec.category === 'food') {
                      badgeBg = 'rgba(251, 191, 36, 0.1)';
                      badgeColor = 'hsl(45, 100%, 55%)';
                    }

                    return (
                      <div
                        key={rec.id}
                        style={{
                          background: 'rgba(0, 0, 0, 0.2)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '10px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          textAlign: 'left',
                          transition: 'all 0.2s ease'
                        }}
                        className="rec-action-card"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                          <div>
                            <strong style={{ fontSize: '14px', color: 'var(--text-main)', display: 'block' }}>
                              {rec.title}
                            </strong>
                            <span style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', marginTop: '3px' }}>
                              {rec.description}
                            </span>
                          </div>

                          <span style={{
                            fontSize: '10px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: badgeBg,
                            color: badgeColor,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            flexShrink: 0
                          }}>
                            {rec.category}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}>
                              🍃 Avoids {rec.impactKg} kg CO2e
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--leaves-xp)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                              +{rec.rewardLeaves} <Leaf size={12} fill="var(--leaves-xp)" style={{ display: 'inline' }} />
                            </span>
                          </div>

                          <button
                            type="button"
                            className="btn-primary"
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              borderRadius: '6px',
                              width: 'auto',
                              margin: 0,
                              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                              boxShadow: 'none'
                            }}
                            onClick={() => triggerQuickLog(rec.category, rec.type, rec.value, rec.unit)}
                            disabled={loading}
                          >
                            Log Action
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Historical Trend Chart */}
          <div className="panel-card glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="panel-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={20} color="var(--primary)" /> Emitted Carbon Trend
              </h2>
              {chartData.length > 0 && (
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '2px' }}>
                  <button
                    type="button"
                    onClick={() => setChartViewMode('total')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      background: chartViewMode === 'total' ? 'var(--primary)' : 'transparent',
                      color: chartViewMode === 'total' ? 'white' : 'var(--text-dim)',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                  >
                    Total
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartViewMode('breakdown')}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      background: chartViewMode === 'breakdown' ? 'var(--primary)' : 'transparent',
                      color: chartViewMode === 'breakdown' ? 'white' : 'var(--text-dim)',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                  >
                    Breakdown
                  </button>
                </div>
              )}
            </div>

            {chartData.length > 0 ? (
              <div>
                <div className="chart-container">
                  <svg className="chart-svg" viewBox="0 0 400 200">
                    <defs>
                      <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="housingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="hsl(150, 90%, 60%)" />
                        <stop offset="100%" stopColor="hsl(142, 70%, 40%)" />
                      </linearGradient>
                      <linearGradient id="transportGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="hsl(217, 91%, 65%)" />
                        <stop offset="100%" stopColor="hsl(224, 80%, 50%)" />
                      </linearGradient>
                      <linearGradient id="foodGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="hsl(45, 100%, 55%)" />
                        <stop offset="100%" stopColor="hsl(34, 97%, 45%)" />
                      </linearGradient>
                    </defs>

                    {/* Grid Lines */}
                    <line x1="40" y1="20" x2="380" y2="20" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4" />
                    <line x1="40" y1="80" x2="380" y2="80" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4" />
                    <line x1="40" y1="140" x2="380" y2="140" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4" />

                    {/* Chart Rendering */}
                    {chartViewMode === 'total' ? (
                      (() => {
                        const maxVal = Math.max(...chartData.map(d => d.total), 1);
                        const coords = chartData.map((d, index) => {
                          const x = 40 + (index / (chartData.length - 1 || 1)) * 340;
                          const y = 170 - (d.total / maxVal) * 140;
                          return { x, y, label: d.label, val: d.total };
                        });

                        const pathD = coords.reduce((acc, c, i) => i === 0 ? `M ${c.x} ${c.y}` : `${acc} L ${c.x} ${c.y}`, '');
                        const areaD = coords.length > 0
                          ? `${pathD} L ${coords[coords.length - 1].x} 170 L ${coords[0].x} 170 Z`
                          : '';

                        return (
                          <>
                            {/* Shaded Area */}
                            {areaD && <path d={areaD} fill="url(#chartGrad)" />}
                            {/* Connected Line */}
                            {pathD && <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="2.5" />}

                            {/* Points */}
                            {coords.map((c, i) => (
                              <g key={i}>
                                <circle cx={c.x} cy={c.y} r="4" fill="var(--accent)" stroke="var(--bg-dark)" strokeWidth="1.5" />
                                <text x={c.x} y={c.y - 10} fill="var(--text-main)" fontSize="8" textAnchor="middle" fontWeight="600">
                                  {Math.round(c.val)} kg
                                </text>
                                <text x={c.x} y="190" fill="var(--text-dim)" fontSize="10" textAnchor="middle">
                                  {c.label}
                                </text>
                              </g>
                            ))}
                          </>
                        );
                      })()
                    ) : (
                      // Stacked Bar Chart breakdown
                      (() => {
                        const maxVal = Math.max(...chartData.map(d => d.total), 1);
                        return chartData.map((d, index) => {
                          const cX = 40 + (index / (chartData.length - 1 || 1)) * 340;
                          const barWidth = 20;

                          const hHousing = (d.housing / maxVal) * 140;
                          const hTransport = (d.transport / maxVal) * 140;
                          const hFood = (d.food / maxVal) * 140;

                          const yHousing = 170 - hHousing;
                          const yTransport = yHousing - hTransport;
                          const yFood = yTransport - hFood;

                          return (
                            <g key={index}>
                              {/* Housing Segment */}
                              {hHousing > 0 && (
                                <rect x={cX - barWidth / 2} y={yHousing} width={barWidth} height={hHousing} fill="url(#housingGrad)" rx="1.5" />
                              )}
                              {/* Transport Segment */}
                              {hTransport > 0 && (
                                <rect x={cX - barWidth / 2} y={yTransport} width={barWidth} height={hTransport} fill="url(#transportGrad)" rx="1.5" />
                              )}
                              {/* Food Segment */}
                              {hFood > 0 && (
                                <rect x={cX - barWidth / 2} y={yFood} width={barWidth} height={hFood} fill="url(#foodGrad)" rx="1.5" />
                              )}
                              {/* Total Value text */}
                              <text x={cX} y={yFood - 8} fill="var(--text-main)" fontSize="8" textAnchor="middle" fontWeight="600">
                                {Math.round(d.total)} kg
                              </text>
                              {/* Month Label */}
                              <text x={cX} y="190" fill="var(--text-dim)" fontSize="10" textAnchor="middle">
                                {d.label}
                              </text>
                            </g>
                          );
                        });
                      })()
                    )}

                    <line x1="40" y1="170" x2="380" y2="170" stroke="var(--border-color)" strokeWidth="1" />
                  </svg>
                </div>

                {/* Legend for breakdown */}
                {chartViewMode === 'breakdown' && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '12px', marginBottom: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: 'linear-gradient(135deg, hsl(150, 90%, 60%), hsl(142, 70%, 40%))' }} />
                      🏠 Housing
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: 'linear-gradient(135deg, hsl(217, 91%, 65%), hsl(224, 80%, 50%))' }} />
                      🚗 Transport
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: 'linear-gradient(135deg, hsl(45, 100%, 55%), hsl(34, 97%, 45%))' }} />
                      🥗 Food
                    </span>
                  </div>
                )}

                {(() => {
                  const latestMonth = chartData[chartData.length - 1];
                  return (
                    <div style={{ background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
                      <strong style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Leaf size={14} color="var(--primary)" /> Latest Month Context ({latestMonth.label}):
                      </strong>
                      <span style={{ color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        Your total monthly footprint of **{Math.round(latestMonth.total)} kg CO2e** is {getCarbonEquivalentsDescription(latestMonth.total)}
                      </span>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>
                No tracking events registered yet.
              </p>
            )}
          </div>



          {/* Smart Telemetry Simulator Webhooks Card */}
          <div className="panel-card glass-panel">
            <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={20} color="var(--primary)" /> Telemetry Webhooks Simulator
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Simulate incoming telemetry data stream from connected services (Radar SDK, Arcadia Utility, Nest Thermostat) to test backend ingestion pipeline.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Radar.io Webhook Section */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', color: 'var(--accent)' }}>📡 Radar.io Transit SDK</div>
                <div className="form-row" style={{ marginBottom: '10px' }}>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Trip Distance (Miles)</label>
                    <input
                      type="number"
                      className="input-field"
                      style={{ padding: '8px 12px', fontSize: '14px' }}
                      value={simRadarDistance}
                      onChange={e => setSimRadarDistance(Number(e.target.value))}
                    />
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Transit Mode</label>
                    <select
                      className="input-field"
                      style={{ padding: '8px 12px', fontSize: '14px' }}
                      value={simRadarMode}
                      onChange={e => setSimRadarMode(e.target.value as any)}
                    >
                      <option value="suv">Gas SUV</option>
                      <option value="gas_car">Gas Sedan</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="ev">Electric EV</option>
                      <option value="transit">Transit/Bike</option>
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '8px 14px', fontSize: '13px', borderRadius: '6px', width: 'auto' }}
                  onClick={triggerRadarWebhook}
                  disabled={loading}
                >
                  Simulate Radar Ingestion
                </button>
              </div>

              {/* Arcadia Webhook Section */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', color: 'hsl(200, 80%, 50%)' }}>🔌 Arcadia Utility Billing</div>
                <div className="input-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Power Billing (kWh)</label>
                  <input
                    type="number"
                    className="input-field"
                    style={{ padding: '8px 12px', fontSize: '14px' }}
                    value={simArcadiaKwh}
                    onChange={e => setSimArcadiaKwh(Number(e.target.value))}
                  />
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '8px 14px', fontSize: '13px', borderRadius: '6px', background: 'linear-gradient(135deg, hsl(200, 80%, 40%) 0%, hsl(200, 80%, 50%) 100%)', width: 'auto' }}
                  onClick={triggerArcadiaWebhook}
                  disabled={loading}
                >
                  Simulate Arcadia Billing
                </button>
              </div>

              {/* Nest Webhook Section */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', color: 'var(--warning)' }}>🏡 Google Nest Thermostat</div>
                <div className="input-group" style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Thermostat Mode</label>
                  <select
                    className="input-field"
                    style={{ padding: '8px 12px', fontSize: '14px' }}
                    value={simNestEco ? 'eco' : 'standard'}
                    onChange={e => setSimNestEco(e.target.value === 'eco')}
                  >
                    <option value="standard">Standard HVAC heating/cooling</option>
                    <option value="eco">Nest Eco-Mode Active</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '8px 14px', fontSize: '13px', borderRadius: '6px', background: 'linear-gradient(135deg, var(--warning) 0%, var(--leaves-xp) 100%)', width: 'auto' }}
                  onClick={triggerNestWebhook}
                  disabled={loading}
                >
                  Simulate Nest Telemetry Check
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Eco-Sphere Visual, Challenges, Ad Campaigns */}
        <div className="right-panel">

          {/* Visual Eco-Sphere / Eco-Leagues Leaderboard Tabbed Panel */}
          <div className="panel-card glass-panel" style={{ position: 'relative' }}>
            {/* Tabs Header */}
            <div className="flex justify-center border-b mb-5" style={{ borderColor: 'var(--border-color)', borderBottomWidth: '1px', borderBottomStyle: 'solid', display: 'flex', gap: '16px' }}>
              <button
                type="button"
                className={`pb-2 font-display font-bold text-sm transition-all`}
                style={{
                  borderBottomColor: ecoSphereTab === 'sphere' ? 'var(--accent)' : 'transparent',
                  color: ecoSphereTab === 'sphere' ? 'var(--accent)' : 'var(--text-dim)',
                  background: 'transparent',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderBottomWidth: '2px',
                  borderBottomStyle: 'solid',
                  cursor: 'pointer',
                  fontSize: '14px',
                  paddingBottom: '8px',
                  fontWeight: 700
                }}
                onClick={() => setEcoSphereTab('sphere')}
              >
                Virtual Eco-Sphere
              </button>
              <button
                type="button"
                className={`pb-2 font-display font-bold text-sm transition-all`}
                style={{
                  borderBottomColor: ecoSphereTab === 'league' ? 'var(--accent)' : 'transparent',
                  color: ecoSphereTab === 'league' ? 'var(--accent)' : 'var(--text-dim)',
                  background: 'transparent',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderBottomWidth: '2px',
                  borderBottomStyle: 'solid',
                  cursor: 'pointer',
                  fontSize: '14px',
                  paddingBottom: '8px',
                  fontWeight: 700
                }}
                onClick={() => setEcoSphereTab('league')}
              >
                Eco-Leagues Leaderboard
              </button>
            </div>

            {ecoSphereTab === 'sphere' ? (
              <div style={{ textAlign: 'center' }}>
                <div className="ecosphere-widget">
                  <EcoSphere level={user.current_level} />
                  <div className="ecosphere-label">Eco-Sphere Level {user.current_level}</div>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Level up your habitat and watch new branches, flowers, and silver birches grow by earning Leaves!
                </p>
              </div>
            ) : (
              <div className="leaderboard-container" style={{ maxHeight: '330px', overflowY: 'auto', padding: '8px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 8px' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>Competitor</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>Leaves</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {leaderboard.map((member, index) => {
                    const isCurrentUser = member.userId === user.id;
                    return (
                      <div
                        key={member.id}
                        style={{
                          background: isCurrentUser ? 'var(--accent-glow)' : 'rgba(0, 0, 0, 0.2)',
                          borderColor: isCurrentUser ? 'var(--accent)' : 'var(--border-color)',
                          borderRadius: '8px',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          padding: '10px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.2s ease',
                          boxShadow: isCurrentUser ? '0 0 10px var(--accent-glow)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', width: '24px', textAlign: 'center', color: isCurrentUser ? 'var(--accent)' : 'var(--text-dim)' }}>
                            #{index + 1}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: '14px', color: isCurrentUser ? 'var(--text-main)' : 'var(--text-muted)' }}>
                            {member.username} {isCurrentUser && ' (You)'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>
                            Lvl {member.level}
                          </span>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', color: 'var(--leaves-xp)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            {member.leaves} <Leaf size={12} fill="var(--leaves-xp)" style={{ display: 'inline' }} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Action Tracker Panel */}
          <QuickTracker triggerQuickLog={triggerQuickLog} loading={loading} />

          {/* B-Corp Rewards & Sponsor Integrations */}
          <div className="panel-card glass-panel">
            <h2 className="panel-title"><Gift size={20} color="var(--warning)" /> Sponsor Rewards Hub</h2>

            <div className="sponsor-banner">
              <div className="sponsor-logo arcadia">ARCADIA</div>
              <div className="sponsor-info">
                <div className="sponsor-title">Smart Energy Plug</div>
                <div className="sponsor-text">Link utility account and receive a free smart power plug. (Cost: 1500 Leaves)</div>
              </div>
              <button
                className="sponsor-btn"
                onClick={() => redeemVoucher('Arcadia Energy', 'plug', 1500)}
              >
                Claim
              </button>
            </div>

            <div className="sponsor-banner oatly" style={{ marginTop: '12px' }}>
              <div className="sponsor-logo oatly">OATLY</div>
              <div className="sponsor-info">
                <div className="sponsor-title">15% Brand Voucher</div>
                <div className="sponsor-text">Claim a 15% barcode discount for milk-substitutes. (Cost: 500 Leaves)</div>
              </div>
              <button
                className="sponsor-btn"
                onClick={() => redeemVoucher('Oatly', 'discount', 500)}
              >
                Claim
              </button>
            </div>

            <div className="sponsor-banner" style={{ marginTop: '12px', background: 'linear-gradient(135deg, hsla(142, 70%, 45%, 0.15) 0%, hsla(150, 90%, 60%, 0.05) 100%)', borderColor: 'var(--primary)' }}>
              <div className="sponsor-logo" style={{ background: 'var(--primary)', color: 'white' }}>EDEN</div>
              <div className="sponsor-info">
                <div className="sponsor-title">Plant 1 Physical Tree</div>
                <div className="sponsor-text">Eden Projects plants one real tree funded by B-Corp escrow. (Cost: 100 Leaves)</div>
              </div>
              <button
                className="sponsor-btn"
                onClick={() => redeemVoucher('Eden Projects', 'tree', 100)}
              >
                Fund Tree
              </button>
            </div>

            {/* Redeemed Vouchers list */}
            {vouchers.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <span className="simulator-title" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>Your Redeemed Rewards</span>
                <div className="vouchers-list">
                  {vouchers.map(v => (
                    <div key={v.id} className="voucher-item">
                      <div className="voucher-header">
                        <span className="voucher-title">{v.title}</span>
                        {v.couponCode && <span className="voucher-code">{v.couponCode}</span>}
                      </div>
                      <div className="voucher-desc">{v.description}</div>
                      {v.rewardType === 'discount' && (
                        <div className="barcode-visual" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Active 7-Day Challenges */}
          <div className="panel-card glass-panel">
            <h2 className="panel-title"><Calendar size={20} color="var(--primary)" /> Habit Challenges</h2>

            {challenges.map(c => (
              <div key={c.id} className="challenge-card">
                <div className="challenge-header">
                  <span className="challenge-name">{c.title}</span>
                  <span className="challenge-reward">+{c.rewardLeaves} Leaves</span>
                </div>
                <p className="challenge-desc">{c.description}</p>

                <div className="challenge-days-grid">
                  {c.progressLogs.map((completed, idx) => (
                    <div key={idx} className="day-checkbox-wrapper">
                      <div
                        className={`day-checkbox ${completed ? 'completed' : ''}`}
                        onClick={() => toggleChallengeDay(c.type, idx, completed)}
                      >
                        {completed ? '✓' : ''}
                      </div>
                      <span className="day-label">D{idx + 1}</span>
                    </div>
                  ))}
                </div>

                <div className="challenge-footer">
                  <span className="streak-counter">🔥 {c.currentStreak} Day Streak</span>
                  {c.completed ? (
                    <span style={{ color: 'var(--accent)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={14} /> Completed
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-dim)' }}>In Progress</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Recent Activity & Footprint Logs Panel */}
          <ActivityLogs
            events={events}
            deleteCarbonEvent={deleteCarbonEvent}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
