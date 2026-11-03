import { useState } from 'react'
import Panel from './Panel'
import BoxScore from './BoxScore'
import PlayerCircle from './PlayerCircle'
import { weekLabel } from '../lib/league'
import { positionLabel } from '../lib/players'
import { statLine } from '../lib/projections'
import { effectivenessMark } from '../lib/views'
import './WeekResult.css'

const TOP_PLAYS = 5

function TopPlay({ rank, play, ctx, week, nameOf, statuses, teamLabel, isUser, eventsFor }) {
  const player = ctx.byId.get(play.id)
  const eff = effectivenessMark(play.multiplier)
  const moments = eventsFor(play.id)

  return (
    <li className={`play ${isUser ? 'play--user' : ''}`}>
      <span className="play__rank num">{rank}</span>
      <PlayerCircle
        player={player}
        name={nameOf(play.id)}
        shiny={statuses[play.id]?.shiny}
        className="play__circle"
      />
      <span className="play__text">
        <span className="play__name">
          {nameOf(play.id)}{' '}
          <span className="play__who">
            {player.player} · {positionLabel(player.position)} · {teamLabel}
          </span>
        </span>
        <span className="play__line">{statLine(player, week, ctx) ?? '—'}</span>
        {(eff || moments.length > 0) && (
          <span className="play__chips">
            {eff && <span className={`chip ${eff.className}`}>{eff.text}</span>}
            {moments.map((m) => (
              <span
                key={m.type}
                className={`chip ${m.type === 'shiny' ? 'chip--shiny' : 'chip--evolved'}`}
              >
                {m.type === 'shiny'
                  ? 'Turned shiny!'
                  : m.type === 'evolve'
                    ? `Evolved into ${m.to}`
                    : 'Powered up!'}
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="play__pts num">{play.points.toFixed(1)}</span>
    </li>
  )
}

// Game summary for one week: final score, the top plays from both teams, and a box score.
export default function WeekResult({ week, result, teams, events, statuses, nameOf, ctx }) {
  const [showBox, setShowBox] = useState(false)
  if (!result) return null

  const userIsA = result.a === 'user'
  const oppId = userIsA ? result.b : result.a
  const you = {
    score: userIsA ? result.scoreA : result.scoreB,
    lines: userIsA ? result.lineA : result.lineB,
  }
  const opp = {
    score: userIsA ? result.scoreB : result.scoreA,
    lines: userIsA ? result.lineB : result.lineA,
  }
  const won = result.winner === 'user'
  const oppName = teams.find((t) => t.id === oppId)?.name
  const margin = Math.abs(you.score - opp.score).toFixed(1)

  const plays = [
    ...you.lines.map((l) => ({ ...l, isUser: true })),
    ...opp.lines.map((l) => ({ ...l, isUser: false })),
  ]
    .filter((l) => !l.fainted)
    .sort((a, b) => b.points - a.points)
    .slice(0, TOP_PLAYS)

  const eventsFor = (id) => events.filter((e) => e.id === id)
  const detailOf = (id) => {
    const p = ctx.byId.get(id)
    const line = statLine(p, week, ctx)
    return line ? `${p.player} · ${line}` : p.player
  }
  const fainted = you.lines.filter((l) => l.fainted).map((l) => nameOf(l.id))

  return (
    <Panel className="week-result">
      <div className="week-result__head">
        <span className="week-result__title">{weekLabel(week)} · Final</span>
        <span className={`week-result__badge ${won ? 'is-win' : 'is-loss'}`}>
          {won ? 'Win' : 'Loss'}
        </span>
      </div>

      <div className="week-result__score">
        <span className="week-result__side">
          <span className="week-result__name">You</span>
          <span className="num week-result__pts">{you.score.toFixed(1)}</span>
        </span>
        <span className="muted">–</span>
        <span className="week-result__side week-result__side--right">
          <span className="num week-result__pts">{opp.score.toFixed(1)}</span>
          <span className="week-result__name">{oppName}</span>
        </span>
      </div>
      <p className="week-result__margin muted">
        {won ? `You won by ${margin}` : `${oppName} won by ${margin}`}
      </p>

      <h3 className="roster__group">Top plays</h3>
      <ol className="plays">
        {plays.map((play, i) => (
          <TopPlay
            key={`${play.isUser}-${play.slot}`}
            rank={i + 1}
            play={play}
            ctx={ctx}
            week={week}
            nameOf={nameOf}
            statuses={statuses}
            teamLabel={play.isUser ? 'You' : oppName}
            isUser={play.isUser}
            eventsFor={eventsFor}
          />
        ))}
      </ol>

      {fainted.length > 0 && (
        <p className="week-result__fainted">
          <strong>Fainted:</strong> {fainted.join(', ')} scored 0 for you.
        </p>
      )}

      <button
        className="btn btn--small"
        aria-expanded={showBox}
        onClick={() => setShowBox((s) => !s)}
      >
        {showBox ? 'Hide box score' : 'Box score'}
      </button>
      {showBox && (
        <div className="week-result__box">
          <BoxScore title="You" lines={you.lines} nameOf={nameOf} detailOf={detailOf} />
          <BoxScore title={oppName} lines={opp.lines} nameOf={nameOf} detailOf={detailOf} />
        </div>
      )}
    </Panel>
  )
}
