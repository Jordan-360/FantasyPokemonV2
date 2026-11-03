import { OFFENSE_SLOTS, SPECIAL_SLOTS } from '../lib/lineup'
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

function FieldSlot({ slot, view }) {
  const position = {
    '--x': slot.desktop[0],
    '--y': slot.desktop[1],
    '--mx': slot.phone[0],
    '--my': slot.phone[1],
  }

  if (!view) {
    return (
      <div className="field-slot" style={position}>
        <span className="field-slot__circle field-slot__circle--empty">{slot.label}</span>
        <span className="field-slot__tag field-slot__tag--empty">Empty</span>
      </div>
    )
  }

  const { player, name, shiny, fainted } = view
  return (
    <div className="field-slot" style={position}>
      <PlayerCircle
        player={player}
        name={name}
        shiny={shiny}
        fainted={fainted}
        className="field-slot__circle"
      />
      <span className="field-slot__tag" title={faintedLabel(fainted) ?? undefined}>
        <span className="field-slot__meta">
          {slot.label} · <span className="num">{player.maddenOvr}</span>
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

function SpecialCard({ slot, view }) {
  return (
    <div className="special-card">
      {view ? (
        <PlayerCircle
          player={view.player}
          name={view.name}
          shiny={view.shiny}
          fainted={view.fainted}
          className="field-slot__circle field-slot__circle--small"
        />
      ) : (
        <span className="field-slot__circle field-slot__circle--small field-slot__circle--empty">
          {slot.label}
        </span>
      )}
      <div className="special-card__text">
        <span className="special-card__label">
          {slot.label}
          {view && <EffMark multiplier={view.multiplier} />}
        </span>
        <span className="special-card__name">{view ? view.name : 'Empty'}</span>
        {view && (
          <span className="special-card__player">
            {view.fainted ? faintedLabel(view.fainted) : view.player.player}
          </span>
        )}
      </div>
      {view && <span className="special-card__ovr num">{view.player.maddenOvr}</span>}
    </div>
  )
}

export default function Field({ lineupViews = {} }) {
  return (
    <div className="field-wrap">
      <div className="field" aria-label="Starting lineup">
        <div className="field__los" />
        {OFFENSE_SLOTS.map((slot) => (
          <FieldSlot key={slot.id} slot={slot} view={lineupViews[slot.id]} />
        ))}
      </div>

      <div className="field__special">
        {SPECIAL_SLOTS.map((slot) => (
          <SpecialCard key={slot.id} slot={slot} view={lineupViews[slot.id]} />
        ))}
      </div>
    </div>
  )
}
