import { useEffect, useRef } from 'react'
import PlayerCircle from './PlayerCircle'
import { positionLabel } from '../lib/players'
import './ClaimDialog.css'

// Add X, drop Y: shown when your roster is full.
export default function ClaimDialog({ adding, rosterViews, onConfirm, onCancel }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal?.()
    return () => dialog?.close?.()
  }, [])

  return (
    <dialog ref={ref} className="claim-dialog" onCancel={onCancel} aria-labelledby="claim-title">
      <h2 id="claim-title" className="claim-dialog__title">
        Add {adding.name}
      </h2>
      <p className="muted">
        Your roster is full. Pick a player to drop for {adding.name} (
        {positionLabel(adding.player.position)}, {adding.projection.toFixed(1)} proj).
      </p>
      <ul className="claim-dialog__list">
        {[...rosterViews]
          .sort((a, b) => Boolean(a.slot) - Boolean(b.slot) || a.projection - b.projection)
          .map((v) => (
            <li key={v.player.id} className="claim-dialog__row">
              <PlayerCircle
                player={v.player}
                name={v.name}
                shiny={v.shiny}
                fainted={v.fainted}
                className="fa-row__circle"
              />
              <span className="claim-dialog__text">
                <span className="claim-dialog__name">
                  {v.name} <span className="fa-row__pos">{positionLabel(v.player.position)}</span>
                </span>
                <span className="claim-dialog__meta">
                  {v.slot ? `Starting at ${v.slot}` : 'Bench'} · {v.projection.toFixed(1)} proj
                </span>
              </span>
              <button className="btn btn--small" onClick={() => onConfirm(v.player.id)}>
                Drop
              </button>
            </li>
          ))}
      </ul>
      <button className="btn" onClick={onCancel}>
        Cancel
      </button>
    </dialog>
  )
}
