import { useEffect, useMemo, useState } from 'react'
import Panel from '../components/Panel'
import PlayerCircle from '../components/PlayerCircle'
import RosterPanel from '../components/RosterPanel'
import MobileTabBar from '../components/MobileTabBar'
import { POSITION_FILTERS, positionLabel } from '../lib/players'
import { rankByVor, vor, ROUNDS } from '../lib/draft'
import { bestLineup, benchOf } from '../lib/lineup'
import { availableForDraft, currentPick, suggestedPick } from '../lib/season'
import { playerView } from '../lib/views'
import '../components/FreeAgentsPanel.css'
import './DraftRoom.css'

const CPU_PICK_DELAY = 450

const DRAFT_TABS = [
  {
    id: 'board',
    label: 'Players',
    icon: (
      <>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <circle cx="4" cy="6" r="1" />
        <circle cx="4" cy="12" r="1" />
        <circle cx="4" cy="18" r="1" />
      </>
    ),
  },
  {
    id: 'roster',
    label: 'My Roster',
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <line x1="12" y1="5" x2="12" y2="19" />
      </>
    ),
  },
  {
    id: 'order',
    label: 'Draft Order',
    icon: (
      <>
        <polyline points="4 7 12 7 12 12 20 12 20 17" />
        <circle cx="4" cy="7" r="1.5" />
        <circle cx="20" cy="17" r="1.5" />
      </>
    ),
  },
]

// ---------- League setup (first launch) ----------

function LeagueSetup({ onCreate }) {
  const [leagueName, setLeagueName] = useState('Kanto Fantasy League')
  const [teamName, setTeamName] = useState('')

  return (
    <main className="draft-setup">
      <Panel title="Create your league">
        <form
          className="setup-form"
          onSubmit={(e) => {
            e.preventDefault()
            onCreate({ leagueName, teamName })
          }}
        >
          <label className="setup-form__field">
            <span>League name</span>
            <input
              className="fa__search"
              value={leagueName}
              maxLength={40}
              onChange={(e) => setLeagueName(e.target.value)}
              required
            />
          </label>
          <label className="setup-form__field">
            <span>Your team name</span>
            <input
              className="fa__search"
              value={teamName}
              maxLength={30}
              placeholder="e.g. Pallet Town Punters"
              onChange={(e) => setTeamName(e.target.value)}
              required
            />
          </label>
          <ul className="setup-form__rules">
            <li>10 teams: you + 9 CPU managers</li>
            <li>15-round snake draft, random draft order</li>
            <li>Lineup: QB, 2 RB, 2 WR, TE, FLEX, K, D/ST + 6 bench</li>
            <li>14-week season, top 4 make the playoffs</li>
          </ul>
          <button className="btn btn--primary" type="submit">
            Start the draft
          </button>
        </form>
      </Panel>
    </main>
  )
}

// ---------- Board ----------

