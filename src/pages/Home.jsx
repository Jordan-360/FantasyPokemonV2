import { useCallback, useMemo, useState } from 'react'
import DraftBanner from '../components/DraftBanner'
import Field from '../components/Field'
import RosterPanel from '../components/RosterPanel'
import ScheduleStandings from '../components/ScheduleStandings'
import FreeAgentsPanel from '../components/FreeAgentsPanel'
import MobileTabBar from '../components/MobileTabBar'
import MatchupStrip from '../components/MatchupStrip'
import WeekResult from '../components/WeekResult'
import Toasts from '../components/Toasts'
import LeagueActivity from '../components/LeagueActivity'
import TopPlayers from '../components/TopPlayers'
import { createTeams, generateSchedule, weekLabel, FINAL_WEEK } from '../lib/league'
import { ROSTER_SIZE, STARTER_SLOTS, benchOf, slotLabel } from '../lib/lineup'
import {
  canClaim,
  canPlayWeek,
  freeAgents,
  projectedTotal,
  userGame,
  userResult,
} from '../lib/season'
import { statLine } from '../lib/projections'
import { playerView } from '../lib/views'
import { positionLabel } from '../lib/players'
import { displayName } from '../lib/scoring'
import './Home.css'

// Shown before a league exists
const PLACEHOLDER_TEAMS = createTeams('My Team')
const PLACEHOLDER_SCHEDULE = generateSchedule(PLACEHOLDER_TEAMS.map((t) => t.id))

function useHomeData(league, ctx) {
  return useMemo(() => {
    if (!league) {
      return {
        teams: PLACEHOLDER_TEAMS,
        schedule: PLACEHOLDER_SCHEDULE,
        lineupViews: {},
        benchViews: [],
        faViews: [...ctx.pool]
          .sort((a, b) => b.projection - a.projection)
          .map((p) => playerView(p, { ctx })),
      }
    }

    const week = Math.min(league.currentWeek, FINAL_WEEK)
    const roster = league.rosters.user
    const matchup = league.phase === 'season' ? userGame(league, week) : null
    const opponentLineup = matchup ? league.rosters[matchup.opponentId].lineup : null
    const base = { ctx, week, statuses: league.statuses }

    const lineupViews = {}
    for (const { id: slot } of STARTER_SLOTS) {
      const player = ctx.byId.get(roster.lineup[slot])
      if (player) lineupViews[slot] = playerView(player, { ...base, slot, opponentLineup })
    }
    const benchViews = benchOf(roster).map((id) => playerView(ctx.byId.get(id), base))

    const slotOf = Object.fromEntries(Object.entries(roster.lineup).map(([s, id]) => [id, s]))
    const rosterViews = roster.players.map((id) => ({
      ...playerView(ctx.byId.get(id), base),
      slot: slotOf[id] ? slotLabel(slotOf[id]) : null,
    }))

    const faViews = freeAgents(league, ctx)
      .map((p) => playerView(p, base))
      .sort((a, b) => b.projection - a.projection)

    // Most recent week you played in
    let lastWeek = null
    for (let w = league.currentWeek - 1; w >= 1; w--) {
      if (league.results[w]?.some((r) => r.a === 'user' || r.b === 'user')) {
        lastWeek = w
        break
      }
    }

    return {
      teams: league.teams,
      schedule: league.schedule,
      week,
      matchup,
      opponentLineup,
      lineupViews,
      benchViews,
      rosterViews,
      faViews,
      lastWeek,
    }
  }, [league, ctx])
}

// Best starter by `value` among lineup views → a TopPlayers entry
function topOf(views, value, line) {
  const list = Object.values(views).filter(Boolean)
  if (!list.length) return null
  const best = list.reduce((a, b) => (value(b) > value(a) ? b : a))
  return { view: best, value: value(best), line: line(best) }
}

