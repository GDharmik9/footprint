import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

export const prisma = new PrismaClient();

export async function initDatabase() {
  console.log('Connecting to PostgreSQL database via Prisma...');
  try {
    await prisma.$connect();
    console.log('PostgreSQL database connected successfully via Prisma.');
  } catch (err) {
    console.error('Failed to connect to database via Prisma:', err);
    throw err;
  }
}

export async function seedUserChallenges(userId: string) {
  const challengesExist = await prisma.challenge.findFirst({
    where: { userId }
  });
  if (!challengesExist) {
    const coldWashId = `cw-${userId}`;
    const vampireId = `vh-${userId}`;
    const emptyProgress = JSON.stringify([false, false, false, false, false, false, false]);

    await prisma.challenge.createMany({
      data: [
        {
          id: coldWashId,
          userId,
          type: 'cold-wash',
          title: 'The Cold-Wash Campaign 🧺',
          description: 'Run all laundry washes using cold water settings for 7 consecutive days.',
          rewardLeaves: 100,
          targetDays: 7,
          currentStreak: 0,
          completed: 0,
          progressLogs: emptyProgress,
          rewardApplied: 0,
        },
        {
          id: vampireId,
          userId,
          type: 'vampire-hunt',
          title: 'The Vampire Hunt 🧛‍♂️',
          description: 'Disconnect 3 standby home electronics (consoles, idle chargers, secondary displays) before sleeping for 7 consecutive days.',
          rewardLeaves: 120,
          targetDays: 7,
          currentStreak: 0,
          completed: 0,
          progressLogs: emptyProgress,
          rewardApplied: 0,
        }
      ]
    });
  }
}

export async function seedWeeklyLeague(userId: string) {
  // Check if user is already assigned to a league
  const userExistInLeague = await prisma.league.findFirst({
    where: { userId }
  });
  if (userExistInLeague) return;

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  if (!user) return;

  // Find all leagues and find one that has space (< 30 members)
  const leagueCounts = await prisma.league.groupBy({
    by: ['leagueId'],
    _count: {
      id: true
    }
  });

  let targetLeagueId = '';
  for (const group of leagueCounts) {
    if (group._count.id < 30) {
      targetLeagueId = group.leagueId;
      break;
    }
  }

  // If no league found with space, create a new league group
  if (!targetLeagueId) {
    targetLeagueId = `league-${crypto.randomUUID()}`;
  }

  // Add the user to the league
  await prisma.league.create({
    data: {
      id: `l-${userId}`,
      leagueId: targetLeagueId,
      userId,
      username: user.displayName,
      leaves: user.totalLeaves,
      level: user.currentLevel,
      isMock: 0
    }
  });

  // Check how many members are now in the league
  const currentCount = await prisma.league.count({
    where: { leagueId: targetLeagueId }
  });

  // If there are empty slots, seed mock users under the same leagueId
  if (currentCount < 30) {
    const remainingSlots = 30 - currentCount;
    const usernames = [
      'GreenLover', 'EcoPioneer', 'SolarWarrior', 'WindRider', 'ZeroWaste', 
      'EarthGuardian', 'BikeCommuter', 'OatMilkFan', 'ColdWasher', 'VampireHunter', 
      'ForestFriend', 'CarbonBuster', 'RecycleKing', 'CleanGrid', 'TeslaRider', 
      'NatureWalk', 'SproutGrower', 'TreePlanter', 'EcoChamp', 'EcoSquire', 
      'GreenGladiator', 'HumbleRoot', 'SolarSailor', 'IvyVines', 'EcoExplorer', 
      'LushLeaves', 'CompostKing', 'GreenGoddess', 'Wildwood'
    ];

    const mockData = [];
    for (let i = 0; i < remainingSlots; i++) {
      const mockLeaves = Math.floor(Math.random() * 600) + 50;
      const mockLevel = mockLeaves < 100 ? 1 : mockLeaves < 250 ? 2 : mockLeaves < 500 ? 3 : 4;
      const index = Math.floor(Math.random() * usernames.length);
      const uname = `${usernames[index]}_${Math.floor(Math.random() * 1000)}`;
      mockData.push({
        id: `l-mock-${targetLeagueId}-${i}`,
        leagueId: targetLeagueId,
        username: uname,
        leaves: mockLeaves,
        level: mockLevel,
        isMock: 1
      });
    }

    await prisma.league.createMany({
      data: mockData
    });
  }
}
