// Builds the list of every draftable player:
// offensive pairs (QB, RB, WR, TE, K) plus the 32 team D/ST units.
// Individual defenders (position "DEF") are not draftable on their own.
//
// Every pool entry has:
//   id          stable key (Pokédex number for pairs, "DST-SF" for D/ST units)
//   key         key into weekly_points.json / projections.json (playerId or "DST-SF")
//   projection  preseason projected points per game

import { replacementLevels } from './draft.js'

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

function buildDstUnit(unit, pairsById, projections) {
  const members = unit.memberIds.map((id) => pairsById.get(id)).filter(Boolean)
  const avgOvr = members.reduce((sum, p) => sum + p.maddenOvr, 0) / members.length
  const id = `DST-${unit.team}`

  return {
    id,
    key: id,
    pokemon: `${unit.team} D/ST`,
    types: [unit.dominantType],
    position: 'DST',
    player: `${members.length}-Pokémon defense · ${unit.dominantType}`,
    team: unit.team,
    maddenOvr: Math.round(avgOvr),
    memberIds: unit.memberIds,
    projection: projections[id] ?? 0,
  }
}

export function buildPlayerPool(pairs, dstUnits, projections = {}) {
  const pairsById = new Map(pairs.map((p) => [p.id, p]))
  const offense = pairs
    .filter((p) => p.position !== 'DEF')
    .map((p) => ({ ...p, key: p.playerId, projection: projections[p.playerId] ?? 0 }))
  const defenses = dstUnits.map((unit) => buildDstUnit(unit, pairsById, projections))

  return [...offense, ...defenses].sort((a, b) => b.maddenOvr - a.maddenOvr)
}

// An evolved form can match a Pokémon another player already is (Duosion → Reuniclus
// while someone else is Reuniclus). Those forms get the original in brackets,
// "Reuniclus (Duosion)", so two players never share a name.
function disambiguateEvolutions(evolutions, pool) {
  const taken = new Set(pool.map((p) => p.pokemon))
  const byId = new Map(pool.map((p) => [p.id, p]))
  const out = {}
  for (const [id, chain] of Object.entries(evolutions)) {
    const original = byId.get(id)?.pokemon
    out[id] = chain.map((name) => (taken.has(name) && original ? `${name} (${original})` : name))
  }
  return out
}

// Everything the game engine needs to look players and stats up.
export function createGameContext({
  pairs,
  dstUnits,
  projections,
  weekly,
  evolutions,
  statLines = {},
}) {
  const pool = buildPlayerPool(pairs, dstUnits, projections)
  return {
    evolutions: disambiguateEvolutions(evolutions, pool),
    pool,
    byId: new Map(pool.map((p) => [p.id, p])),
    levels: replacementLevels(pool), // preseason replacement PPG per position
    weekly,
    statLines,
  }
}
