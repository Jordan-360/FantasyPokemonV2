// Whole-league tests: draft sanity (§3), waivers (§5), season and playoffs, plus the
// invariants that must hold after every action and every week.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as S from '../src/lib/season.js'
import { ROSTER_SIZE, SLOT_POSITIONS, STARTER_SLOTS } from '../src/lib/lineup.js'
import { makeContext, seeded } from './helpers.js'

function assertValid(state, ctx) {
  const seen = new Set()
  for (const [teamId, roster] of Object.entries(state.rosters)) {
    assert.ok(roster.players.length <= ROSTER_SIZE, `${teamId} has too many players`)
    for (const id of roster.players) {
      assert.ok(!seen.has(id), `${id} is on two rosters`)
      seen.add(id)
    }
    const used = new Set()
    for (const [slot, id] of Object.entries(roster.lineup)) {
      assert.ok(roster.players.includes(id), `${teamId} starts a player it doesn't roster`)
      assert.ok(SLOT_POSITIONS[slot].includes(ctx.byId.get(id).position), `illegal ${slot}`)
      assert.ok(!used.has(id), `${teamId} starts a player twice`)
      used.add(id)
    }
    if (teamId !== 'user') {
      for (const { id } of STARTER_SLOTS) assert.ok(roster.lineup[id], `${teamId} has no ${id}`)
    }
  }
}

test('the draft gives every team a full, legal roster with one K and one D/ST', () => {
  const ctx = makeContext()
  for (const seed of [1, 2, 3]) {
    const state = S.autoDraftRest(
      S.createLeague({ leagueName: 'L', teamName: 'T' }, seeded(seed)),
      ctx
    )
    assert.equal(state.phase, 'season')
    for (const team of state.teams) {
      const positions = state.rosters[team.id].players.map((id) => ctx.byId.get(id).position)
      assert.equal(positions.length, ROSTER_SIZE)
      assert.equal(positions.filter((p) => p === 'K').length, 1, `${team.name} kickers`)
      assert.equal(positions.filter((p) => p === 'DST').length, 1, `${team.name} D/ST`)
    }
    assertValid(state, ctx)
  }
})

test('a season with random human moves keeps every rule and ends with a champion', () => {
  const ctx = makeContext({ fillFuture: true })
  for (const seed of [11, 12, 13, 14, 15]) {
    const rand = seeded(seed)
    let s = S.autoDraftRest(S.createLeague({ leagueName: 'L', teamName: 'T' }, rand), ctx)

    while (S.canPlayWeek(s, ctx)) {
      const roster = s.rosters.user
      if (rand() < 0.5) {
        const fa = S.freeAgents(s, ctx)
        const drop = roster.players[Math.floor(rand() * roster.players.length)]
        s = S.claimPlayer(s, fa[Math.floor(rand() * fa.length)].id, drop, ctx)
      }
      if (rand() < 0.3) s = S.benchPlayer(s, 'user', 'QB', ctx)
      if (rand() < 0.6) s = S.optimizeLineup(s, 'user', ctx)
      assertValid(s, ctx)

      const week = s.currentWeek
      s = S.playWeek(s, ctx)
      assertValid(s, ctx)

      const cpuClaims = s.transactions.filter((t) => t.week === week + 1 && t.teamId !== 'user')
      for (const team of s.teams) {
        assert.ok(cpuClaims.filter((t) => t.teamId === team.id).length <= 2, 'max 2 CPU claims')
      }
    }

    assert.equal(s.phase, 'complete')
    assert.ok(s.playoffs.champion)
    const wins = s.teams.reduce((n, t) => n + t.wins, 0)
    const losses = s.teams.reduce((n, t) => n + t.losses, 0)
    assert.equal(wins, losses)
    assert.equal(wins, 14 * 5)
  }
})

test('team OVR follows roster changes', () => {
  const ctx = makeContext()
  let s = S.autoDraftRest(S.createLeague({ leagueName: 'L', teamName: 'T' }, seeded(5)), ctx)
  s = S.benchPlayer(s, 'user', 'QB', ctx)
  const user = s.teams.find((t) => t.isUser)
  assert.equal(user.ovr, S.teamOvr(s.rosters.user.lineup, ctx.byId))
})

test('claims are refused during the draft and need a drop when the roster is full', () => {
  const ctx = makeContext()
  const draft = S.createLeague({ leagueName: 'L', teamName: 'T' }, seeded(9))
  assert.equal(S.claimPlayer(draft, ctx.pool[0].id, null, ctx), draft)

  const s = S.autoDraftRest(draft, ctx)
  const fa = S.freeAgents(s, ctx)[0]
  assert.equal(S.claimPlayer(s, fa.id, null, ctx), s, 'full roster without a drop')
  const after = S.claimPlayer(s, fa.id, s.rosters.user.players[0], ctx)
  assert.ok(after.rosters.user.players.includes(fa.id))
  assert.equal(after.waiverPriority.at(-1), 'user', 'a claim sends you to the back of the line')
})
