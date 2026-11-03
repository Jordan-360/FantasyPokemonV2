// Waivers (docs/SPECS.md §5).
// Priority resets every week in reverse standings order. A successful claim sends
// that team to the back of the line. CPU teams only claim when it clearly helps.

import { sortStandings } from './league.js'
import { bestLineup, SLOT_POSITIONS, STARTER_SLOTS } from './lineup.js'
import { faintedReason, projectedPPG } from './projections.js'

const MAX_CPU_CLAIMS = 2
const UPGRADE_THRESHOLD = 1.15
const BASE_STARTERS = { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DST: 1 }

export function waiverOrder(teams) {
  return sortStandings(teams)
    .reverse()
    .map((t) => t.id)
}

export function rosteredIds(rosters) {
  return new Set(Object.values(rosters).flatMap((r) => r.players))
}

export function freeAgentsOf(rosters, ctx) {
  const taken = rosteredIds(rosters)
  return ctx.pool.filter((p) => !taken.has(p.id))
}

// Lowest-value bench player at a position the team has more of than it starts.
function pickDrop(playerIds, lineup, addId, ctx, week) {
  const players = playerIds.map((id) => ctx.byId.get(id))
  const counts = {}
  for (const p of players) counts[p.position] = (counts[p.position] ?? 0) + 1
  counts[ctx.byId.get(addId).position]++

  const starters = new Set(Object.values(lineup))
  const value = (p) => projectedPPG(p, ctx, week - 1) - ctx.levels[p.position]

  const droppable = players.filter(
    (p) => !starters.has(p.id) && counts[p.position] > BASE_STARTERS[p.position]
  )
  if (!droppable.length) return null
  return droppable.reduce((a, b) => (value(b) < value(a) ? b : a)).id
}

// The single best claim for a CPU team for `week`, or null.
export function findCpuClaim(roster, freeAgents, ctx, week) {
  const proj = (p) => projectedPPG(p, ctx, week - 1)
  const healthy = (p) => !faintedReason(p, week, ctx)
  const lineup = bestLineup(roster.players, ctx.byId, proj, healthy)
  const bench = roster.players.filter((id) => !Object.values(lineup).includes(id))
  const available = freeAgents.filter(healthy)

  let best = null
  const consider = (fa, gain) => {
    if (gain > 0 && (!best || gain > best.gain)) best = { addId: fa.id, gain }
  }

  for (const { id: slot } of STARTER_SLOTS) {
    const positions = SLOT_POSITIONS[slot]
    const starter = ctx.byId.get(lineup[slot])
    const candidates = available.filter((p) => positions.includes(p.position))
    if (!candidates.length) continue
    const topFa = candidates.reduce((a, b) => (proj(b) > proj(a) ? b : a))

    // 1. Starter fainted (or slot empty): beat the best healthy bench option
    if (!starter || !healthy(starter)) {
      const benchOption = bench
        .map((id) => ctx.byId.get(id))
        .filter((p) => positions.includes(p.position) && healthy(p))
        .reduce((max, p) => Math.max(max, proj(p)), 0)
      if (proj(topFa) > benchOption) consider(topFa, proj(topFa) - benchOption)
      continue
    }

    // 2. A free agent projects at least 15% better than this starter
    if (proj(topFa) >= proj(starter) * UPGRADE_THRESHOLD) {
      consider(topFa, proj(topFa) - proj(starter))
    }
  }

  if (!best) return null
  const dropId = pickDrop(roster.players, lineup, best.addId, ctx, week)
  return dropId ? { addId: best.addId, dropId } : null
}

// Adds a player (dropping one if given) and keeps the lineup valid.
export function applyClaim(roster, addId, dropId, ctx) {
  const players = roster.players.filter((id) => id !== dropId)
  players.push(addId)

  const lineup = { ...roster.lineup }
  for (const [slot, id] of Object.entries(lineup)) {
    if (id === dropId) delete lineup[slot]
  }
  // Drop the new player straight into an empty slot they can play
  const added = ctx.byId.get(addId)
  const open = STARTER_SLOTS.find(
    (s) => !lineup[s.id] && SLOT_POSITIONS[s.id].includes(added.position)
  )
  if (open) lineup[open.id] = addId

  return { players, lineup }
}

// Runs every CPU team's claims for the coming week, in priority order.
export function runCpuWaivers(state, ctx) {
  const week = state.currentWeek
  let rosters = { ...state.rosters }
  let priority = [...state.waiverPriority]
  const claims = {}
  const transactions = []

  for (;;) {
    let claimed = false
    for (const teamId of priority) {
      const team = state.teams.find((t) => t.id === teamId)
      if (team.isUser || (claims[teamId] ?? 0) >= MAX_CPU_CLAIMS) continue

      const claim = findCpuClaim(rosters[teamId], freeAgentsOf(rosters, ctx), ctx, week)
      if (!claim) continue

      rosters = {
        ...rosters,
        [teamId]: applyClaim(rosters[teamId], claim.addId, claim.dropId, ctx),
      }
      claims[teamId] = (claims[teamId] ?? 0) + 1
      priority = [...priority.filter((id) => id !== teamId), teamId]
      transactions.push({ week, teamId, ...claim })
      claimed = true
      break
    }
    if (!claimed) break
  }

  return {
    ...state,
    rosters,
    waiverPriority: priority,
    transactions: [...state.transactions, ...transactions],
  }
}
