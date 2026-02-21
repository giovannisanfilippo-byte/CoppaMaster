/**
 * Generates a Round Robin tournament schedule.
 * 
 * @param teamIds Array of team IDs
 * @returns Array of rounds, each containing matches [teamA, teamB]
 */
export function generateRoundRobin(teamIds: string[]): { round: number; matches: [string, string | null][] }[] {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) {
    teams.push(null as any); // Add a dummy team for BYE
  }

  const numTeams = teams.length;
  const numRounds = numTeams - 1;
  const half = numTeams / 2;
  const schedule: { round: number; matches: [string, string | null][] }[] = [];

  const teamList = [...teams];

  for (let round = 0; round < numRounds; round++) {
    const roundMatches: [string, string | null][] = [];

    for (let i = 0; i < half; i++) {
      const teamA = teamList[i];
      const teamB = teamList[numTeams - 1 - i];
      
      if (teamA !== null || teamB !== null) {
        roundMatches.push([teamA, teamB]);
      }
    }

    schedule.push({ round: round + 1, matches: roundMatches });

    // Rotate teams (keep the first team fixed)
    const last = teamList.pop()!;
    teamList.splice(1, 0, last);
  }

  return schedule;
}
