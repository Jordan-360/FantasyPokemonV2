// Turns game state into what the cards show: evolved name, shiny, fainted,
// this week's type matchup and projection.

import { displayName, matchupMultiplier } from './scoring.js'
import { faintedReason, weekProjection } from './projections.js'

export function playerView(
  player,
  { ctx, week, statuses = {}, slot = null, opponentLineup = null }
) {
  if (!player) return null
  const status = statuses[player.id]
  const name = displayName(player, status, ctx.evolutions)

  return {
    player,
    name,
    evolvedFrom: name !== player.pokemon ? player.pokemon : null,
    stages: status?.stages ?? 0,
    shiny: status?.shiny ?? false,
    fainted: week ? faintedReason(player, week, ctx) : null,
    multiplier:
      slot && opponentLineup ? matchupMultiplier(slot, player, opponentLineup, ctx.byId) : null,
    projection: week ? weekProjection(player, week, ctx) : player.projection,
  }
}

export function faintedLabel(reason) {
  if (reason === 'bye') return 'Fainted · bye'
  if (reason === 'out') return 'Fainted · out'
  return null
}

export function effectivenessMark(multiplier) {
  if (multiplier === null || multiplier === undefined) return null
  if (multiplier >= 2) return { className: 'eff eff--super', symbol: '▲', text: 'Super effective' }
  if (multiplier === 0) return { className: 'eff eff--none', symbol: '✕', text: 'No effect' }
  if (multiplier < 1) return { className: 'eff eff--weak', symbol: '▼', text: 'Not very effective' }
  return null
}
