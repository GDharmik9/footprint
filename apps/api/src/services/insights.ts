import { prisma } from '../database.js';

export interface InteractiveRecommendation {
  id: string;
  title: string;
  description: string;
  category: 'transport' | 'food' | 'housing';
  type: string;
  value: number;
  unit: string;
  impactKg: number;
  rewardLeaves: number;
}

export interface UserInsightsPayload {
  insights: string[];
  recommendations: InteractiveRecommendation[];
}

export async function generateUserInsights(userId: string): Promise<UserInsightsPayload> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch user details
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Fetch carbon events in the last 30 days
  const events = await prisma.carbonEvent.findMany({
    where: {
      userId,
      timestamp: { gte: thirtyDaysAgo }
    }
  });

  // Calculate category sums
  let transportSum = 0;
  let housingSum = 0;
  let foodSum = 0;

  events.forEach(e => {
    if (e.category === 'transport') {
      transportSum += e.computedCo2eKg;
    } else if (e.category === 'housing') {
      housingSum += e.computedCo2eKg;
    } else if (e.category === 'food') {
      foodSum += e.computedCo2eKg;
    }
  });

  const insights: string[] = [];

  // Generate Personalized Insights
  if (transportSum > 180) {
    insights.push(`💡 Your transport emissions (${Math.round(transportSum)} kg CO2e) are currently above average. Try replacing short drives with transit or bike trips.`);
  } else if (transportSum > 0) {
    insights.push(`🌿 Great job! Your transit emissions are kept low at ${Math.round(transportSum)} kg CO2e. Keep active or public transit commuting!`);
  } else {
    insights.push(`🚲 No transit logs recently. Ditching your gas car for walking or cycling is a quick way to earn Leaves.`);
  }

  if (foodSum > 140) {
    insights.push(`🍖 Dietary intake represents ${Math.round(foodSum)} kg CO2e. Swapping just one or two meat meals for plant-based choices will reduce this drastically.`);
  } else if (foodSum > 0) {
    insights.push(`🥗 Awesome work! Your food emissions are highly optimized. Your plant-forward choices avoided carbon heavy red meats.`);
  } else {
    insights.push(`🥗 Try eating a plant-based meal today to earn +25 Leaves instantly.`);
  }

  if (housingSum > 220) {
    insights.push(`🏠 Home grid consumption added ${Math.round(housingSum)} kg CO2e. Try installing a Nest Thermostat or offsetting power with solar.`);
  } else {
    insights.push(`⚡ Your home energy footprint is highly efficient (${Math.round(housingSum)} kg CO2e). Keep grid usage minimized!`);
  }

  // Generate Recommended Interactive Action Items (dynamic list based on high-impact areas)
  const recommendations: InteractiveRecommendation[] = [];

  // 1. Always offer a plant-based swap if food is logged or default
  recommendations.push({
    id: 'rec-vegan-1',
    title: 'Eat a Plant-Based Meal 🥗',
    description: 'Replace standard animal proteins with a plant-based alternative for one meal today.',
    category: 'food',
    type: 'vegan',
    value: 1,
    unit: 'meals',
    impactKg: 1.0,
    rewardLeaves: 25
  });

  // 2. Offer transit commute or EV drive depending on transport level
  if (transportSum > 150) {
    recommendations.push({
      id: 'rec-transit-5',
      title: 'Ditch the Drive (5 mi) 🚲',
      description: 'Take public transit, walk, or bike for 5 miles instead of driving a gas car.',
      category: 'transport',
      type: 'transit',
      value: 5,
      unit: 'miles',
      impactKg: 1.5,
      rewardLeaves: 30
    });
  } else {
    recommendations.push({
      id: 'rec-ev-10',
      title: 'Electric EV Commute (10 mi) 🔌',
      description: 'Log a 10-mile trip in an electric vehicle to prevent carbon combustion.',
      category: 'transport',
      type: 'ev',
      value: 10,
      unit: 'miles',
      impactKg: 3.0,
      rewardLeaves: 30
    });
  }

  // 3. Offer Solar rooftop generation
  recommendations.push({
    id: 'rec-solar-15',
    title: 'Clean Solar Generation (15 kWh) ☀️',
    description: 'Log 15 kWh of clean electricity generated from household solar panel systems.',
    category: 'housing',
    type: 'solar',
    value: 15,
    unit: 'kWh',
    impactKg: 5.7,
    rewardLeaves: 35
  });

  return {
    insights,
    recommendations
  };
}
