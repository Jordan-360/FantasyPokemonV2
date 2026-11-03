// Projections and availability ("fainted") for any player in any week.

const PRESEASON_WEIGHT = 3 // the preseason projection counts as this many games

export function isWeekAvailable(week, ctx) {
  return ctx.weekly.weeksAvailable.includes(week)
}

export function realPoints(player, week, ctx) {
  const value = ctx.weekly.points[player.key]?.[week - 1]
  return value === undefined ? null : value
}

// Why a player can't play this week, or null if they're good to go.
// For weeks whose stats are out we know who played; for future weeks only byes are known.
export function faintedReason(player, week, ctx) {
  const onBye = (ctx.weekly.byes[player.team] ?? []).includes(week)
  if (isWeekAvailable(week, ctx)) {
    if (realPoints(player, week, ctx) !== null) return null
    return onBye ? 'bye' : 'out'
  }
  return onBye ? 'bye' : null
}

// Projected points per game, updated with real 2026 results through `throughWeek`.
export function projectedPPG(player, ctx, throughWeek = 0) {
  let total = player.projection * PRESEASON_WEIGHT
  let games = PRESEASON_WEIGHT
  for (let w = 1; w <= throughWeek; w++) {
    const pts = realPoints(player, w, ctx)
    if (pts !== null) {
      total += pts
      games++
    }
  }
  return total / games
}

// What a player is expected to score in a specific week (0 if fainted).
export function weekProjection(player, week, ctx, throughWeek = week - 1) {
  return faintedReason(player, week, ctx) ? 0 : projectedPPG(player, ctx, throughWeek)
}
