import { useMemo, useState } from 'react'
import DraftBanner from '../components/DraftBanner'
import Field from '../components/Field'
import RosterPanel from '../components/RosterPanel'
import ScheduleStandings from '../components/ScheduleStandings'
import FreeAgentsPanel from '../components/FreeAgentsPanel'
import MobileTabBar from '../components/MobileTabBar'
import MatchupStrip from '../components/MatchupStrip'
import WeekResult from '../components/WeekResult'
import { createTeams, generateSchedule, weekLabel, FINAL_WEEK } from '../lib/league'
import { ROSTER_SIZE, STARTER_SLOTS, benchOf, slotLabel } from '../lib/lineup'
import { canClaim, canPlayWeek, freeAgents, projectedTotal, userGame } from '../lib/season'
import { playerView } from '../lib/views'
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

export default function Home({ league, ctx, actions, onOpenDraft }) {
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

  const lastResult =
    data.lastWeek && league.results[data.lastWeek].find((r) => r.a === 'user' || r.b === 'user')
  const nameOf = (id) => displayName(ctx.byId.get(id), league?.statuses[id], ctx.evolutions)

  return (
    <main className="home">
      <TopBanner league={league} onOpenDraft={onOpenDraft} />

      <div className="home__grid">
        <div className="home__roster" data-mobile-active={showOnMobile.team}>
          <RosterPanel
            lineupViews={data.lineupViews}
            benchViews={data.benchViews}
            editable={league?.phase === 'season'}
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
          <Matchup league={league} ctx={ctx} data={data} onPlay={actions.playWeek} />
          <Field lineupViews={data.lineupViews} />
          {lastResult && (
            <WeekResult
              key={data.lastWeek}
              week={data.lastWeek}
              result={lastResult}
              teams={league.teams}
              events={league.events[data.lastWeek] ?? []}
              rosterIds={league.rosters.user.players}
              nameOf={nameOf}
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
            onClaim={(addId, dropId) => actions.claimPlayer(addId, dropId ?? null)}
          />
        </div>
      </div>

      <MobileTabBar active={mobileTab} onChange={changeMobileTab} />
    </main>
  )
}
