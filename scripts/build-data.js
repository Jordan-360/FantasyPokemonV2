// Builds the generated data files in src/data/ from public sources:
//
//   weekly_points.json  real fantasy points per player / D/ST per 2026 week (nflverse)
//   projections.json    preseason projected points per game (2025 stats + Madden OVR)
//   evolutions.json     the next evolution stages for each paired Pokémon (PokeAPI)
//   stat_lines.json     a short box-score line per player / D/ST per week ("7 rec, 112 yds, 1 TD")
//
// Run it again whenever new NFL weeks have been played:
//   npm run build-data
//
// Scoring: ESPN standard PPR for offense, ESPN standard for K and D/ST.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const SEASON = 2026
const NFL_WEEKS = 18
const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data')

const NFLVERSE = 'https://github.com/nflverse/nflverse-data/releases/download'
const POKEAPI = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv'

const URLS = {
  playerWeeks: (season) => `${NFLVERSE}/stats_player/stats_player_week_${season}.csv`,
  teamWeeks: (season) => `${NFLVERSE}/stats_team/stats_team_week_${season}.csv`,
  games: `${NFLVERSE}/schedules/games.csv`,
  species: `${POKEAPI}/pokemon_species.csv`,
  speciesNames: `${POKEAPI}/pokemon_species_names.csv`,
}

// ---------- Helpers ----------

