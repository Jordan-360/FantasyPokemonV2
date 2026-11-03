// The league state machine: setup → draft → regular season → playoffs → complete.
// Every function takes the current state and returns a new one (nothing is mutated),
// so the UI can save each state straight to localStorage.

import { bestPickFor, ROUNDS, shuffle, snakeOrder } from './draft.js'
import {
  createTeams,
  FINAL_WEEK,
  generateSchedule,
  PLAYOFF_TEAMS,
  REGULAR_SEASON_WEEKS,
  SEMIFINAL_WEEK,
  sortStandings,
} from './league.js'
import { bestLineup, ROSTER_SIZE, SLOT_POSITIONS, STARTER_SLOTS } from './lineup.js'
import { faintedReason, isWeekAvailable, projectedPPG, weekProjection } from './projections.js'
import { decideWinner, scoreTeam, updateStatuses } from './scoring.js'
import { applyClaim, freeAgentsOf, runCpuWaivers, waiverOrder } from './waivers.js'

export const STATE_VERSION = 1

// ---------- Setup ----------

export function createLeague({ leagueName, teamName }, random = Math.random) {
  const teams = createTeams(teamName.trim() || 'My Team')
  const order = shuffle(
    teams.map((t) => t.id),
    random
  )

  return {
    version: STATE_VERSION,
    leagueName: leagueName.trim() || 'Fantasy Pokémon League',
    phase: 'draft',
    teams,
    schedule: generateSchedule(teams.map((t) => t.id)),
    draft: { order, pickOrder: snakeOrder(order, ROUNDS), picks: [] },
    rosters: Object.fromEntries(teams.map((t) => [t.id, { players: [], lineup: {} }])),
    currentWeek: 1,
    results: {},
    playoffs: null,
    statuses: {},
    events: {},
    waiverPriority: [],
    transactions: [],
  }
}

// ---------- Draft ----------

export function currentPick(state) {
  if (state.phase !== 'draft') return null
  const index = state.draft.picks.length
  const { pickOrder } = state.draft
  if (index >= pickOrder.length) return null
  const teamCount = state.teams.length
  return {
    index,
    teamId: pickOrder[index],
    round: Math.floor(index / teamCount) + 1,
    pickInRound: (index % teamCount) + 1,
  }
}

export function draftedIds(state) {
  return new Set(state.draft.picks.map((p) => p.playerId))
}

export function availableForDraft(state, ctx) {
  const taken = draftedIds(state)
  return ctx.pool.filter((p) => !taken.has(p.id))
}

// The CPU logic's choice for whoever is on the clock (also used for the human's auto-pick).
export function suggestedPick(state, ctx) {
  const pick = currentPick(state)
  if (!pick) return null
  return bestPickFor({
    teamId: pick.teamId,
    rosterIds: state.rosters[pick.teamId].players,
    available: availableForDraft(state, ctx),
    pickOrder: state.draft.pickOrder,
    pickIndex: pick.index,
    byId: ctx.byId,
    levels: ctx.levels,
  }).id
}

export function makePick(state, playerId, ctx) {
  const pick = currentPick(state)
  if (!pick || draftedIds(state).has(playerId) || !ctx.byId.has(playerId)) return state

  const roster = state.rosters[pick.teamId]
  const next = {
    ...state,
    draft: {
      ...state.draft,
      picks: [...state.draft.picks, { teamId: pick.teamId, playerId, index: pick.index }],
    },
    rosters: {
      ...state.rosters,
      [pick.teamId]: { ...roster, players: [...roster.players, playerId] },
    },
  }

  return currentPick(next) ? next : finishDraft(next, ctx)
}

// CPU teams pick until it's the human's turn (or the draft ends).
export function runCpuPicks(state, ctx, { max = Infinity } = {}) {
  let next = state
  let made = 0
  for (let pick = currentPick(next); pick && made < max; pick = currentPick(next)) {
    if (pick.teamId === 'user') break
    next = makePick(next, suggestedPick(next, ctx), ctx)
    made++
  }
  return next
}

// Auto-drafts every remaining pick, the human's included.
export function autoDraftRest(state, ctx) {
  let next = state
  while (currentPick(next)) next = makePick(next, suggestedPick(next, ctx), ctx)
  return next
}

export function teamOvr(lineup, byId) {
  const ratings = STARTER_SLOTS.map((s) => byId.get(lineup[s.id])?.maddenOvr).filter(
    (r) => r !== undefined
  )
  if (!ratings.length) return null
  return Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
}

