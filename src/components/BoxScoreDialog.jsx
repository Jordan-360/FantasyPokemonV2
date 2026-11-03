import { useEffect, useRef } from 'react'
import BoxScore from './BoxScore'
import { weekLabel } from '../lib/league'
import '../components/ClaimDialog.css'
import './BoxScoreDialog.css'

export default function BoxScoreDialog({ week, game, teamA, teamB, nameOf, detailOf, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal?.()
    return () => dialog?.close?.()
  }, [])

  const projected = !game.final
  const winner = game.winner === game.a ? teamA : game.winner === game.b ? teamB : null

  return (
    <dialog
      ref={ref}
      className="claim-dialog box-dialog"
      onCancel={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="box-title"
    >
      <div className="box-dialog__head">
        <h2 id="box-title" className="claim-dialog__title">
          {weekLabel(week)} · {projected ? 'Projected' : 'Final'}
        </h2>
        <button className="toast__close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <div className="box-dialog__score">
        <span className={game.winner === game.b ? 'muted' : ''}>
          {teamA.name} <span className="num">{game.scoreA.toFixed(1)}</span>
        </span>
        <span className="muted">–</span>
        <span className={game.winner === game.a ? 'muted' : ''}>
          <span className="num">{game.scoreB.toFixed(1)}</span> {teamB.name}
        </span>
      </div>
      <p className="muted box-dialog__note">
        {winner
          ? `${winner.name} won by ${Math.abs(game.scoreA - game.scoreB).toFixed(1)}`
          : 'Not played yet · projected points for the current lineups'}
      </p>

      <div className="box-dialog__tables">
        <BoxScore
          title={teamA.name}
          total={game.scoreA}
          lines={game.lineA}
          nameOf={nameOf}
          detailOf={detailOf}
          projected={projected}
        />
        <BoxScore
          title={teamB.name}
          total={game.scoreB}
          lines={game.lineB}
          nameOf={nameOf}
          detailOf={detailOf}
          projected={projected}
        />
      </div>
    </dialog>
  )
}
