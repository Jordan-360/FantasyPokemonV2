import { useState } from 'react'
import Panel from './Panel'
import PlayerCircle from './PlayerCircle'
import { STARTER_SLOTS, BENCH_SIZE, eligibleSlots, slotLabel } from '../lib/lineup'
import { faintedLabel, effectivenessMark } from '../lib/views'
import './RosterPanel.css'

function RosterRow({ label, view, action, showProjection }) {
  if (!view) {
    return (
      <li className="roster-row">
        <span className="roster-row__slot">{label}</span>
        <span className="roster-row__circle roster-row__circle--empty" />
        <span className="roster-row__text roster-row__text--empty">Empty</span>
        {action}
      </li>
    )
  }

  const { player, name, evolvedFrom, shiny, fainted } = view
  const eff = effectivenessMark(view.multiplier)

  return (
    <li className="roster-row">
      <span className="roster-row__slot">{label}</span>
      <PlayerCircle
        player={player}
        name={name}
        shiny={shiny}
        fainted={fainted}
        className="roster-row__circle"
      />
      <span className="roster-row__text">
        <span className="roster-row__name">
          {name}
          {eff && (
            <span className={eff.className} title={eff.text}>
              {' '}
              {eff.symbol}
              <span className="visually-hidden">{eff.text}</span>
            </span>
          )}
        </span>
        <span className="roster-row__player">
          {evolvedFrom && `${evolvedFrom} · `}
          {player.player} · {player.team}
        </span>
        {fainted && <span className="chip chip--fainted">{faintedLabel(fainted)}</span>}
      </span>
      <span className="roster-row__stats">
        <span className="roster-row__ovr num" title="Madden OVR">
          {player.maddenOvr}
        </span>
        {showProjection && (
          <span className="roster-row__proj" title="Projected points this week">
            <span className="num">{view.projection.toFixed(1)}</span> proj
          </span>
        )}
      </span>
      {action}
    </li>
  )
}

function SlotPicker({ view, lineupViews, onPick, onCancel }) {
  const slots = eligibleSlots(view.player.position)
  return (
    <li className="slot-picker">
      <span className="slot-picker__label">Start {view.name} at:</span>
      <div className="slot-picker__options">
        {slots.map((slot) => (
          <button key={slot} className="btn btn--small" onClick={() => onPick(slot)}>
            {slotLabel(slot)} · {lineupViews[slot]?.name ?? 'empty'}
          </button>
        ))}
        <button className="btn btn--small" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </li>
  )
}

export default function RosterPanel({
  title = 'My Roster',
  lineupViews = {},
  benchViews = [],
  editable = false,
  showProjection = false,
  onStart,
  onBench,
  onOptimize,
}) {
  const [editing, setEditing] = useState(false)
  const [picking, setPicking] = useState(null)

  const hasPlayers = Object.keys(lineupViews).length > 0 || benchViews.length > 0
  const benchRows = Array.from(
    { length: Math.max(BENCH_SIZE, benchViews.length) },
    (_, i) => benchViews[i] ?? null
  )
  const faintedStarters = Object.values(lineupViews).filter((v) => v?.fainted)
  const emptySlots = STARTER_SLOTS.filter((s) => !lineupViews[s.id])

  return (
    <Panel
      title={title}
      action={
        editable && (
          <button
            className="roster__edit"
            disabled={!hasPlayers}
            aria-pressed={editing}
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? 'Done' : 'Edit lineup'}
          </button>
        )
      }
    >
      {editable && (faintedStarters.length > 0 || (hasPlayers && emptySlots.length > 0)) && (
        <div className="roster__warning" role="status">
          {faintedStarters.length > 0 && (
            <p>
              <strong>
                {faintedStarters.length} fainted starter{faintedStarters.length > 1 ? 's' : ''}:
              </strong>{' '}
              {faintedStarters.map((v) => v.name).join(', ')} will score 0 this week.
            </p>
          )}
          {emptySlots.length > 0 && (
            <p>
              <strong>Empty slots:</strong> {emptySlots.map((s) => s.label).join(', ')}
            </p>
          )}
          <button className="btn btn--small btn--primary" onClick={onOptimize}>
            Auto-set best lineup
          </button>
        </div>
      )}

      {editing && (
        <button className="btn btn--small" onClick={onOptimize}>
          Auto-set best lineup
        </button>
      )}

      <h3 className="roster__group">Starters</h3>
      <ul className="roster__list">
        {STARTER_SLOTS.map((slot) => (
          <RosterRow
            key={slot.id}
            label={slot.label}
            view={lineupViews[slot.id]}
            showProjection={showProjection}
            action={
              editing &&
              lineupViews[slot.id] && (
                <button className="roster-row__start" onClick={() => onBench(slot.id)}>
                  Bench
                </button>
              )
            }
          />
        ))}
      </ul>

      <h3 className="roster__group">Bench</h3>
      <ul className="roster__list">
        {benchRows.flatMap((view, i) => {
          const row = (
            <RosterRow
              key={view?.player.id ?? `empty-${i}`}
              label="BN"
              view={view}
              showProjection={showProjection}
              action={
                editable &&
                view && (
                  <button
                    className="roster-row__start"
                    aria-expanded={picking === view.player.id}
                    onClick={() => setPicking(picking === view.player.id ? null : view.player.id)}
                  >
                    Start
                  </button>
                )
              }
            />
          )
          if (!view || picking !== view.player.id) return [row]
          return [
            row,
            <SlotPicker
              key={`${view.player.id}-picker`}
              view={view}
              lineupViews={lineupViews}
              onPick={(slot) => {
                onStart(view.player.id, slot)
                setPicking(null)
              }}
              onCancel={() => setPicking(null)}
            />,
          ]
        })}
      </ul>
    </Panel>
  )
}