function finishDraft(state, ctx) {
  const rosters = {}
  for (const [teamId, roster] of Object.entries(state.rosters)) {
    rosters[teamId] = { ...roster, lineup: autoLineup(roster.players, 1, ctx, 0) }
  }
  const teams = state.teams.map((t) => ({ ...t, ovr: teamOvr(rosters[t.id].lineup, ctx.byId) }))

  return {
    ...state,
    phase: 'season',
    teams,
    rosters,
    waiverPriority: waiverOrder(teams),
  }
}

// ---------- Lineups ----------

export function autoLineup(playerIds, week, ctx, throughWeek = week - 1) {
  return bestLineup(
    playerIds,
    ctx.byId,
    (p) => projectedPPG(p, ctx, throughWeek),
    (p) => !faintedReason(p, week, ctx)
  )
}

// Saves a team's roster and refreshes its team OVR (average of the starters' ratings).
function updateRoster(state, teamId, roster, ctx) {
  return {
    ...state,
    rosters: { ...state.rosters, [teamId]: roster },
    teams: state.teams.map((t) =>
      t.id === teamId ? { ...t, ovr: teamOvr(roster.lineup, ctx.byId) } : t
    ),
  }
}

// Puts a rostered player into a slot. Whoever was there goes to the bench,
// or swaps into the player's old slot if that's a legal move.
export function startPlayer(state, teamId, playerId, slot, ctx) {
  const roster = state.rosters[teamId]
  const player = ctx.byId.get(playerId)
  if (!roster.players.includes(playerId) || !SLOT_POSITIONS[slot].includes(player.position)) {
    return state
  }

  const lineup = { ...roster.lineup }
  const fromSlot = Object.keys(lineup).find((s) => lineup[s] === playerId)
  const displaced = lineup[slot]
  lineup[slot] = playerId
  if (fromSlot) {
    delete lineup[fromSlot]
    const d = ctx.byId.get(displaced)
    if (d && SLOT_POSITIONS[fromSlot].includes(d.position)) lineup[fromSlot] = displaced
  }
  return updateRoster(state, teamId, { ...roster, lineup }, ctx)
}

export function benchPlayer(state, teamId, slot, ctx) {
  const roster = state.rosters[teamId]
  const lineup = { ...roster.lineup }
  delete lineup[slot]
  return updateRoster(state, teamId, { ...roster, lineup }, ctx)
}

export function optimizeLineup(state, teamId, ctx) {
  const roster = state.rosters[teamId]
  return updateRoster(
    state,
    teamId,
    {
      ...roster,
      lineup: autoLineup(roster.players, state.currentWeek, ctx),
    },
    ctx
  )
}

// CPU managers start their best healthy players every week.
function setCpuLineups(state, ctx) {
  let next = state
  for (const team of state.teams) {
    if (!team.isUser) next = optimizeLineup(next, team.id, ctx)
  }
  return next
}

// ---------- Free agents ----------

export function freeAgents(state, ctx) {
  return freeAgentsOf(state.rosters, ctx)
}

export function canClaim(state) {
  return state.phase === 'season'
}

// The human adds a free agent (and drops someone if the roster is full).
export function claimPlayer(state, addId, dropId, ctx) {
  if (!canClaim(state)) return state
  const roster = state.rosters.user
  const isFree = freeAgents(state, ctx).some((p) => p.id === addId)
  const needsDrop = roster.players.length >= ROSTER_SIZE
  if (!isFree || (needsDrop && !roster.players.includes(dropId))) return state

  const next = updateRoster(
    state,
    'user',
    applyClaim(roster, addId, needsDrop ? dropId : null, ctx),
    ctx
  )
  return {
    ...next,
    waiverPriority: [...state.waiverPriority.filter((id) => id !== 'user'), 'user'],
    transactions: [
      ...state.transactions,
      { week: state.currentWeek, teamId: 'user', addId, dropId: needsDrop ? dropId : null },
    ],
  }
}

// ---------- Weeks ----------

export function gamesForWeek(state, week) {
  if (week <= REGULAR_SEASON_WEEKS) return state.schedule[week - 1]?.games ?? []
  if (!state.playoffs) return []
  if (week === SEMIFINAL_WEEK) return state.playoffs.semis
  if (week === FINAL_WEEK) return state.playoffs.final ? [state.playoffs.final] : []
  return []
}

export function userGame(state, week = state.currentWeek) {
  const game = gamesForWeek(state, week).find((g) => g.includes('user'))
  if (!game) return null
  return { game, opponentId: game[0] === 'user' ? game[1] : game[0] }
}

// Your game result for a played week, or null
export function userResult(state, week) {
  return state.results[week]?.find((r) => r.a === 'user' || r.b === 'user') ?? null
}

