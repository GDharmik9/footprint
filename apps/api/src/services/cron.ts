import { prisma } from '../database.js';

/**
 * Core business logic for evaluating competitive standings in all 30-person leagues.
 * Ranks users, promotes the top 5 (giving them level upgrades and leaf rewards),
 * updates streaks, and resets weekly points.
 */
export async function evaluateCompetitiveLeagues() {
  console.log('--- Competitive Leagues Standings Evaluation Starting ---');

  // Fetch all league entries grouped by leagueId
  const allStandings = await prisma.league.findMany();
  
  // Group in memory by leagueId
  const leaguesMap = new Map<string, typeof allStandings>();
  for (const entry of allStandings) {
    const list = leaguesMap.get(entry.leagueId) || [];
    list.push(entry);
    leaguesMap.set(entry.leagueId, list);
  }

  for (const [leagueId, members] of leaguesMap.entries()) {
    console.log(`Evaluating League: ${leagueId} (${members.length} members)`);

    // Sort by leaves descending
    members.sort((a, b) => b.leaves - a.leaves);

    // Top 5 members get promoted / rewarded
    const top5 = members.slice(0, 5);
    for (let i = 0; i < top5.length; i++) {
      const winner = top5[i];
      if (winner.userId && winner.isMock === 0) {
        const user = await prisma.user.findUnique({ where: { id: winner.userId } });
        if (user) {
          // Promote: increase level, award bonus leaves (e.g. 1st: 100, 2nd: 80, etc.)
          const bonusLeaves = 100 - i * 15;
          const nextLevel = user.currentLevel + 1;
          const nextLeaves = user.totalLeaves + bonusLeaves;
          
          await prisma.user.update({
            where: { id: user.id },
            data: {
              currentLevel: nextLevel,
              totalLeaves: nextLeaves
            }
          });
          console.log(`Promoted user ${winner.username} in league ${leagueId} to Level ${nextLevel} (+${bonusLeaves} leaves)`);
        }
      }
    }

    // Reset leaves for all members of the league to 0 for the next week
    await prisma.league.updateMany({
      where: { leagueId },
      data: {
        leaves: 0
      }
    });

    // Also sync the users' current levels back into their league records for the next week
    for (const member of members) {
      if (member.userId && member.isMock === 0) {
        const user = await prisma.user.findUnique({ where: { id: member.userId } });
        if (user) {
          await prisma.league.update({
            where: { id: member.id },
            data: {
              level: user.currentLevel
            }
          });
        }
      } else if (member.isMock === 1) {
        // Shuffle mock user scores randomly to make the next week look active
        const nextMockLeaves = Math.floor(Math.random() * 600) + 50;
        const nextMockLevel = nextMockLeaves < 100 ? 1 : nextMockLeaves < 250 ? 2 : nextMockLeaves < 500 ? 3 : 4;
        await prisma.league.update({
          where: { id: member.id },
          data: {
            leaves: nextMockLeaves,
            level: nextMockLevel
          }
        });
      }
    }
  }

  console.log('--- Competitive Leagues Standings Evaluation Completed ---');
}

/**
 * Starts a background scheduled interval (e.g., simulating 1 week every 10 minutes for testing,
 * or running once every Sunday at 00:00).
 */
export function startLeaguesEvaluationCron() {
  // Simulate league reset evaluation every 10 minutes in development
  const INTERVAL_MS = 10 * 60 * 1000;
  console.log(`Leagues cron started: Will evaluate and reset league standings every 10 minutes.`);
  setInterval(async () => {
    try {
      await evaluateCompetitiveLeagues();
    } catch (err) {
      console.error('Leagues evaluation scheduled job failed:', err);
    }
  }, INTERVAL_MS);
}