// A played week, rebuilt from the stored result: both lineups with real points.
function usePastWeek(league, ctx, week) {
  return useMemo(() => {
    if (!league || !week) return null
    const result = userResult(league, week)
    if (!result) return null

    const userIsA = result.a === 'user'
    const toViews = (lines) =>
      Object.fromEntries(
        lines.map((l) => [
          l.slot,
          {
            ...playerView(ctx.byId.get(l.id), { ctx, week, statuses: league.statuses }),
            multiplier: l.multiplier,
            fainted: l.fainted,
            points: l.points,
          },
        ])
      )
    const mine = toViews(userIsA ? result.lineA : result.lineB)
    const theirs = toViews(userIsA ? result.lineB : result.lineA)
    const points = (v) => (v.fainted ? -Infinity : v.points)
    const line = (v) => statLine(v.player, week, ctx)

    return {
      week,
      result,
      opponentId: userIsA ? result.b : result.a,
      userScore: userIsA ? result.scoreA : result.scoreB,
      oppScore: userIsA ? result.scoreB : result.scoreA,
      lineupViews: mine,
      opponentViews: theirs,
      topYou: topOf(mine, points, line),
      topOpp: topOf(theirs, points, line),
    }
  }, [league, ctx, week])
}

function PastMatchup({ league, past, onBack }) {
  const user = league.teams.find((t) => t.isUser)
  const opponent = league.teams.find((t) => t.id === past.opponentId)
  const won = past.result.winner === 'user'
  const margin = Math.abs(past.userScore - past.oppScore).toFixed(1)
  const backLabel =
    league.phase === 'season' ? `Back to ${weekLabel(league.currentWeek)}` : 'Back to season'

  return (
    <MatchupStrip
      title={`${weekLabel(past.week)} · Final`}
      userName={user.name}
      opponent={opponent}
      opponentDst={past.opponentViews.DST?.player}
      userProj={past.userScore}
      oppProj={past.oppScore}
      unit="pts"
      note={won ? `You won by ${margin}.` : `${opponent.name} won by ${margin}.`}
      action={
        <button className="btn" onClick={onBack}>
          {backLabel}
        </button>
      }
    />
  )
}

function Matchup({ league, ctx, data, onPlay }) {
  const lastStatsWeek = ctx.weekly.weeksAvailable.at(-1)

  if (!league || league.phase === 'draft') {
    return (
      <MatchupStrip
        title="Preseason"
        note="Draft your team to see your Week 1 matchup and its type matchups."
      />
    )
  }

  if (league.phase === 'complete') {
    const champ = league.teams.find((t) => t.id === league.playoffs?.champion)
    return (
      <MatchupStrip
        title="Season complete"
        note={
          champ?.isUser
            ? 'You won the championship! 🏆'
            : `${champ?.name ?? 'The champion'} won the championship.`
        }
      />
    )
  }

  const { week, matchup, opponentLineup } = data
  const ready = canPlayWeek(league, ctx)
  const user = league.teams.find((t) => t.isUser)
  const opponent = matchup ? league.teams.find((t) => t.id === matchup.opponentId) : null

  let note
  if (!ready) {
    note = `${weekLabel(week)} unlocks once its NFL games are played. Real stats are in through Week ${lastStatsWeek ?? 0}.`
  } else if (!matchup) {
    note = "You're out of the playoffs. Play the week to see who advances."
  } else {
    note = 'Real NFL stats for this week are in. Set your lineup, then lock it in.'
  }

  return (
    <MatchupStrip
      title={weekLabel(week)}
      userName={user.name}
      opponent={opponent}
      opponentDst={opponentLineup ? ctx.byId.get(opponentLineup.DST) : null}
      userProj={matchup ? projectedTotal(league.rosters.user.lineup, week, ctx) : undefined}
      oppProj={opponentLineup ? projectedTotal(opponentLineup, week, ctx) : undefined}
      note={note}
      action={
        <button className="btn btn--primary" disabled={!ready} onClick={onPlay}>
          {matchup ? `Lock lineup & play ${weekLabel(week)}` : `Sim ${weekLabel(week)}`}
        </button>
      }
    />
  )
}

