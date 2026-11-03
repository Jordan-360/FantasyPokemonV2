import { FIELD_SLOTS } from '../lib/lineup'
import { effectivenessMark, faintedLabel } from '../lib/views'
import PlayerCircle from './PlayerCircle'
import './Field.css'

function EffMark({ multiplier }) {
  const eff = effectivenessMark(multiplier)
  if (!eff) return null
  return (
    <span className={eff.className} title={eff.text}>
      {' '}
      {eff.symbol}
      <span className="visually-hidden">{eff.text}</span>
    </span>
  )
}

// All 9 starters on the field. Views with `points` (a played week) show the score;
// otherwise the tag shows Madden OVR.
function FieldSlot({ slot, view }) {
  const style = {
    '--x': slot.desktop[0],
    '--y': slot.desktop[1],
    '--mx': slot.phone[0],
    '--my': slot.phone[1],
  }
  const className = `field-slot ${slot.anchor ? `field-slot--${slot.anchor}` : ''}`

  if (!view) {
    return (
      <div className={className} style={style}>
        <span className="field-slot__circle field-slot__circle--empty">{slot.label}</span>
        <span className="field-slot__tag field-slot__tag--empty">Empty</span>
      </div>
    )
  }

  const { player, name, shiny, fainted } = view
  const played = view.points !== undefined && view.points !== null

  return (
    <div className={className} style={style}>
      <PlayerCircle
        player={player}
        name={name}
        shiny={shiny}
        fainted={fainted}
        className="field-slot__circle"
      />
      <span className="field-slot__tag" title={`${name} · ${player.player}`}>
        <span className="field-slot__meta">
          {slot.label} ·{' '}
          {played ? (
            <span className="num field-slot__pts">{view.points.toFixed(1)} pts</span>
          ) : (
            <span className="num">{player.maddenOvr}</span>
          )}
          <EffMark multiplier={view.multiplier} />
        </span>
        <span className="field-slot__name">{name}</span>
        <span className="field-slot__player">
          {fainted ? faintedLabel(fainted) : player.player}
        </span>
      </span>
    </div>
  )
}

export default function Field({ lineupViews = {}, children }) {
  return (
    <div className="field-wrap">
      <div className="field" aria-label="Starting lineup">
        <div className="field__los" />
        {FIELD_SLOTS.map((slot) => (
          <FieldSlot key={slot.id} slot={slot} view={lineupViews[slot.id]} />
        ))}
      </div>
      {children}
    </div>
  )
}
