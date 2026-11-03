// Snake draft + CPU pick logic (docs/SPECS.md §3).
//
// pick score = VOR × needMultiplier + 0.5 × scarcity   (Madden OVR breaks ties)

import { ROSTER_SIZE } from './lineup.js'

export const ROUNDS = ROSTER_SIZE // 15

export const REPLACEMENT_RANK = { QB: 12, RB: 30, WR: 30, TE: 12, K: 11, DST: 11 }

const BASE_STARTERS = { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DST: 1 }
const STARTER_COUNT = 9

// ---------- Order ----------

// Team id for every overall pick, snaking back and forth each round.
export function snakeOrder(order, rounds = ROUNDS) {
  const picks = []
  for (let r = 0; r < rounds; r++) {
    picks.push(...(r % 2 === 0 ? order : [...order].reverse()))
  }
  return picks
}

export function shuffle(list, random = Math.random) {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// ---------- Value over replacement ----------

export function replacementLevels(pool) {
  const levels = {}
  for (const [pos, rank] of Object.entries(REPLACEMENT_RANK)) {
    const ppg = pool
      .filter((p) => p.position === pos)
      .map((p) => p.projection)
      .sort((a, b) => b - a)
    levels[pos] = ppg[Math.min(rank, ppg.length) - 1] ?? 0
  }
  return levels
}

export const vor = (player, levels) => player.projection - levels[player.position]

// The human's "recommended" board: plain VOR, best first.
export function rankByVor(players, levels) {
  return [...players].sort((a, b) => vor(b, levels) - vor(a, levels) || b.maddenOvr - a.maddenOvr)
}

// ---------- Roster need ----------

function countPositions(ids, byId) {
  const counts = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 }
  for (const id of ids) counts[byId.get(id).position]++
  return counts
}

// How many of the 9 starting slots these position counts can fill
function filledStarters(c) {
  const flexPool = Math.max(0, c.RB - 2) + Math.max(0, c.WR - 2) + Math.max(0, c.TE - 1)
  return (
    Math.min(c.QB, 1) +
    Math.min(c.RB, 2) +
    Math.min(c.WR, 2) +
    Math.min(c.TE, 1) +
    Math.min(flexPool, 1) +
    Math.min(c.K, 1) +
    Math.min(c.DST, 1)
  )
}

export function openStarterSlots(counts) {
  return STARTER_COUNT - filledStarters(counts)
}

function fillsStarter(position, counts) {
  return filledStarters({ ...counts, [position]: counts[position] + 1 }) > filledStarters(counts)
}

export function needMultiplier(position, counts, round, rounds = ROUNDS) {
  if (position === 'K' || position === 'DST') {
    if (round <= rounds - 2) return 0
    return counts[position] >= 1 ? 0 : 1
  }
  if (fillsStarter(position, counts)) return 1
  if (position === 'RB' || position === 'WR') {
    // RB/WR beyond the starters; the first one of those is playing FLEX
    const extraRbWr = Math.max(0, counts.RB - 2) + Math.max(0, counts.WR - 2)
    const benchRbWr = Math.max(0, extraRbWr - 1)
    return benchRbWr === 0 ? 0.6 : 0.4
  }
  // QB or TE: backup is 0.2, a third is 0
  return counts[position] <= BASE_STARTERS[position] ? 0.2 : 0
}

// ---------- Scarcity ----------

function scarcityByPosition(available, levels, picksBetween) {
  const sorted = rankByVor(available, levels)
  const gone = new Set(sorted.slice(0, picksBetween).map((p) => p.id))
  const result = {}

  for (const pos of Object.keys(REPLACEMENT_RANK)) {
    const atPos = sorted.filter((p) => p.position === pos)
    if (!atPos.length || picksBetween <= 0) {
      result[pos] = 0
      continue
    }
    const now = vor(atPos[0], levels)
    const later = atPos.find((p) => !gone.has(p.id))
    result[pos] = later ? now - vor(later, levels) : now
  }
  return result
}

// ---------- Picks ----------

// Picks between this one and the same team's next pick (0 if it has no more picks).
function picksUntilNext(pickOrder, pickIndex) {
  const team = pickOrder[pickIndex]
  const next = pickOrder.indexOf(team, pickIndex + 1)
  return next === -1 ? 0 : next - pickIndex - 1
}

// Ranks every available player for the team on the clock and returns the best one.
export function bestPickFor({ teamId, rosterIds, available, pickOrder, pickIndex, byId, levels }) {
  const teamCount = new Set(pickOrder).size
  const rounds = pickOrder.length / teamCount
  const round = Math.floor(pickIndex / teamCount) + 1
  const counts = countPositions(rosterIds, byId)
  const scarcity = scarcityByPosition(available, levels, picksUntilNext(pickOrder, pickIndex))

  // Must every remaining pick fill a starting slot?
  const picksLeft = pickOrder.slice(pickIndex).filter((t) => t === teamId).length
  const mustFill = picksLeft <= openStarterSlots(counts)

  let best = null
  let bestScore = -Infinity

  for (const p of available) {
    let need = needMultiplier(p.position, counts, round, rounds)
    if (mustFill) {
      const fills =
        p.position === 'K' || p.position === 'DST'
          ? counts[p.position] === 0
          : fillsStarter(p.position, counts)
      need = fills ? 1 : 0
    }
    if (need === 0) continue

    const score = vor(p, levels) * need + 0.5 * scarcity[p.position]
    if (score > bestScore || (score === bestScore && p.maddenOvr > best.maddenOvr)) {
      best = p
      bestScore = score
    }
  }

  // Never stall: if every candidate was ruled out, take the best by VOR.
  return best ?? rankByVor(available, levels)[0]
}
