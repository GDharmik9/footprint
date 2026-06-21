import type { User, CarbonEvent, Challenge, Voucher } from '@footprint/shared-types';
import {
  computeArchetypeBaseline
} from '@footprint/carbon-math';
import { calculateLevel } from './dashboardUtils';

export interface LeaderboardMember {
  id: string;
  userId: string;
  username: string;
  level: number;
  leaves: number;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: 'housing' | 'transport' | 'food';
  type: string;
  value: number;
  unit: string;
  impactKg: number;
  rewardLeaves: number;
}

export function simulateOfflineState(
  userId: string,
  displayName: string,
  postalCode: string,
  housingArchetype: 'apartment' | 'townhouse' | 'family',
  dietArchetype: 'vegan' | 'balanced' | 'meat',
  commuteArchetype: 'transit' | 'hybrid' | 'gas'
) {
  const mockUser: User = {
    id: userId,
    display_name: displayName || 'Eco Champion',
    current_level: 1,
    total_leaves: 120,
    postal_code: postalCode || '90210',
    created_at: new Date().toISOString()
  };

  const mockBaseline = computeArchetypeBaseline({
    housing: housingArchetype,
    diet: dietArchetype,
    commute: commuteArchetype
  });

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

  // Initial challenges setup
  const mockChallenges: Challenge[] = [
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
  ];

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

  // Simulate insights and micro-actions offline
  const simulatedInsights = [
    `💡 Your simulated transit emissions are ${commuteArchetype === 'gas' ? 'above average' : 'optimized'}. Try public transit commutes to reduce it.`,
    `🥗 Your diet choices are set to '${dietArchetype}'. Transitioning to plant-based meals cuts food footprint by 60%.`,
    `🏠 Your home grid setup is '${housingArchetype}'. Smart Nest thermostats can shave off up to 15% of annual heating.`
  ];

  const simulatedRecs: Recommendation[] = [
    {
      id: 'rec-vegan-1',
      title: 'Eat a Plant-Based Meal 🥗',
      description: 'Replace standard animal proteins with a plant-based alternative for one meal today.',
      category: 'food',
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
      category: 'transport',
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
      category: 'housing',
      type: 'solar',
      value: 15,
      unit: 'kWh',
      impactKg: 5.7,
      rewardLeaves: 35
    }
  ];

  return {
    user: mockUser,
    baseline: mockBaseline,
    events: mockEvents,
    challenges: mockChallenges,
    leaderboard: mockLeague,
    insights: simulatedInsights,
    recommendations: simulatedRecs
  };
}

export function calculateLocalLeavesAwarded(
  category: 'food' | 'transport' | 'housing',
  modeOrOption: string
): number {
  let leavesAwarded = 15;
  if (category === 'transport' && (modeOrOption === 'ev' || modeOrOption === 'transit')) {
    leavesAwarded += 15;
  } else if (category === 'food' && modeOrOption === 'vegan') {
    leavesAwarded += 10;
  } else if (category === 'housing' && modeOrOption === 'solar') {
    leavesAwarded += 20;
  }
  return leavesAwarded;
}

export function simulateOfflineChallengeToggle(
  challenges: Challenge[],
  challengeType: 'cold-wash' | 'vampire-hunt',
  dayIndex: number,
  currentCompleted: boolean,
  user: User
) {
  const challenge = challenges.find(c => c.type === challengeType);
  if (!challenge) return null;

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
  const updatedUser = { ...user };

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

  return {
    updatedChallenge,
    updatedUser,
    rewardAwarded,
    leavesAwarded
  };
}

export function simulateOfflineRedeemVoucher(
  sponsorName: string,
  rewardType: 'tree' | 'discount' | 'plug',
  costLeaves: number,
  user: User
) {
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

  return {
    updatedUser,
    newVoucher
  };
}
