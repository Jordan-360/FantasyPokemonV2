// Builds the list of every draftable player:
// offensive pairs (QB, RB, WR, TE, K) plus the 32 team D/ST units.
// Individual defenders (position "DEF") are not draftable on their own.

export const POSITION_FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'QB', label: 'QB' },
  { id: 'RB', label: 'RB' },
  { id: 'WR', label: 'WR' },
  { id: 'TE', label: 'TE' },
  { id: 'K', label: 'K' },
  { id: 'DST', label: 'D/ST' },
]

export function positionLabel(position) {
  return position === 'DST' ? 'D/ST' : position
}

function buildDstUnit(unit, pairsById) {
  const members = unit.memberIds.map((id) => pairsById.get(id)).filter(Boolean)
  const avgOvr = members.reduce((sum, p) => sum + p.maddenOvr, 0) / members.length

  return {
    id: `DST-${unit.team}`,
    pokemon: `${unit.team} D/ST`,
    types: [unit.dominantType],
    position: 'DST',
    player: `${members.length}-Pokémon defense · ${unit.dominantType}`,
    team: unit.team,
    maddenOvr: Math.round(avgOvr),
  }
}

export function buildPlayerPool(pairs, dstUnits) {
  const pairsById = new Map(pairs.map((p) => [p.id, p]))
  const offense = pairs.filter((p) => p.position !== 'DEF')
  const defenses = dstUnits.map((unit) => buildDstUnit(unit, pairsById))

  return [...offense, ...defenses].sort((a, b) => b.maddenOvr - a.maddenOvr)
}
