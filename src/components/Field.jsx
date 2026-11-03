import { OFFENSE_SLOTS, SPECIAL_SLOTS } from '../lib/lineup'
import { typeStyle } from '../lib/typeColors'
import './Field.css'

function initials(name) {
  return name.slice(0, 2)
}

function FieldSlot({ slot, player }) {
  const position = {
    '--x': slot.desktop[0],
    '--y': slot.desktop[1],
    '--mx': slot.phone[0],
    '--my': slot.phone[1],
  }

  if (!player) {
    return (
      <div className="field-slot" style={position}>
        <span className="field-slot__circle field-slot__circle--empty">{slot.label}</span>
        <span className="field-slot__tag field-slot__tag--empty">Empty</span>
      </div>
    )
  }

  return (
    <div className="field-slot" style={position}>
      <span className="field-slot__circle" style={typeStyle(player.types)}>
        {initials(player.pokemon)}
      </span>
      <span className="field-slot__tag">
        <span className="field-slot__meta">
          {slot.label} · <span className="num">{player.maddenOvr}</span>
        </span>
        <span className="field-slot__name">{player.pokemon}</span>
        <span className="field-slot__player">{player.player}</span>
      </span>
    </div>
  )
}

function SpecialCard({ slot, player }) {
  return (
    <div className="special-card">
      {player ? (
        <span
          className="field-slot__circle field-slot__circle--small"
          style={typeStyle(player.types)}
        >
          {initials(player.pokemon)}
        </span>
      ) : (
        <span className="field-slot__circle field-slot__circle--small field-slot__circle--empty">
          {slot.label}
        </span>
      )}
      <div className="special-card__text">
        <span className="special-card__label">{slot.label}</span>
        <span className="special-card__name">{player ? player.pokemon : 'Empty'}</span>
        {player && <span className="special-card__player">{player.player}</span>}
      </div>
      {player && <span className="special-card__ovr num">{player.maddenOvr}</span>}
    </div>
  )
}

export default function Field({ lineup = {} }) {
  return (
    <div className="field-wrap">
      <div className="field" aria-label="Starting lineup">
        <div className="field__los" />
        {OFFENSE_SLOTS.map((slot) => (
          <FieldSlot key={slot.id} slot={slot} player={lineup[slot.id]} />
        ))}
      </div>

      <div className="field__special">
        {SPECIAL_SLOTS.map((slot) => (
          <SpecialCard key={slot.id} slot={slot} player={lineup[slot.id]} />
        ))}
      </div>
    </div>
  )
}
