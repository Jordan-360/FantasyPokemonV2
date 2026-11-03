import { useState } from 'react'
import Panel from './Panel'
import { weekLabel } from '../lib/league'
import { slotLabel } from '../lib/lineup'
import { effectivenessLabel } from '../lib/typeChart'
import './WeekResult.css'

const pct = (n) => `${n > 0 ? '+' : ''}${Math.round(n * 100)}%`

function BoxScore({ title, lines, nameOf }) {
  return (
    <table className="box-score">
      <caption>{title}</caption>
      <thead>
        <tr>
          <th scope="col">Slot</th>
          <th scope="col">Pokémon</th>
          <th scope="col">Real</th>
          <th scope="col">Mod</th>
          <th scope="col">Pts</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l) => (
          <tr key={l.slot} className={l.fainted ? 'box-score__fainted' : ''}>
            <td>{slotLabel(l.slot)}</td>
            <td>{nameOf(l.id)}</td>
            <td className="num">{l.fainted ? 'FNT' : l.real.toFixed(1)}</td>
            <td className="num">{l.typeMod + l.evoBonus ? pct(l.typeMod + l.evoBonus) : '—'}</td>
            <td className="num">{l.points.toFixed(1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// The result of your most recent game, with the Pokémon-layer highlights.
export default function WeekResult({ week, result, teams, events, rosterIds, nameOf }) {
  const [showBox, setShowBox] = useState(false)
  if (!result) return null

  const userIsA = result.a === 'user'
  const you = {
    score: userIsA ? result.scoreA : result.scoreB,
    lines: userIsA ? result.lineA : result.lineB,
  }
  const oppId = userIsA ? result.b : result.a
  const opp = {
    score: userIsA ? result.scoreB : result.scoreA,
    lines: userIsA ? result.lineB : result.lineA,
  }
  const won = result.winner === 'user'
  const oppName = teams.find((t) => t.id === oppId)?.name

  const mine = new Set(rosterIds)
  const highlights = []
  for (const l of you.lines) {
    const label = effectivenessLabel(l.multiplier)
    if (label && !l.fainted)
      highlights.push({
        key: `eff-${l.id}`,
        text: `${nameOf(l.id)}: ${label}`,
        kind: l.typeMod > 0 ? 'good' : 'bad',
      })
    if (l.fainted)
      highlights.push({
        key: `fnt-${l.id}`,
        text: `${nameOf(l.id)} fainted (${l.fainted === 'bye' ? 'bye week' : "didn't play"})`,
        kind: 'bad',
      })
  }
  for (const e of events.filter((e) => mine.has(e.id))) {
    if (e.type === 'evolve')
      highlights.push({
        key: `evo-${e.id}`,
        text: `What? ${e.from} evolved into ${e.to}!`,
        kind: 'evo',
      })
    if (e.type === 'powerup')
      highlights.push({ key: `pow-${e.id}`, text: `${e.to} powered up!`, kind: 'evo' })
    if (e.type === 'shiny')
      highlights.push({
        key: `shy-${e.id}`,
        text: `${nameOf(e.id)} turned shiny with ${e.points} points!`,
        kind: 'shiny',
      })
  }

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

      {highlights.length > 0 && (
        <ul className="week-result__highlights">
          {highlights.map((h) => (
            <li key={h.key} className={`hl hl--${h.kind}`}>
              {h.text}
            </li>
          ))}
        </ul>
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
          <BoxScore title="You" lines={you.lines} nameOf={nameOf} />
          <BoxScore title={oppName} lines={opp.lines} nameOf={nameOf} />
        </div>
      )}
    </Panel>
  )
}