function PlayerBoard({ players, levels, canDraft, suggestedId, onDraft }) {
  const [query, setQuery] = useState('')
  const [position, setPosition] = useState('ALL')

  const search = query.trim().toLowerCase()
  const ranked = useMemo(() => rankByVor(players, levels), [players, levels])
  const rankOf = useMemo(() => new Map(ranked.map((p, i) => [p.id, i + 1])), [ranked])
  const visible = ranked.filter(
    (p) =>
      (position === 'ALL' || p.position === position) &&
      (search === '' ||
        p.pokemon.toLowerCase().includes(search) ||
        p.player.toLowerCase().includes(search) ||
        p.team.toLowerCase() === search)
  )

  return (
    <Panel title="Player board" className="draft-board">
      <label htmlFor="board-search" className="fa__label">
        Search players, Pokémon or NFL team
      </label>
      <input
        id="board-search"
        type="search"
        className="fa__search"
        placeholder="e.g. Mewtwo or Josh Allen"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="fa__filters" role="group" aria-label="Filter by position">
        {POSITION_FILTERS.map((f) => (
          <button
            key={f.id}
            className="fa__filter"
            aria-pressed={position === f.id}
            onClick={() => setPosition(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <p className="fa__count">
        {visible.length} available · ranked by value over replacement (recommended order)
      </p>

      <div className="board" role="table" aria-label="Available players">
        <div className="board__head" role="row">
          <span role="columnheader">#</span>
          <span role="columnheader">Player</span>
          <span role="columnheader" className="board__num">
            OVR
          </span>
          <span role="columnheader" className="board__num">
            Proj
          </span>
          <span role="columnheader" className="board__num board__vor">
            VOR
          </span>
          <span role="columnheader">
            <span className="visually-hidden">Draft</span>
          </span>
        </div>
        <div className="board__body">
          {visible.map((p) => (
            <div
              key={p.id}
              role="row"
              className={`board__row ${p.id === suggestedId ? 'board__row--suggested' : ''}`}
            >
              <span role="cell" className="board__rank num">
                {rankOf.get(p.id)}
              </span>
              <span role="cell" className="board__player">
                <PlayerCircle player={p} className="fa-row__circle" />
                <span className="fa-row__text">
                  <span className="fa-row__name">
                    {p.pokemon} <span className="fa-row__pos">{positionLabel(p.position)}</span>
                    {p.id === suggestedId && <span className="chip chip--shiny">Suggested</span>}
                  </span>
                  <span className="fa-row__player">
                    {p.player} · {p.team}
                  </span>
                </span>
              </span>
              <span role="cell" className="board__num num">
                {p.maddenOvr}
              </span>
              <span role="cell" className="board__num num">
                {p.projection.toFixed(1)}
              </span>
              <span role="cell" className="board__num board__vor num">
                {vor(p, levels).toFixed(1)}
              </span>
              <span role="cell">
                <button
                  className="fa-row__claim"
                  disabled={!canDraft}
                  onClick={() => onDraft(p.id)}
                  aria-label={`Draft ${p.pokemon}`}
                >
                  Draft
                </button>
              </span>
            </div>
          ))}
          {visible.length === 0 && <p className="fa__empty">No players match your search.</p>}
        </div>
      </div>
    </Panel>
  )
}

// ---------- Draft order / pick ticker ----------

function PickTicker({ league, ctx, onAutoDraftRest }) {
  const nameOf = (id) => league.teams.find((t) => t.id === id)?.name
  const teamCount = league.teams.length
  const label = (index) =>
    `${Math.floor(index / teamCount) + 1}.${String((index % teamCount) + 1).padStart(2, '0')}`

  const made = league.draft.picks
  const upcoming = league.draft.pickOrder
    .map((teamId, index) => ({ teamId, index }))
    .slice(made.length, made.length + 10)

  return (
    <Panel title="Draft order" className="ticker">
      {league.phase === 'draft' && (
        <>
          <h3 className="roster__group">Up next</h3>
          <ol className="ticker__list">
            {upcoming.map(({ teamId, index }, i) => (
              <li
                key={index}
                className={[
                  'ticker__row',
                  i === 0 ? 'ticker__row--current' : '',
                  teamId === 'user' ? 'ticker__row--user' : '',
                ].join(' ')}
              >
                <span className="ticker__pick num">{label(index)}</span>
                <span className="ticker__team">{nameOf(teamId)}</span>
                {i === 0 && <span className="chip chip--shiny">On the clock</span>}
              </li>
            ))}
          </ol>
          <button className="btn btn--small" onClick={onAutoDraftRest}>
            Auto-draft the rest
          </button>
        </>
      )}

      <h3 className="roster__group">Picks</h3>
      <ol className="ticker__list ticker__list--picks">
        {made.length === 0 && <li className="muted ticker__empty">No picks yet.</li>}
        {[...made].reverse().map((pick) => {
          const p = ctx.byId.get(pick.playerId)
          return (
            <li
              key={pick.index}
              className={`ticker__row ${pick.teamId === 'user' ? 'ticker__row--user' : ''}`}
            >
              <span className="ticker__pick num">{label(pick.index)}</span>
              <PlayerCircle player={p} className="ticker__circle" />
              <span className="ticker__text">
                <span className="ticker__player">
                  {p.pokemon} <span className="fa-row__pos">{positionLabel(p.position)}</span>
                </span>
                <span className="ticker__team muted">{nameOf(pick.teamId)}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </Panel>
  )
}

// ---------- Page ----------

export default function DraftRoom({ league, ctx, actions, onDone }) {
  const [mobileTab, setMobileTab] = useState('board')

  const pick = league ? currentPick(league) : null
  const userOnClock = pick?.teamId === 'user'
  const cpuOnClock = Boolean(pick) && !userOnClock
  const pickCount = league?.draft.picks.length ?? 0
  const { runCpuPick } = actions

  // CPU teams pick on their own, one at a time, so you can watch the board move
  useEffect(() => {
    if (!cpuOnClock) return
    const timer = setTimeout(runCpuPick, CPU_PICK_DELAY)
    return () => clearTimeout(timer)
  }, [cpuOnClock, pickCount, runCpuPick])

  const available = useMemo(() => (league ? availableForDraft(league, ctx) : []), [league, ctx])
  const suggestedId = useMemo(
    () => (league && userOnClock ? suggestedPick(league, ctx) : null),
    [league, ctx, userOnClock]
  )

  const rosterViews = useMemo(() => {
    if (!league) return { lineupViews: {}, benchViews: [] }
    const players = league.rosters.user.players
    const lineup =
      league.phase === 'draft'
        ? bestLineup(players, ctx.byId, (p) => p.projection)
        : league.rosters.user.lineup
    const lineupViews = Object.fromEntries(
      Object.entries(lineup).map(([slot, id]) => [slot, playerView(ctx.byId.get(id), { ctx })])
    )
    const benchViews = benchOf({ players, lineup }).map((id) =>
      playerView(ctx.byId.get(id), { ctx })
    )
    return { lineupViews, benchViews }
  }, [league, ctx])

  if (!league) return <LeagueSetup onCreate={actions.createLeague} />

  const teamName = (id) => league.teams.find((t) => t.id === id)?.name
  const done = league.phase !== 'draft'

  return (
    <main className="draft">
      <div
        className={`clock ${userOnClock ? 'clock--user' : ''} ${done ? 'clock--done' : ''}`}
        role="status"
      >
        {done ? (
          <>
            <div className="clock__text">
              <strong>Draft complete!</strong>
              <span>Your lineup is set for Week 1. Good luck this season.</span>
            </div>
            <button className="btn btn--primary" onClick={onDone}>
              Go to my team
            </button>
          </>
        ) : userOnClock ? (
          <>
            <div className="clock__text">
              <strong>You&apos;re on the clock</strong>
              <span>
                Round {pick.round} of {ROUNDS} · pick {pick.pickInRound}
              </span>
            </div>
            <button className="btn" onClick={actions.autoPick}>
              Auto-pick
            </button>
          </>
        ) : (
          <>
            <div className="clock__text">
              <strong>{teamName(pick.teamId)} is picking…</strong>
              <span>
                Round {pick.round} of {ROUNDS} · pick {pick.pickInRound}
              </span>
            </div>
            <button className="btn" onClick={actions.simToUser}>
              Skip to my pick
            </button>
          </>
        )}
      </div>

      <div className="draft__grid">
        <div className="draft__board" data-mobile-active={mobileTab === 'board'}>
          <PlayerBoard
            players={available}
            levels={ctx.levels}
            canDraft={userOnClock}
            suggestedId={suggestedId}
            onDraft={actions.makePick}
          />
        </div>
        <div className="draft__roster" data-mobile-active={mobileTab === 'roster'}>
          <RosterPanel lineupViews={rosterViews.lineupViews} benchViews={rosterViews.benchViews} />
        </div>
        <div className="draft__order" data-mobile-active={mobileTab === 'order'}>
          <PickTicker league={league} ctx={ctx} onAutoDraftRest={actions.autoDraftRest} />
        </div>
      </div>

      <MobileTabBar
        tabs={DRAFT_TABS}
        active={mobileTab}
        onChange={(tab) => {
          setMobileTab(tab)
          window.scrollTo(0, 0)
        }}
        label="Draft sections"
      />
    </main>
  )
}
