// Unit tests for the scoring rules (docs/SPECS.md §4, §7.3).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bestMultiplier, effectiveness, typeModFor } from '../src/lib/typeChart.js'
import { decideWinner, scoreTeam } from '../src/lib/scoring.js'
import { makeContext } from './helpers.js'

test('type chart matches Gen 6', () => {
  assert.equal(effectiveness('Fire', 'Grass'), 2)
  assert.equal(effectiveness('Normal', 'Ghost'), 0)
  assert.equal(effectiveness('Dragon', 'Fairy'), 0)
  assert.equal(effectiveness('Water', 'Water'), 0.5)
  assert.equal(effectiveness('Psychic', 'Normal'), 1)
})

test('best multiplier takes the best single-type matchup', () => {
  assert.equal(bestMultiplier(['Normal', 'Fire'], ['Grass']), 2)
  assert.equal(bestMultiplier(['Electric'], ['Ground', 'Water']), 2)
})

test('type modifier tiers', () => {
  assert.equal(typeModFor(4), 0.05)
  assert.equal(typeModFor(2), 0.05)
  assert.equal(typeModFor(1), 0)
  assert.equal(typeModFor(0.5), -0.05)
  assert.equal(typeModFor(0), -0.08)
  assert.equal(typeModFor(null), 0)
})

test('ties go to the team whose best starter scored more, then the next best', () => {
  const team = (...pts) => ({
    total: pts.reduce((a, b) => a + b, 0),
    players: pts.map((points) => ({ points })),
  })
  assert.equal(decideWinner(team(20, 10), team(15, 15)), 'a')
  assert.equal(decideWinner(team(15, 15), team(20, 10)), 'b')
  assert.equal(decideWinner(team(20, 6, 4), team(20, 7, 3)), 'b')
  assert.equal(decideWinner(team(10, 10), team(10, 10)), 'a')
})

test('Pokémon layer never moves a score more than 10%', () => {
  const ctx = makeContext()
  const qb = ctx.pool.find((p) => p.position === 'QB')
  const dst = ctx.pool.find((p) => p.position === 'DST')
  const statuses = { [qb.id]: { stages: 2, qualifying: 0, shiny: false } } // +6% evolution
  for (let week = 1; week <= 8; week++) {
    const { players } = scoreTeam({ QB: qb.id }, { DST: dst.id }, week, ctx, statuses)
    for (const l of players) {
      if (l.real)
        assert.ok(Math.abs(l.points / l.real - 1) <= 0.1 + 0.01, `${l.points} vs ${l.real}`)
      if (l.fainted) assert.equal(l.points, 0)
    }
  }
})

test('evolved forms never share a name with another player', () => {
  const ctx = makeContext()
  const base = new Set(ctx.pool.map((p) => p.pokemon))
  // Defenders aren't shown on their own (they play as a D/ST), so only pool players count
  for (const [id, chain] of Object.entries(ctx.evolutions)) {
    if (!ctx.byId.has(id)) continue
    for (const name of chain) {
      assert.ok(!base.has(name), `${ctx.byId.get(id)?.pokemon} → ${name} clashes`)
    }
  }
})
