import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Use a fixed UUID for the demo user to make it repeatable and consistent
  const demoUserId = 'demo-eco-warrior-uuid';

  // 1. Clean up existing demo data if present (to allow running the seed script multiple times)
  console.log('🧹 Cleaning up old demo data...');
  await prisma.league.deleteMany({ where: { leagueId: 'league-demo-group' } });
  await prisma.voucher.deleteMany({ where: { userId: demoUserId } });
  await prisma.challenge.deleteMany({ where: { userId: demoUserId } });
  await prisma.carbonEvent.deleteMany({ where: { userId: demoUserId } });
  await prisma.user.deleteMany({ where: { id: demoUserId } });

  // 2. Create the Demo User
  console.log('👤 Creating demo user...');
  const user = await prisma.user.create({
    data: {
      id: demoUserId,
      displayName: 'Demo Eco-Warrior 🌍',
      currentLevel: 3,
      totalLeaves: 320,
      postalCode: '90210',
    },
  });

  // 3. Create Carbon Footprint Events (6 months of realistic monthly historical events)
  console.log('📊 Seeding 6 months of historical carbon footprint events...');
  const now = new Date();
  const categories = [
    { category: 'housing', rawValue: 450, rawUnit: 'kWh', computedCo2eKg: 180 },
    { category: 'transport', rawValue: 350, rawUnit: 'miles', computedCo2eKg: 77 },
    { category: 'food', rawValue: 90, rawUnit: 'meals', computedCo2eKg: 125 }
  ];

  const eventsData = [];
  for (let i = 5; i >= 0; i--) {
    const eventDate = new Date(now.getFullYear(), now.getMonth() - i, 15);
    for (const cat of categories) {
      // Add slight randomness to values to make charts look organic
      const variance = 0.85 + Math.random() * 0.3; // 85% to 115%
      eventsData.push({
        id: `event-${cat.category}-${i}`,
        userId: demoUserId,
        category: cat.category,
        sourceProvider: i === 0 ? 'manual' : 'arcadia',
        rawValue: Math.round(cat.rawValue * variance),
        rawUnit: cat.rawUnit,
        computedCo2eKg: parseFloat((cat.computedCo2eKg * variance).toFixed(2)),
        timestamp: eventDate,
        regionCode: cat.category === 'housing' ? 'custom-90210' : null,
      });
    }
  }
  await prisma.carbonEvent.createMany({ data: eventsData });

  // 4. Create Streaks / Challenges
  console.log('🧺 Seeding active and completed challenges...');
  await prisma.challenge.createMany({
    data: [
      {
        id: `challenge-cold-wash-${demoUserId}`,
        userId: demoUserId,
        type: 'cold-wash',
        title: 'The Cold-Wash Campaign 🧺',
        description: 'Run all laundry washes using cold water settings for 7 consecutive days.',
        rewardLeaves: 100,
        targetDays: 7,
        currentStreak: 4,
        completed: 0,
        progressLogs: JSON.stringify([true, true, true, true, false, false, false]),
        rewardApplied: 0,
      },
      {
        id: `challenge-vampire-hunt-${demoUserId}`,
        userId: demoUserId,
        type: 'vampire-hunt',
        title: 'The Vampire Hunt 🧛‍♂️',
        description: 'Disconnect 3 standby home electronics (consoles, idle chargers, secondary displays) before sleeping for 7 consecutive days.',
        rewardLeaves: 120,
        targetDays: 7,
        currentStreak: 7,
        completed: 1,
        progressLogs: JSON.stringify([true, true, true, true, true, true, true]),
        rewardApplied: 1,
      }
    ]
  });

  // 5. Create Redeemed B-Corp Vouchers
  console.log('🎫 Seeding redeemed B-Corp vouchers...');
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

  await prisma.voucher.createMany({
    data: [
      {
        id: `voucher-tree-${demoUserId}`,
        userId: demoUserId,
        sponsorName: 'Eden Reforestation Projects',
        title: 'Eden Projects tree planting',
        description: '1 physical tree has been funded in your name. Tracking receipt: https://edenprojects.org/tracking/demo-warrior',
        rewardType: 'tree',
        costLeaves: 100,
        redeemedAt: twoDaysAgo,
      },
      {
        id: `voucher-oatly-${demoUserId}`,
        userId: demoUserId,
        sponsorName: 'Oatly',
        title: '15% Off Oatly Products',
        description: 'Get 15% discount checkout coupon code funded by Oatly.',
        rewardType: 'discount',
        couponCode: 'OATLY-15-WARRIOR',
        costLeaves: 50,
        redeemedAt: oneDayAgo,
      }
    ]
  });

  // 6. Create Leaderboard League Standings
  console.log('🏆 Seeding competitive Eco-Leagues leaderboard standing...');
  const leagueId = 'league-demo-group';

  // Add the demo user
  await prisma.league.create({
    data: {
      id: `league-entry-${demoUserId}`,
      leagueId,
      userId: demoUserId,
      username: 'Demo Eco-Warrior 🌍',
      leaves: 320,
      level: 3,
      isMock: 0,
    }
  });

  // Add mock competitors with randomized but stable leaves/levels
  const competitors = [
    { username: 'SolarWarrior_94', leaves: 480, level: 3 },
    { username: 'EcoPioneer_21', leaves: 410, level: 3 },
    { username: 'ZeroWaste_888', leaves: 350, level: 3 },
    { username: 'GreenLover_57', leaves: 290, level: 3 },
    { username: 'BikeCommuter_12', leaves: 240, level: 2 },
    { username: 'OatMilkFan_101', leaves: 190, level: 2 },
    { username: 'ColdWasher_42', leaves: 150, level: 2 },
    { username: 'VampireHunter_9', leaves: 90, level: 1 },
    { username: 'EarthGuardian_5', leaves: 60, level: 1 }
  ];

  const leagueEntries = competitors.map((comp, idx) => ({
    id: `league-entry-mock-${idx}`,
    leagueId,
    username: comp.username,
    leaves: comp.leaves,
    level: comp.level,
    isMock: 1,
  }));

  await prisma.league.createMany({ data: leagueEntries });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