// Weeks you've played, oldest first
export function playedUserWeeks(state) {
  return Object.keys(state.results)
    .map(Number)
    .filter((w) => userResult(state, w))
    .sort((a, b) => a - b)
}

export function canPlayWeek(state, ctx) {
  return state.phase === 'season' && isWeekAvailable(state.currentWeek, ctx)
}

// Projected total for a lineup this week (before it's played).
export function projectedTotal(lineup, week, ctx) {
  const total = STARTER_SLOTS.reduce((sum, { id }) => {
    const p = ctx.byId.get(lineup[id])
    return sum + (p ? weekProjection(p, week, ctx) : 0)
  }, 0)
  return Math.round(total * 10) / 10
}

// Every game in a week for the scoreboard. Played weeks use the stored results;
// the current week shows projected totals and lineups.
export function weekScoreboard(state, week, ctx) {
  if (state.results[week]) {
    return state.results[week].map((r) => ({ ...r, final: true }))
  }
  if (week !== state.currentWeek || state.phase !== 'season') return []

  const projectedLines = (lineup) =>
    STARTER_SLOTS.filter(({ id }) => lineup[id]).map(({ id: slot }) => {
      const p = ctx.byId.get(lineup[slot])
      return {
        slot,
        id: p.id,
        fainted: faintedReason(p, week, ctx),
        projection: weekProjection(p, week, ctx),
      }
    })

  return gamesForWeek(state, week).map(([a, b]) => ({
    a,
    b,
    scoreA: projectedTotal(state.rosters[a].lineup, week, ctx),
    scoreB: projectedTotal(state.rosters[b].lineup, week, ctx),
    lineA: projectedLines(state.rosters[a].lineup),
    lineB: projectedLines(state.rosters[b].lineup),
    winner: null,
    final: false,
  }))
}

// Plays the current week: scores every game, updates records, evolutions and shinies,
// advances the playoff bracket, then runs CPU waivers and lineups for the next week.
export function playWeek(state, ctx) {
  if (!canPlayWeek(state, ctx)) return state
  const week = state.currentWeek
  const games = gamesForWeek(state, week)

  const results = []
  const records = new Map(state.teams.map((t) => [t.id, { ...t }]))

  for (const [a, b] of games) {
    const lineupA = state.rosters[a].lineup
    const lineupB = state.rosters[b].lineup
    const scoreA = scoreTeam(lineupA, lineupB, week, ctx, state.statuses)
    const scoreB = scoreTeam(lineupB, lineupA, week, ctx, state.statuses)
    const winner = decideWinner(scoreA, scoreB) === 'a' ? a : b
    results.push({
      a,
      b,
      scoreA: scoreA.total,
      scoreB: scoreB.total,
      winner,
      lineA: scoreA.players,
      lineB: scoreB.players,
    })

    if (week <= REGULAR_SEASON_WEEKS) {
      const ra = records.get(a)
      const rb = records.get(b)
      ra.pointsFor = round1(ra.pointsFor + scoreA.total)
      ra.pointsAgainst = round1(ra.pointsAgainst + scoreB.total)
      rb.pointsFor = round1(rb.pointsFor + scoreB.total)
      rb.pointsAgainst = round1(rb.pointsAgainst + scoreA.total)
      records.get(winner).wins++
      records.get(winner === a ? b : a).losses++
    }
  }

  const { statuses, events } = updateStatuses(state.statuses, week, ctx)
  const teams = state.teams.map((t) => records.get(t.id))

  let next = {
    ...state,
    teams,
    statuses,
    results: { ...state.results, [week]: results },
    events: { ...state.events, [week]: events },
    currentWeek: week + 1,
  }

  if (week === REGULAR_SEASON_WEEKS) {
    const seeds = sortStandings(teams)
      .slice(0, PLAYOFF_TEAMS)
      .map((t) => t.id)
    next.playoffs = {
      seeds,
      semis: [
        [seeds[0], seeds[3]],
        [seeds[1], seeds[2]],
      ],
      final: null,
      champion: null,
    }
  } else if (week === SEMIFINAL_WEEK) {
    next.playoffs = { ...next.playoffs, final: results.map((r) => r.winner) }
  } else if (week === FINAL_WEEK) {
    next.playoffs = { ...next.playoffs, champion: results[0]?.winner ?? null }
    next.phase = 'complete'
    return next
  }

  next.waiverPriority = waiverOrder(teams)
  next = runCpuWaivers(next, ctx)
  return setCpuLineups(next, ctx)
}

const round1 = (n) => Math.round(n * 10) / 10