async function fetchCsv(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`)
  return parseCsv(await res.text())
}

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += c
    }
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }

  const [header, ...body] = rows
  return body
    .filter((r) => r.length === header.length)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])))
}

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const round1 = (n) => Math.round(n * 10) / 10
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length

function linearFit(points) {
  const mx = mean(points.map((p) => p[0]))
  const my = mean(points.map((p) => p[1]))
  let sxy = 0
  let sxx = 0
  for (const [x, y] of points) {
    sxy += (x - mx) * (y - my)
    sxx += (x - mx) ** 2
  }
  const slope = sxx ? sxy / sxx : 0
  return (x) => my + slope * (x - mx)
}

// ---------- Scoring ----------

function kickerPoints(r) {
  const fg3 = num(r.fg_made_0_19) + num(r.fg_made_20_29) + num(r.fg_made_30_39)
  const fg4 = num(r.fg_made_40_49)
  const fg5 = num(r.fg_made_50_59) + num(r.fg_made_60_)
  const fgMissed = num(r.fg_att) - num(r.fg_made)
  const patMissed = num(r.pat_att) - num(r.pat_made)
  return fg3 * 3 + fg4 * 4 + fg5 * 5 - fgMissed + num(r.pat_made) - patMissed
}

function playerPoints(r, position) {
  return position === 'K' ? kickerPoints(r) : num(r.fantasy_points_ppr)
}

function pointsAllowedScore(pa) {
  if (pa === 0) return 5
  if (pa <= 6) return 4
  if (pa <= 13) return 3
  if (pa <= 17) return 1
  if (pa <= 27) return 0
  if (pa <= 34) return -1
  if (pa <= 45) return -3
  return -5
}

function yardsAllowedScore(ya) {
  if (ya < 100) return 5
  if (ya < 200) return 3
  if (ya < 300) return 2
  if (ya < 350) return 0
  if (ya < 400) return -1
  if (ya < 450) return -3
  if (ya < 500) return -5
  if (ya < 550) return -6
  return -7
}

function dstPoints(team, opp, pointsAllowed) {
  const yardsAllowed = num(opp.passing_yards) - num(opp.sack_yards_lost) + num(opp.rushing_yards)
  return (
    num(team.def_sacks) +
    2 * num(team.def_interceptions) +
    2 * num(team.fumble_recovery_opp) +
    2 * num(team.def_safeties) +
    2 * (num(team.def_punt_blocks) + num(team.def_fg_blocks) + num(team.def_pat_blocks)) +
    6 * (num(team.def_tds) + num(team.special_teams_tds)) +
    pointsAllowedScore(pointsAllowed) +
    yardsAllowedScore(yardsAllowed)
  )
}

// ---------- Stat lines ("24/35, 312 yds, 3 TD") ----------

const plural = (n, word) => `${n} ${word}`

function playerStatLine(r, position) {
  const parts = []
  const v = (k) => num(r[k])

  if (position === 'K') {
    parts.push(`FG ${v('fg_made')}/${v('fg_att')}${v('fg_made') ? ` (long ${v('fg_long')})` : ''}`)
    parts.push(`XP ${v('pat_made')}/${v('pat_att')}`)
    return parts.join(' · ')
  }

  const pass = () => {
    let s = `${v('completions')}/${v('attempts')}, ${v('passing_yards')} pass yds`
    if (v('passing_tds')) s += `, ${v('passing_tds')} TD`
    if (v('passing_interceptions')) s += `, ${v('passing_interceptions')} INT`
    return s
  }
  const rush = () => {
    let s = `${plural(v('carries'), 'car')}, ${v('rushing_yards')} rush yds`
    if (v('rushing_tds')) s += `, ${v('rushing_tds')} TD`
    return s
  }
  const rec = () => {
    let s = `${plural(v('receptions'), 'rec')}, ${v('receiving_yards')} yds`
    if (v('receiving_tds')) s += `, ${v('receiving_tds')} TD`
    return s
  }

  if (position === 'QB') {
    if (v('attempts')) parts.push(pass())
    if (v('rushing_yards') >= 10 || v('rushing_tds')) parts.push(rush())
  } else if (position === 'RB') {
    if (v('carries')) parts.push(rush())
    if (v('receptions')) parts.push(rec())
  } else {
    if (v('targets') || v('receptions')) parts.push(rec())
    if (v('rushing_yards') >= 10 || v('rushing_tds')) parts.push(rush())
  }
  if (v('special_teams_tds')) parts.push(`${v('special_teams_tds')} return TD`)
  const fumbles = v('rushing_fumbles_lost') + v('receiving_fumbles_lost') + v('sack_fumbles_lost')
  if (fumbles) parts.push(`${fumbles} fum lost`)
  return parts.join(' · ') || 'No stats'
}

function dstStatLine(team, opp, pointsAllowed) {
  const v = (k) => num(team[k])
  const parts = []
  if (v('def_sacks')) parts.push(`${v('def_sacks')} sack${v('def_sacks') === 1 ? '' : 's'}`)
  if (v('def_interceptions')) parts.push(`${v('def_interceptions')} INT`)
  if (v('fumble_recovery_opp')) parts.push(`${v('fumble_recovery_opp')} FR`)
  const tds = v('def_tds') + v('special_teams_tds')
  if (tds) parts.push(`${tds} TD`)
  if (v('def_safeties')) parts.push(`${v('def_safeties')} safety`)
  const yards = num(opp.passing_yards) - num(opp.sack_yards_lost) + num(opp.rushing_yards)
  parts.push(`${pointsAllowed} pts allowed`, `${yards} yds allowed`)
  return parts.join(' · ')
}

// D/ST points per team per week: { [team]: { [week]: points } }
function buildDstWeeks(teamRows, games, season, lines = null) {
  const scores = new Map()
  for (const g of games) {
    if (Number(g.season) !== season || g.away_score === '') continue
    scores.set(g.game_id, { [g.away_team]: num(g.home_score), [g.home_team]: num(g.away_score) })
  }

  const byGame = new Map()
  for (const r of teamRows) {
    if (r.season_type !== 'REG') continue
    if (!byGame.has(r.game_id)) byGame.set(r.game_id, {})
    byGame.get(r.game_id)[r.team] = r
  }

  const out = {}
  for (const [gameId, sides] of byGame) {
    const allowed = scores.get(gameId)
    if (!allowed) continue
    for (const [team, row] of Object.entries(sides)) {
      const opp = sides[row.opponent_team]
      if (!opp) continue
      out[team] ??= {}
      out[team][Number(row.week)] = dstPoints(row, opp, allowed[team])
      if (lines) {
        lines[team] ??= {}
        lines[team][Number(row.week)] = dstStatLine(row, opp, allowed[team])
      }
    }
  }
  return out
}

// ---------- Build ----------

async function main() {
  const pairs = JSON.parse(readFileSync(join(DATA_DIR, 'pairs.json'), 'utf8'))
  const dstUnits = JSON.parse(readFileSync(join(DATA_DIR, 'dst_units.json'), 'utf8'))
  const offense = pairs.filter((p) => p.position !== 'DEF')
  const pairsById = new Map(pairs.map((p) => [p.id, p]))

  console.log('Downloading nflverse and PokeAPI data…')
  const [players, players25, teams, teams25, games, species, speciesNames] = await Promise.all([
    fetchCsv(URLS.playerWeeks(SEASON)),
    fetchCsv(URLS.playerWeeks(SEASON - 1)),
    fetchCsv(URLS.teamWeeks(SEASON)),
    fetchCsv(URLS.teamWeeks(SEASON - 1)),
    fetchCsv(URLS.games),
    fetchCsv(URLS.species),
    fetchCsv(URLS.speciesNames),
  ])

  // ----- Weeks played and byes (2026) -----
  const seasonGames = games.filter((g) => Number(g.season) === SEASON && g.game_type === 'REG')
  const allTeams = [...new Set(offense.map((p) => p.team))].sort()
  const byes = {}
  for (const team of allTeams) {
    const weeksPlaying = new Set(
      seasonGames
        .filter((g) => g.home_team === team || g.away_team === team)
        .map((g) => Number(g.week))
    )
    byes[team] = Array.from({ length: NFL_WEEKS }, (_, i) => i + 1).filter(
      (w) => !weeksPlaying.has(w)
    )
  }

  // A week is available once every game in it has a final score and stats exist
  const statWeeks = new Set(players.filter((r) => r.season_type === 'REG').map((r) => +r.week))
  const weeksAvailable = []
  for (let w = 1; w <= NFL_WEEKS; w++) {
    const wk = seasonGames.filter((g) => Number(g.week) === w)
    if (wk.length && wk.every((g) => g.result !== '') && statWeeks.has(w)) weeksAvailable.push(w)
    else break
  }
  const lastWeek = weeksAvailable.at(-1) ?? 0

  // ----- Weekly points (2026) -----
  const posById = new Map(offense.map((p) => [p.playerId, p.position]))
  const points = {}
  for (const p of offense) points[p.playerId] = Array(lastWeek).fill(null)

  const statLines = {}
  for (const p of offense) statLines[p.playerId] = Array(lastWeek).fill(null)

  for (const r of players) {
    const w = Number(r.week)
    if (r.season_type !== 'REG' || w > lastWeek || !posById.has(r.player_id)) continue
    const position = posById.get(r.player_id)
    points[r.player_id][w - 1] = round1(playerPoints(r, position))
    statLines[r.player_id][w - 1] = playerStatLine(r, position)
  }

  const dstLines = {}
  const dstWeeks = buildDstWeeks(teams, games, SEASON, dstLines)
  for (const unit of dstUnits) {
    points[`DST-${unit.team}`] = Array.from({ length: lastWeek }, (_, i) =>
      dstWeeks[unit.team]?.[i + 1] !== undefined ? round1(dstWeeks[unit.team][i + 1]) : null
    )
  }

  for (const unit of dstUnits) {
    statLines[`DST-${unit.team}`] = Array.from(
      { length: lastWeek },
      (_, i) => dstLines[unit.team]?.[i + 1] ?? null
    )
  }
  writeJson('stat_lines.json', statLines)

  writeJson('weekly_points.json', {
    season: SEASON,
    updated: new Date().toISOString().slice(0, 10),
    weeksAvailable,
    byes,
    points,
  })

  // ----- Preseason projections (2025 stats regressed toward a Madden OVR baseline) -----
  const games25 = new Map()
  for (const r of players25) {
    if (r.season_type !== 'REG' || !posById.has(r.player_id)) continue
    if (!games25.has(r.player_id)) games25.set(r.player_id, [])
    games25.get(r.player_id).push(playerPoints(r, posById.get(r.player_id)))
  }

  const projections = {}
  for (const position of ['QB', 'RB', 'WR', 'TE', 'K']) {
    const group = offense.filter((p) => p.position === position)
    const fitPoints = group
      .filter((p) => (games25.get(p.playerId)?.length ?? 0) >= 6)
      .map((p) => [p.maddenOvr, mean(games25.get(p.playerId))])
    const baseline = linearFit(fitPoints)
    const K = 4 // games of "prior" weight

    for (const p of group) {
      const g = games25.get(p.playerId) ?? []
      const prior = Math.max(0, baseline(p.maddenOvr))
      const ppg = g.length ? (g.reduce((a, b) => a + b, 0) + K * prior) / (g.length + K) : prior
      projections[p.playerId] = round1(ppg)
    }
  }

  const dst25 = buildDstWeeks(teams25, games, SEASON - 1)
  const dstRows = dstUnits.map((unit) => {
    const members = unit.memberIds.map((id) => pairsById.get(id)).filter(Boolean)
    const ovr = mean(members.map((m) => m.maddenOvr))
    const weeks = Object.values(dst25[unit.team] ?? {})
    return { team: unit.team, ovr, ppg: weeks.length ? mean(weeks) : null }
  })
  const dstBaseline = linearFit(dstRows.filter((d) => d.ppg !== null).map((d) => [d.ovr, d.ppg]))
  for (const d of dstRows) {
    const prior = dstBaseline(d.ovr)
    projections[`DST-${d.team}`] = round1(d.ppg === null ? prior : 0.6 * d.ppg + 0.4 * prior)
  }

  writeJson('projections.json', projections)

  // ----- Evolutions (Gen 1–6 only, matching the Gen 6 type chart) -----
  const english = new Map(
    speciesNames
      .filter((n) => n.local_language_id === '9')
      .map((n) => [n.pokemon_species_id, n.name])
  )
  const children = new Map()
  for (const s of species) {
    if (!s.evolves_from_species_id || Number(s.generation_id) > 6) continue
    if (!children.has(s.evolves_from_species_id)) children.set(s.evolves_from_species_id, [])
    children.get(s.evolves_from_species_id).push(s.id)
  }
  const nextOf = (id) => (children.get(id) ?? []).sort((a, b) => a - b)[0]

  const evolutions = {}
  for (const p of pairs) {
    const chain = []
    let id = String(Number(p.id))
    for (let step = 0; step < 2; step++) {
      id = nextOf(id)
      if (!id) break
      chain.push(english.get(id))
    }
    if (chain.length) evolutions[p.id] = chain
  }
  writeJson('evolutions.json', evolutions)

  console.log(`Weeks available: ${weeksAvailable.join(', ') || 'none'}`)
}

function writeJson(name, data) {
  writeFileSync(join(DATA_DIR, name), JSON.stringify(data) + '\n')
  console.log(`Wrote src/data/${name}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
