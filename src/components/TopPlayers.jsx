import PlayerCircle from './PlayerCircle'
import { positionLabel } from '../lib/players'
import { effectivenessMark } from '../lib/views'
import './TopPlayers.css'

function TopCard({ heading, top, final }) {
  if (!top) {
    return (
      <div className="top-card top-card--empty">
        <span className="top-card__heading">{heading}</span>
        <span className="muted">No starters yet</span>
      </div>
    )
  }

  const { view, value, line } = top
  const eff = effectivenessMark(view.multiplier)

  return (
    <div className="top-card">
      <span className="top-card__heading">{heading}</span>
      <div className="top-card__main">
        <PlayerCircle
          player={view.player}
          name={view.name}
          shiny={view.shiny}
          className="top-card__circle"
        />
        <div className="top-card__text">
          <span className="top-card__name">
            {view.name}
            {eff && (
              <span className={eff.className} title={eff.text}>
                {' '}
                {eff.symbol}
              </span>
            )}
          </span>
          <span className="top-card__player">
            {view.player.player} · {view.player.team} · {positionLabel(view.player.position)}
          </span>
        </div>
        <span className="top-card__value">
          <span className="num">{value.toFixed(1)}</span>
          <span className="top-card__unit">{final ? 'pts' : 'proj'}</span>
        </span>
      </div>
      {line && <p className="top-card__line">{line}</p>}
    </div>
  )
}

const possessive = (name) => (name.endsWith('s') ? `${name}'` : `${name}'s`)

// The best starter on each side: projected before the week, real points after.
export default function TopPlayers({ you, opponent, opponentName, final }) {
  return (
    <div className="top-players">
      <TopCard
        heading={final ? 'Your top player' : 'Your projected top player'}
        top={you}
        final={final}
      />
      <TopCard
        heading={`${opponentName ? possessive(opponentName) : 'Opponent'} top player`}
        top={opponent}
        final={final}
      />
    </div>
  )
}
