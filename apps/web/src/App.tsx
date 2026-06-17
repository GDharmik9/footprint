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
  computeArchetypeBaseline
} from '@footprint/carbon-math';
import Radar from 'radar-sdk-js';
import {
  Leaf,
  Activity,
  TrendingDown,
  Home,
  Car,
  Utensils,
  Calendar,
  Gift,
  CheckCircle,
  Zap,
  RefreshCw,
  Plus
} from 'lucide-react';
import './App.css';

const API_BASE = 'http://localhost:3001/api';

// Helper: Calculate user level from leaves
function calculateLevel(leaves: number): number {
  if (leaves < 100) return 1;
  if (leaves < 250) return 2;
  if (leaves < 500) return 3;
  if (leaves < 1000) return 4;
  return 5 + Math.floor((leaves - 1000) / 1000);
}

export default function App() {
  // Authentication & Onboarding State
  const [user, setUser] = useState<User | null>(null);
  const [baseline, setBaseline] = useState<{ housing: number; transport: number; food: number; total: number } | null>(null);
  const [loading, setLoading] = useState(false);

  // Onboarding Form inputs
  const [displayName, setDisplayName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [housingArchetype, setHousingArchetype] = useState<'apartment' | 'townhouse' | 'family'>('townhouse');
  const [dietArchetype, setDietArchetype] = useState<'vegan' | 'balanced' | 'meat'>('balanced');
  const [commuteArchetype, setCommuteArchetype] = useState<'transit' | 'hybrid' | 'gas'>('hybrid');

  // Dashboard state
  const [events, setEvents] = useState<CarbonEvent[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);

  // Interactive Simulator Options state
  const [simHousing, setSimHousing] = useState<'standard' | 'smart_thermostat' | 'solar'>('standard');
  const [simTransport, setSimTransport] = useState<'suv' | 'gas_car' | 'hybrid' | 'ev' | 'transit'>('gas_car');
  const [simDiet, setSimDiet] = useState<'meat' | 'balanced' | 'vegan'>('balanced');

  // Manual Log event forms state
  const [logCategory, setLogCategory] = useState<'transport' | 'housing' | 'food'>('transport');
  const [logValue, setLogValue] = useState<number>(10);
  const [logTransportMode, setLogTransportMode] = useState<'suv' | 'gas_car' | 'hybrid' | 'ev' | 'transit'>('gas_car');
  const [logDietType, setLogDietType] = useState<'meat' | 'balanced' | 'vegan'>('balanced');
  const [logHousingOption, setLogHousingOption] = useState<'standard' | 'smart_thermostat' | 'solar'>('standard');

  // Alert popup state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Eco-Leagues Leaderboard and Tab state
  const [ecoSphereTab, setEcoSphereTab] = useState<'sphere' | 'league'>('sphere');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

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
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    try {
      // 1. Fetch User status
      const userRes = await fetch(`${API_BASE}/users/${userId}`, { headers });
      if (!userRes.ok) throw new Error('User not found on server');
      const userData = await userRes.json();
      setUser(userData);
      localStorage.setItem('footprint_user_id', userId);

      // 2. Fetch history
      const historyRes = await fetch(`${API_BASE}/carbon-events/${userId}`, { headers });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setEvents(historyData);
      }

      // 3. Fetch active challenges
      const challengesRes = await fetch(`${API_BASE}/challenges/${userId}`, { headers });
      if (challengesRes.ok) {
        const challengesData = await challengesRes.json();
        setChallenges(challengesData);
      }

      // 4. Fetch vouchers
      const vouchersRes = await fetch(`${API_BASE}/vouchers/${userId}`, { headers });
      if (vouchersRes.ok) {
        const vouchersData = await vouchersRes.json();
        setVouchers(vouchersData);
      }

      // 5. Fetch Eco-Leagues leaderboard
      const leagueRes = await fetch(`${API_BASE}/leagues/${userId}`, { headers });
      if (leagueRes.ok) {
        const leagueData = await leagueRes.json();
        setLeaderboard(leagueData);
      }
    } catch (e: any) {
      console.warn('Backend server connection failed. Falling back to simulated local state.');
      // Local Fallback simulation for offline testing
      simulateOfflineState(userId);
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
  };

  // Submit onboarding form
  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName) return;

    setLoading(true);
    const archetype: ArchetypeOptions = {
      housing: housingArchetype,
      diet: dietArchetype,
      commute: commuteArchetype
    };

    try {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
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

  // Log manual carbon event
  const logCarbonEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const token = localStorage.getItem('footprint_auth_token');
      const response = await fetch(`${API_BASE}/carbon-events`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.id,
          category: logCategory,
          source_provider: 'manual',
          raw_value: logValue,
          raw_unit: logCategory === 'housing' ? 'kWh' : logCategory === 'transport' ? 'miles' : 'meals',
          transportMode: logTransportMode,
          dietType: logDietType,
          housingOption: logHousingOption
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Update user state
        setUser(data.user);
        // Refresh events list
        fetchUser(user.id);
        triggerToast(`Logged successfully! Earned +${data.leavesAwarded} Leaves.`, 'success');
      } else {
        throw new Error('Failed to log event');
      }
    } catch (err) {
      // Offline fallback logger
      let computedCO2 = 0;
      if (logCategory === 'housing') {
        computedCO2 = computeHousingCO2(logValue, logHousingOption);
      } else if (logCategory === 'transport') {
        computedCO2 = computeTransportCO2(logValue, logTransportMode);
      } else if (logCategory === 'food') {
        computedCO2 = computeFoodCO2(logValue, logDietType);
      }

      const newEvent: CarbonEvent = {
        id: crypto.randomUUID(),
        user_id: user.id,
        category: logCategory,
        source_provider: 'manual',
        raw_value: logValue,
        raw_unit: logCategory === 'housing' ? 'kWh' : logCategory === 'transport' ? 'miles' : 'meals',
        computed_co2e_kg: computedCO2,
        timestamp: new Date().toISOString()
      };

      setEvents([newEvent, ...events]);

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
      triggerToast(`Local Mode: Logged successfully! Earned +${leavesAwarded} Leaves.`, 'success');
    }
  };

  // Toggle challenge progress
  const toggleChallengeDay = async (challengeType: 'cold-wash' | 'vampire-hunt', dayIndex: number, currentCompleted: boolean) => {
    if (!user) return;

    try {
      const token = localStorage.getItem('footprint_auth_token');
      const response = await fetch(`${API_BASE}/challenges/progress`, {
        method: 'POST',
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

  // Reset current session
  const resetSession = () => {
    localStorage.removeItem('footprint_user_id');
    localStorage.removeItem('footprint_auth_token');
    localStorage.removeItem('footprint_baseline');
    setUser(null);
    setBaseline(null);
    setEvents([]);
    setVouchers([]);
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

  // Visual Eco-Sphere SVG renderer
  const renderEcoSphere = () => {
    const level = user ? user.current_level : 1;

    // Draw different SVG components depending on user level
    return (
      <svg className="ecosphere-svg" viewBox="0 0 100 100">
        <defs>
          <radialGradient id="sphereGrad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
            <stop offset="0%" stopColor="hsl(150, 90%, 65%)" stopOpacity="0.4" />
            <stop offset="70%" stopColor="hsl(142, 70%, 25%)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="hsl(224, 45%, 8%)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="trunkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(34, 25%, 35%)" />
            <stop offset="100%" stopColor="hsl(34, 25%, 20%)" />
          </linearGradient>
          <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(150, 90%, 60%)" />
            <stop offset="100%" stopColor="hsl(142, 70%, 35%)" />
          </linearGradient>
        </defs>

        {/* Global glowing glass background dome */}
        <circle cx="50" cy="50" r="45" fill="url(#sphereGrad)" stroke="hsla(150, 90%, 60%, 0.15)" strokeWidth="0.5" />

        {/* Core Habitat Base (soil) */}
        <path d="M 15 75 Q 50 65 85 75 Q 85 85 85 85 Q 50 90 15 85 Z" fill="hsl(34, 25%, 22%)" opacity="0.9" />
        <path d="M 20 74 Q 50 68 80 74" stroke="hsl(142, 60%, 30%)" strokeWidth="1.5" fill="none" />

        {/* Level 1 Sprout */}
        {level >= 1 && (
          <>
            {/* Trunk */}
            <path d="M 49 75 Q 49 60 51 55" stroke="url(#trunkGrad)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {/* Leaf 1 */}
            <path d="M 51 55 Q 56 48 51 44 Q 46 48 51 55" fill="url(#leafGrad)" />
          </>
        )}

        {/* Level 2 Sapling addition */}
        {level >= 2 && (
          <>
            {/* Left Branch */}
            <path d="M 50 65 Q 42 58 38 56" stroke="url(#trunkGrad)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            {/* Left Leaf */}
            <path d="M 38 56 Q 32 54 33 49 Q 39 51 38 56" fill="url(#leafGrad)" />
          </>
        )}

        {/* Level 3 Crown growth addition */}
        {level >= 3 && (
          <>
            {/* Right Branch */}
            <path d="M 50 62 Q 58 55 64 53" stroke="url(#trunkGrad)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            {/* Right Leaf */}
            <path d="M 64 53 Q 70 51 71 46 Q 65 48 64 53" fill="url(#leafGrad)" />
            {/* Center Bush Top */}
            <circle cx="50" cy="42" r="6" fill="url(#leafGrad)" opacity="0.85" />
          </>
        )}

        {/* Level 4 Full bloom flowers & extra density */}
        {level >= 4 && (
          <>
            <circle cx="43" cy="48" r="5" fill="url(#leafGrad)" opacity="0.9" />
            <circle cx="58" cy="46" r="5" fill="url(#leafGrad)" opacity="0.9" />
            {/* Flowers */}
            <circle cx="50" cy="42" r="1.5" fill="hsl(346, 84%, 61%)" />
            <circle cx="38" cy="56" r="1.2" fill="hsl(45, 100%, 50%)" />
            <circle cx="64" cy="53" r="1.2" fill="hsl(45, 100%, 50%)" />
          </>
        )}

        {/* Level 5+ Silver Birch growth addition */}
        {level >= 5 && (
          <>
            {/* Second Tree trunk (Silver Birch) */}
            <path d="M 68 75 Q 67 60 70 48" stroke="hsl(210, 40%, 90%)" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Birch branch */}
            <path d="M 69 60 Q 75 54 78 52" stroke="hsl(210, 40%, 90%)" strokeWidth="1" strokeLinecap="round" fill="none" />
            {/* Birch leaves */}
            <path d="M 78 52 Q 83 50 82 46 Q 77 48 78 52" fill="hsl(150, 90%, 65%)" />
            <path d="M 70 48 Q 72 40 68 36 Q 65 40 70 48" fill="hsl(150, 90%, 65%)" />

            {/* Floating glowing leaf particles */}
            <circle cx="30" cy="40" r="0.8" fill="var(--accent)" className="glow-leaves" />
            <circle cx="68" cy="30" r="0.8" fill="var(--leaves-xp)" className="glow-leaves" />
            <circle cx="52" cy="32" r="0.6" fill="var(--accent)" className="glow-leaves" />
          </>
        )}
      </svg>
    );
  };

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
              <label htmlFor="zip-input">Postal/Zip Code</label>
              <input
                id="zip-input"
                type="text"
                placeholder="To fetch local grid carbon factors (e.g. 94103)"
                value={postalCode}
                onChange={e => setPostalCode(e.target.value)}
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
          <button onClick={resetSession} className="btn-secondary" style={{ padding: '6px 10px' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

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
              <div className="projected-reduction-banner">
                <span className="reduction-label">Projected Lifetime Reduction:</span>
                <span className="reduction-value">-{simReduction} Tons/Yr</span>
              </div>
            ) : (
              <div className="projected-reduction-banner" style={{ background: 'hsla(346, 84%, 61%, 0.1)', borderColor: 'var(--danger)' }}>
                <span className="reduction-label" style={{ color: 'var(--danger)' }}>Above Onboarding Target:</span>
                <span className="reduction-value" style={{ color: 'var(--danger)' }}>+{Math.abs(simReduction)} Tons/Yr</span>
              </div>
            )}
          </div>

          {/* Interactive Life Swap Simulator */}
          <div className="panel-card glass-panel">
            <h2 className="panel-title"><TrendingDown size={20} color="var(--accent)" /> Life Swap Simulator</h2>

            <div className="simulator-group">
              <div className="simulator-label">
                <span className="simulator-title">Housing Grid & Thermostat</span>
                <span className="simulator-impact">{simFootprint.housing} Tons/Yr</span>
              </div>
              <div className="simulator-options-row">
                <button
                  className={`simulator-option-btn ${simHousing === 'standard' ? 'active' : ''}`}
                  onClick={() => setSimHousing('standard')}
                >
                  <Home size={14} /> Standard Grid
                </button>
                <button
                  className={`simulator-option-btn ${simHousing === 'smart_thermostat' ? 'active' : ''}`}
                  onClick={() => setSimHousing('smart_thermostat')}
                >
                  <Zap size={14} /> Smart Nest
                </button>
                <button
                  className={`simulator-option-btn ${simHousing === 'solar' ? 'active' : ''}`}
                  onClick={() => setSimHousing('solar')}
                >
                  <Leaf size={14} /> Solar Roof
                </button>
              </div>
            </div>

            <div className="simulator-group">
              <div className="simulator-label">
                <span className="simulator-title">Transport & Travel Mode</span>
                <span className="simulator-impact">{simFootprint.transport} Tons/Yr</span>
              </div>
              <div className="simulator-options-row">
                <button
                  className={`simulator-option-btn ${simTransport === 'suv' ? 'active' : ''}`}
                  onClick={() => setSimTransport('suv')}
                >
                  <Car size={14} /> Drive SUV
                </button>
                <button
                  className={`simulator-option-btn ${simTransport === 'gas_car' ? 'active' : ''}`}
                  onClick={() => setSimTransport('gas_car')}
                >
                  <Car size={14} /> Sedan
                </button>
                <button
                  className={`simulator-option-btn ${simTransport === 'hybrid' ? 'active' : ''}`}
                  onClick={() => setSimTransport('hybrid')}
                >
                  <Zap size={14} /> Hybrid/EV
                </button>
                <button
                  className={`simulator-option-btn ${simTransport === 'transit' ? 'active' : ''}`}
                  onClick={() => setSimTransport('transit')}
                >
                  <Activity size={14} /> Bike/Transit
                </button>
              </div>
            </div>

            <div className="simulator-group">
              <div className="simulator-label">
                <span className="simulator-title">Dietary Choices</span>
                <span className="simulator-impact">{simFootprint.food} Tons/Yr</span>
              </div>
              <div className="simulator-options-row">
                <button
                  className={`simulator-option-btn ${simDiet === 'meat' ? 'active' : ''}`}
                  onClick={() => setSimDiet('meat')}
                >
                  <Utensils size={14} /> Meat Heavy
                </button>
                <button
                  className={`simulator-option-btn ${simDiet === 'balanced' ? 'active' : ''}`}
                  onClick={() => setSimDiet('balanced')}
                >
                  <Utensils size={14} /> Poultry/Flex
                </button>
                <button
                  className={`simulator-option-btn ${simDiet === 'vegan' ? 'active' : ''}`}
                  onClick={() => setSimDiet('vegan')}
                >
                  <Utensils size={14} /> Vegan Swap
                </button>
              </div>
            </div>
          </div>

          {/* Historical Trend Chart */}
          <div className="panel-card glass-panel">
            <h2 className="panel-title"><Activity size={20} color="var(--primary)" /> Emitted Carbon Trend</h2>

            {chartData.length > 0 ? (
              <div className="chart-container">
                <svg className="chart-svg" viewBox="0 0 400 200">
                  <defs>
                    <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  <line x1="40" y1="20" x2="380" y2="20" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4" />
                  <line x1="40" y1="80" x2="380" y2="80" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4" />
                  <line x1="40" y1="140" x2="380" y2="140" stroke="var(--border-color)" strokeWidth="0.5" strokeDasharray="4" />

                  {/* Points & Path */}
                  {(() => {
                    const maxVal = Math.max(...chartData.map(d => d.total), 1);
                    const coords = chartData.map((d, index) => {
                      const x = 40 + (index / (chartData.length - 1 || 1)) * 340;
                      // Max value corresponds to y=20, 0 value to y=170
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
                            {/* Text labels for values */}
                            <text x={c.x} y={c.y - 10} fill="var(--text-main)" fontSize="8" textAnchor="middle" fontWeight="600">
                              {Math.round(c.val)} kg
                            </text>
                            {/* Month Label */}
                            <text x={c.x} y="190" fill="var(--text-dim)" fontSize="10" textAnchor="middle">
                              {c.label}
                            </text>
                          </g>
                        ))}
                      </>
                    );
                  })()}

                  <line x1="40" y1="170" x2="380" y2="170" stroke="var(--border-color)" strokeWidth="1" />
                </svg>
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
                  {renderEcoSphere()}
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

          {/* Ingest Actions Manual Logger */}
          <div className="panel-card glass-panel">
            <h2 className="panel-title"><Plus size={20} /> Log Daily Micro-Action</h2>
            <form onSubmit={logCarbonEvent} className="log-event-form">
              <div className="input-group" style={{ margin: 0 }}>
                <label htmlFor="category-select">Action Category</label>
                <select
                  id="category-select"
                  className="input-field"
                  value={logCategory}
                  onChange={e => setLogCategory(e.target.value as any)}
                >
                  <option value="transport">Transit/Commute</option>
                  <option value="housing">Utility/Electric Billing</option>
                  <option value="food">Dietary Meals</option>
                </select>
              </div>

              {logCategory === 'transport' && (
                <div className="form-row">
                  <div className="input-group" style={{ margin: 0 }}>
                    <label htmlFor="transport-value">Distance (Miles)</label>
                    <input
                      id="transport-value"
                      type="number"
                      className="input-field"
                      value={logValue}
                      onChange={e => setLogValue(Number(e.target.value))}
                    />
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label htmlFor="transport-mode-select">Vehicle Type</label>
                    <select
                      id="transport-mode-select"
                      className="input-field"
                      value={logTransportMode}
                      onChange={e => setLogTransportMode(e.target.value as any)}
                    >
                      <option value="suv">Gas SUV</option>
                      <option value="gas_car">Gas Sedan</option>
                      <option value="hybrid">Hybrid Vehicle</option>
                      <option value="ev">Electric EV</option>
                      <option value="transit">Public Transit/Bike</option>
                    </select>
                  </div>
                </div>
              )}

              {logCategory === 'housing' && (
                <div className="form-row">
                  <div className="input-group" style={{ margin: 0 }}>
                    <label htmlFor="housing-value">Power Usage (kWh)</label>
                    <input
                      id="housing-value"
                      type="number"
                      className="input-field"
                      value={logValue}
                      onChange={e => setLogValue(Number(e.target.value))}
                    />
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label htmlFor="housing-option-select">Grid Setup</label>
                    <select
                      id="housing-option-select"
                      className="input-field"
                      value={logHousingOption}
                      onChange={e => setLogHousingOption(e.target.value as any)}
                    >
                      <option value="standard">Standard Grid</option>
                      <option value="smart_thermostat">Smart Nest Installed</option>
                      <option value="solar">Solar Rooftop Setup</option>
                    </select>
                  </div>
                </div>
              )}

              {logCategory === 'food' && (
                <div className="form-row">
                  <div className="input-group" style={{ margin: 0 }}>
                    <label htmlFor="food-value">Total Servings / Meals</label>
                    <input
                      id="food-value"
                      type="number"
                      className="input-field"
                      value={logValue}
                      onChange={e => setLogValue(Number(e.target.value))}
                    />
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label htmlFor="diet-select">Diet Composition</label>
                    <select
                      id="diet-select"
                      className="input-field"
                      value={logDietType}
                      onChange={e => setLogDietType(e.target.value as any)}
                    >
                      <option value="meat">Beef / Pork Heavy</option>
                      <option value="balanced">Balanced / Poultry</option>
                      <option value="vegan">Plant-based / Vegan</option>
                    </select>
                  </div>
                </div>
              )}

              <button type="submit" className="btn-primary" style={{ padding: '10px' }}>
                Register Log & Earn Leaves
              </button>
            </form>
          </div>

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

        </div>
      </div>
    </div>
  );
}