function TopBanner({ league, onOpenDraft }) {
  if (!league) return <DraftBanner onDraftClick={onOpenDraft} />
  if (league.phase === 'draft') {
    return (
      <DraftBanner
        title="Your draft is in progress"
        subtitle={`Pick ${league.draft.picks.length + 1} of ${league.draft.pickOrder.length}. Head back in to finish your roster.`}
        buttonLabel="Resume draft"
        onDraftClick={onOpenDraft}
      />
    )
  }
  if (league.phase === 'complete') {
    const champ = league.teams.find((t) => t.id === league.playoffs?.champion)
    return (
      <DraftBanner
        title={champ?.isUser ? 'You are the champion! 🏆' : `${champ?.name} won the title`}
        subtitle="Start a new league from the header to draft again."
      />
    )
  }
  return null
}

export default function Home({ league, ctx, actions, onOpenDraft, viewWeek, onViewWeek }) {
  const data = useHomeData(league, ctx)
  const hasDrafted = Boolean(league && league.phase !== 'draft')

  // Which inner tab the Schedule/Standings panel shows
  const [leagueTab, setLeagueTab] = useState('schedule')
  // Which section the phone tab bar shows: team | schedule | standings | fa
  const [mobileTab, setMobileTab] = useState('team')

  function changeMobileTab(tab) {
    setMobileTab(tab)
    if (tab === 'schedule' || tab === 'standings') setLeagueTab(tab)
    window.scrollTo(0, 0)
  }

  function changeLeagueTab(tab) {
    setLeagueTab(tab)
    if (mobileTab === 'schedule' || mobileTab === 'standings') setMobileTab(tab)
  }

  // On phones, only the active tab's sections are shown (see Home.css)
  const showOnMobile = {
    team: mobileTab === 'team',
    league: mobileTab === 'schedule' || mobileTab === 'standings',
    fa: mobileTab === 'fa',
  }

  const nameOf = (id) => displayName(ctx.byId.get(id), league?.statuses[id], ctx.evolutions)

  // ---------- Notifications ----------
  const [toasts, setToasts] = useState([])
  const [pendingWeek, setPendingWeek] = useState(null) // week just played, until its toast closes

  const dismissToast = useCallback((id) => {
    if (id === 'week') setPendingWeek(null)
    else setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  function handleClaim(addId, dropId = null) {
    const add = ctx.byId.get(addId)
    const lines = [`${add.player} · ${add.team} · ${positionLabel(add.position)}`]
    if (dropId) lines.push(`Dropped ${nameOf(dropId)} (${ctx.byId.get(dropId).player})`)
    actions.claimPlayer(addId, dropId)
    setToasts((list) => [
      ...list,
      { id: `claim-${addId}-${Date.now()}`, title: `Added ${nameOf(addId)}`, lines },
    ])
  }

  function handlePlay() {
    onViewWeek(null)
    setPendingWeek(league.currentWeek)
    actions.playWeek()
  }

  const weekToast = pendingWeek && league?.results[pendingWeek] ? buildWeekToast() : null
  function buildWeekToast() {
    const teamName = (id) => league.teams.find((t) => t.id === id)?.name
    const game = league.results[pendingWeek].find((r) => r.a === 'user' || r.b === 'user')
    const toast = {
      id: 'week',
      duration: 9000,
      title: `${weekLabel(pendingWeek)} played`,
      lines: [],
    }

    if (game) {
      const mine = game.a === 'user' ? game.scoreA : game.scoreB
      const theirs = game.a === 'user' ? game.scoreB : game.scoreA
      const won = game.winner === 'user'
      toast.kind = won ? 'win' : 'loss'
      toast.title = `${weekLabel(pendingWeek)}: you ${won ? 'won' : 'lost'} ${mine.toFixed(1)}–${theirs.toFixed(1)}`
      toast.lines.push(`vs ${teamName(game.a === 'user' ? game.b : game.a)}`)
    }

    const moves = league.transactions.filter(
      (t) => t.week === pendingWeek + 1 && t.teamId !== 'user'
    )
    for (const t of moves.slice(0, 3)) {
      toast.lines.push(
        `${teamName(t.teamId)} added ${nameOf(t.addId)}, dropped ${nameOf(t.dropId)}`
      )
    }
    if (moves.length > 3) toast.lines.push(`+${moves.length - 3} more in League activity`)
    if (league.phase === 'complete') {
      toast.lines.push(`${teamName(league.playoffs.champion)} won the championship!`)
    }
    return toast
  }

  // ---------- Week being shown: a played week, or the current one ----------
  const past = usePastWeek(league, ctx, viewWeek)
  const summaryWeek = past ? past.week : data.lastWeek
  const summaryResult = summaryWeek ? userResult(league, summaryWeek) : null

  let fieldViews = data.lineupViews
  let topPlayers = null
  if (past) {
    fieldViews = past.lineupViews
    topPlayers = {
      you: past.topYou,
      opponent: past.topOpp,
      opponentName: league.teams.find((t) => t.id === past.opponentId)?.name,
      final: true,
    }
  } else if (data.matchup) {
    const lastWeek = data.week - 1
    const proj = (v) => v.projection
    const line = (v) => {
      const l = lastWeek >= 1 ? statLine(v.player, lastWeek, ctx) : null
      return l ? `Last week: ${l}` : null
    }
    const oppViews = {}
    for (const [slot, id] of Object.entries(data.opponentLineup)) {
      oppViews[slot] = playerView(ctx.byId.get(id), {
        ctx,
        week: data.week,
        statuses: league.statuses,
        slot,
        opponentLineup: league.rosters.user.lineup,
      })
    }
    topPlayers = {
      you: topOf(data.lineupViews, proj, line),
      opponent: topOf(oppViews, proj, line),
      opponentName: league.teams.find((t) => t.id === data.matchup.opponentId)?.name,
      final: false,
    }
  }

  return (
    <main className="home">
      <TopBanner league={league} onOpenDraft={onOpenDraft} />

      <div className="home__grid">
        <div className="home__roster" data-mobile-active={showOnMobile.team}>
          <RosterPanel
            lineupViews={data.lineupViews}
            benchViews={data.benchViews}
            editable={league?.phase === 'season' && !past}
            notice={
              past && league.phase === 'season'
                ? `Viewing ${weekLabel(past.week)}. Go back to ${weekLabel(league.currentWeek)} to edit your lineup.`
                : null
            }
            showProjection={hasDrafted}
            onStart={actions.startPlayer}
            onBench={actions.benchPlayer}
            onOptimize={actions.optimizeLineup}
          />
        </div>

        <div className="home__schedule" data-mobile-active={showOnMobile.league}>
          <ScheduleStandings
            teams={data.teams}
            schedule={data.schedule}
            results={league?.results}
            playoffs={league?.playoffs}
            userId="user"
            currentWeek={league?.phase === 'season' ? league.currentWeek : null}
            hasDrafted={hasDrafted}
            tab={leagueTab}
            onTabChange={changeLeagueTab}
          />
        </div>

        <div className="home__field" data-mobile-active={showOnMobile.team}>
          {past ? (
            <PastMatchup league={league} past={past} onBack={() => onViewWeek(null)} />
          ) : (
            <Matchup league={league} ctx={ctx} data={data} onPlay={handlePlay} />
          )}
          <Field lineupViews={fieldViews}>{topPlayers && <TopPlayers {...topPlayers} />}</Field>
          {summaryResult && (
            <WeekResult
              key={summaryWeek}
              week={summaryWeek}
              result={summaryResult}
              teams={league.teams}
              events={league.events[summaryWeek] ?? []}
              statuses={league.statuses}
              nameOf={nameOf}
              ctx={ctx}
            />
          )}
        </div>

        <div className="home__free-agents" data-mobile-active={showOnMobile.fa}>
          <FreeAgentsPanel
            players={data.faViews}
            canClaim={Boolean(league && canClaim(league))}
            lockedNote={
              league?.phase === 'complete' ? 'the season is over' : 'claiming opens after the draft'
            }
            rosterFull={(league?.rosters.user.players.length ?? 0) >= ROSTER_SIZE}
            rosterViews={data.rosterViews ?? []}
            onClaim={handleClaim}
          />
          {league && league.phase !== 'draft' && (
            <LeagueActivity
              transactions={league.transactions}
              teams={league.teams}
              nameOf={nameOf}
              byId={ctx.byId}
            />
          )}
        </div>
      </div>

      <MobileTabBar active={mobileTab} onChange={changeMobileTab} />
      <Toasts toasts={weekToast ? [weekToast, ...toasts] : toasts} onDismiss={dismissToast} />
    </main>
  )
}
