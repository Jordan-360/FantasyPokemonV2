// Runs a whole league from the command line and checks the rules hold.
//
//   npm run simulate                    draft + every week with real stats
//   npm run simulate -- --fill-future   also fakes weeks 9-16 (resampled from real weeks)
//                                       to exercise the playoffs
//   npm run simulate -- --seed 42       different draft order

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createGameContext } from '../src/lib/players.js'
import {
  autoDraftRest,
  canPlayWeek,
  createLeague,
  optimizeLineup,
  playWeek,
} from '../src/lib/season.js'
import { STARTER_SLOTS, ROSTER_SIZE } from '../src/lib/lineup.js'
import { sortStandings, FINAL_WEEK } from '../src/lib/league.js'

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data')
const load = (name) => JSON.parse(readFileSync(join(DATA, name), 'utf8'))

const args = process.argv.slice(2)
const seed = Number(args[args.indexOf('--seed') + 1]) || 7
const fillFuture = args.includes('--fill-future')

// Small seeded RNG so runs are repeatable
function mulberry32(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const random = mulberry32(seed)

const weekly = load('weekly_points.json')
if (fillFuture) {
  const real = weekly.weeksAvailable.length
  for (const pts of Object.values(weekly.points)) {
    for (let w = real; w < FINAL_WEEK; w++) pts[w] = pts[Math.floor(random() * real)]
  }
  weekly.weeksAvailable = Array.from({ length: FINAL_WEEK }, (_, i) => i + 1)
  weekly.byes = Object.fromEntries(Object.keys(weekly.byes).map((t) => [t, []]))
}

const ctx = createGameContext({
  pairs: load('pairs.json'),
  dstUnits: load('dst_units.json'),
  projections: load('projections.json'),
  weekly,
  evolutions: load('evolutions.json'),
})

const failures = []
const check = (ok, message) => ok || failures.push(message)

// ----- Draft -----
let state = autoDraftRest(
  createLeague({ leagueName: 'Sim League', teamName: 'Sim Team' }, random),
  ctx
)
check(state.phase === 'season', 'draft did not finish')

const nameOf = (id) => state.teams.find((t) => t.id === id).name
for (const team of state.teams) {
  const roster = state.rosters[team.id]
  const positions = roster.players.map((id) => ctx.byId.get(id).position)
  const count = (pos) => positions.filter((p) => p === pos).length
  check(roster.players.length === ROSTER_SIZE, `${team.name} has ${roster.players.length} players`)
  check(count('K') === 1, `${team.name} has ${count('K')} kickers`)
  check(count('DST') === 1, `${team.name} has ${count('DST')} D/ST`)
  for (const { id } of STARTER_SLOTS) {
    check(roster.lineup[id], `${team.name} has no starter at ${id}`)
  }
  const summary = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'].map((p) => `${p}${count(p)}`).join(' ')
  console.log(`${team.name.padEnd(22)} OVR ${team.ovr}  ${summary}`)
}

const firstRound = state.draft.picks.slice(0, 10).map((p) => {
  const pl = ctx.byId.get(p.playerId)
  return `${pl.pokemon} (${pl.position}, ${pl.player})`
})
console.log(`\nFirst round: ${firstRound.join(', ')}`)

// ----- Season -----
while (canPlayWeek(state, ctx)) {
  state = optimizeLineup(state, 'user', ctx)
  const week = state.currentWeek
  state = playWeek(state, ctx)
  const top = state.results[week]
    .map((r) => `${nameOf(r.a)} ${r.scoreA}-${r.scoreB} ${nameOf(r.b)}`)
    .join(' | ')
  console.log(`\nWeek ${week}: ${top}`)
  for (const e of state.events[week].filter((e) => e.type !== 'shiny').slice(0, 3)) {
    console.log(`  ${e.type}: ${e.from} → ${e.to}`)
  }
}

console.log('\nStandings:')
for (const t of sortStandings(state.teams)) {
  console.log(`  ${t.name.padEnd(22)} ${t.wins}-${t.losses}  PF ${t.pointsFor}`)
}
const claims = state.transactions.filter((t) => t.teamId !== 'user')
console.log(`\nCPU waiver claims: ${claims.length}`)
for (const team of state.teams) {
  check(state.rosters[team.id].players.length === ROSTER_SIZE, `${team.name} roster size changed`)
  const perWeek = {}
  for (const t of claims.filter((c) => c.teamId === team.id))
    perWeek[t.week] = (perWeek[t.week] ?? 0) + 1
  check(
    Object.values(perWeek).every((n) => n <= 2),
    `${team.name} made more than 2 claims in a week`
  )
}

if (state.playoffs) {
  console.log(`Playoff seeds: ${state.playoffs.seeds.map(nameOf).join(', ')}`)
  if (state.playoffs.champion) console.log(`Champion: ${nameOf(state.playoffs.champion)}`)
}
if (fillFuture) check(state.phase === 'complete', `season ended in phase ${state.phase}`)

const wins = state.teams.reduce((s, t) => s + t.wins, 0)
const losses = state.teams.reduce((s, t) => s + t.losses, 0)
check(wins === losses, 'wins and losses do not balance')

if (failures.length) {
  console.error(`\n✗ ${failures.length} check(s) failed:\n  ${failures.join('\n  ')}`)
  process.exit(1)
}
console.log('\n✓ All checks passed')
