// Weekly scoring: real points × (1 + Pokémon layer), plus evolution and shiny tracking.
// See docs/SPECS.md §4.

import { bestMultiplier, typeModFor } from './typeChart.js'
import { STARTER_SLOTS } from './lineup.js'
import { faintedReason, realPoints } from './projections.js'

export const LAYER_CAP = 0.1
export const EVOLUTION_BONUS = 0.03
export const MAX_STAGES = 2
const WEEKS_PER_EVOLUTION = 3

const QUALIFY = { K: 12, DST: 15 } // everyone else: 20
const SHINY = { K: 20, DST: 20 } // everyone else: 30

const round1 = (n) => Math.round(n * 10) / 10
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

export const emptyStatus = () => ({ qualifying: 0, stages: 0, shiny: false })

// Type matchup for one starter against the opponent's lineup.
// Returns the multiplier (null when there's nothing to compare against).
export function matchupMultiplier(slot, player, opponentLineup, byId) {
  if (!player || slot === 'K') return null
  if (slot === 'DST') {
    const qb = byId.get(opponentLineup.QB)
    return qb ? bestMultiplier(player.types, qb.types) : null
  }
  const dst = byId.get(opponentLineup.DST)
  return dst ? bestMultiplier(player.types, dst.types) : null
}

export function evolutionBonus(status) {
  return EVOLUTION_BONUS * Math.min(status?.stages ?? 0, MAX_STAGES)
}

// The evolved form shown on cards ("Charmander → Charmeleon"); the pair keeps its NFL player.
export function displayName(player, status, evolutions) {
  const stages = status?.stages ?? 0
  if (!stages) return player.pokemon
  const chain = evolutions[player.id] ?? []
  return chain[Math.min(stages, chain.length) - 1] ?? player.pokemon
}

export function scoreStarter(slot, player, opponentLineup, week, ctx, statuses) {
  const fainted = faintedReason(player, week, ctx)
  const real = fainted ? 0 : (realPoints(player, week, ctx) ?? 0)
  const multiplier = matchupMultiplier(slot, player, opponentLineup, ctx.byId)
  const typeMod = typeModFor(multiplier)
  const evoBonus = evolutionBonus(statuses[player.id])
  const layer = clamp(typeMod + evoBonus, -LAYER_CAP, LAYER_CAP)

  return {
    slot,
    id: player.id,
    real,
    fainted,
    multiplier,
    typeMod,
    evoBonus,
    points: round1(real * (1 + layer)),
  }
}

export function scoreTeam(lineup, opponentLineup, week, ctx, statuses) {
  const players = []
  for (const { id: slot } of STARTER_SLOTS) {
    const player = ctx.byId.get(lineup[slot])
    if (player) players.push(scoreStarter(slot, player, opponentLineup, week, ctx, statuses))
  }
  const total = round1(players.reduce((sum, p) => sum + p.points, 0))
  return { total, players }
}

// Higher score wins. Equal scores: compare starters' scores from highest down (§7.3).
// Returns 'a' or 'b'. If every starter matches too, the higher seed / home team (a) wins.
export function decideWinner(a, b) {
  if (a.total !== b.total) return a.total > b.total ? 'a' : 'b'
  const sa = a.players.map((p) => p.points).sort((x, y) => y - x)
  const sb = b.players.map((p) => p.points).sort((x, y) => y - x)
  for (let i = 0; i < Math.max(sa.length, sb.length); i++) {
    const x = sa[i] ?? -Infinity
    const y = sb[i] ?? -Infinity
    if (x !== y) return x > y ? 'a' : 'b'
  }
  return 'a'
}

// After a week resolves: count qualifying weeks, evolve, and make Pokémon shiny.
// Tracked for every player in the pool, so free agents keep their progress.
export function updateStatuses(statuses, week, ctx) {
  const next = { ...statuses }
  const events = []

  for (const player of ctx.pool) {
    const pts = realPoints(player, week, ctx)
    if (pts === null) continue

    const before = statuses[player.id] ?? emptyStatus()
    const status = { ...before }
    const qualifyAt = QUALIFY[player.position] ?? 20
    const shinyAt = SHINY[player.position] ?? 30

    if (status.stages < MAX_STAGES && pts >= qualifyAt) {
      status.qualifying += 1
      if (status.qualifying >= WEEKS_PER_EVOLUTION) {
        const chain = ctx.evolutions[player.id] ?? []
        status.stages += 1
        status.qualifying = 0
        events.push({
          type: status.stages <= chain.length ? 'evolve' : 'powerup',
          id: player.id,
          from: displayName(player, before, ctx.evolutions),
          to: displayName(player, status, ctx.evolutions),
        })
      }
    }

    if (!status.shiny && pts >= shinyAt) {
      status.shiny = true
      events.push({ type: 'shiny', id: player.id, points: pts })
    }

    if (
      status.qualifying !== before.qualifying ||
      status.stages !== before.stages ||
      status.shiny !== before.shiny
    ) {
      next[player.id] = status
    }
  }

  return { statuses: next, events }
}
