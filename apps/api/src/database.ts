import { PrismaClient } from '@prisma/client';

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
  const userExistInLeague = await prisma.league.findFirst({
    where: { userId }
  });
  if (!userExistInLeague) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (user) {
      await prisma.league.create({
        data: {
          id: `l-${userId}`,
          userId,
          username: user.displayName,
          leaves: user.totalLeaves,
          level: user.currentLevel,
          isMock: 0
        }
      });

      const usernames = [
        'GreenLover', 'EcoPioneer', 'SolarWarrior', 'WindRider', 'ZeroWaste', 
        'EarthGuardian', 'BikeCommuter', 'OatMilkFan', 'ColdWasher', 'VampireHunter', 
        'ForestFriend', 'CarbonBuster', 'RecycleKing', 'CleanGrid', 'TeslaRider', 
        'NatureWalk', 'SproutGrower', 'TreePlanter', 'EcoChamp', 'EcoSquire', 
        'GreenGladiator', 'HumbleRoot', 'SolarSailor', 'IvyVines', 'EcoExplorer', 
        'LushLeaves', 'CompostKing', 'GreenGoddess', 'Wildwood'
      ];

      const mockData = usernames.map((uname, i) => {
        const mockLeaves = Math.floor(Math.random() * 600) + 50;
        const mockLevel = mockLeaves < 100 ? 1 : mockLeaves < 250 ? 2 : mockLeaves < 500 ? 3 : 4;
        return {
          id: `l-mock-${userId}-${i}`,
          username: uname,
          leaves: mockLeaves,
          level: mockLevel,
          isMock: 1
        };
      });

      await prisma.league.createMany({
        data: mockData
      });
    }
  }
}
