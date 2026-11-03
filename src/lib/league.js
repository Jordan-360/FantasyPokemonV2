export const CPU_TEAM_NAMES = [
  'Team Rocket',
  'Cerulean Splash',
  'Vermilion Thunder',
  'Pewter Rockslides',
  'Saffron Psychics',
  'Lavender Town Ghosts',
  'Celadon Leafguards',
  'Cinnabar Volcanoes',
  'Viridian Rangers',
]

export const REGULAR_SEASON_WEEKS = 14
export const PLAYOFF_TEAMS = 4

// You + 9 CPU teams
export function createTeams(userTeamName) {
  const you = { id: 'user', name: userTeamName, isUser: true, wins: 0, losses: 0, ovr: null }
  const cpus = CPU_TEAM_NAMES.map((name, i) => ({
    id: `cpu${i + 1}`,
    name,
    isUser: false,
    wins: 0,
    losses: 0,
    ovr: null, // team Madden OVR, filled in after the draft
  }))
  return [you, ...cpus]
}

// Round-robin schedule: everyone plays everyone once (9 weeks),
// then it starts over until the season has 14 weeks.
export function generateSchedule(teamIds, weeks = REGULAR_SEASON_WEEKS) {
  const ids = [...teamIds]
  const rounds = []

  for (let r = 0; r < ids.length - 1; r++) {
    const games = []
    for (let i = 0; i < ids.length / 2; i++) {
      games.push([ids[i], ids[ids.length - 1 - i]])
    }
    rounds.push(games)
    // Keep the first team fixed and rotate everyone else one spot
    ids.splice(1, 0, ids.pop())
  }

  return Array.from({ length: weeks }, (_, w) => ({
    week: w + 1,
    games: rounds[w % rounds.length],
  }))
}

// Most wins first, then fewest losses, then team OVR (the preseason ranking)
export function sortStandings(teams) {
  return [...teams].sort(
    (a, b) => b.wins - a.wins || a.losses - b.losses || (b.ovr ?? 0) - (a.ovr ?? 0)
  )
}
