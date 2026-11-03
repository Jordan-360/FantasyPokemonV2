import { useEffect } from 'react'
import './Toasts.css'

const AUTO_DISMISS_MS = 6000

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration ?? AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onDismiss])

  return (
    <li className={`toast toast--${toast.kind ?? 'info'}`}>
      <div className="toast__body">
        <p className="toast__title">{toast.title}</p>
        {toast.lines?.map((line, i) => (
          <p key={i} className="toast__line">
            {line}
          </p>
        ))}
      </div>
      <button className="toast__close" onClick={() => onDismiss(toast.id)} aria-label="Dismiss">
        ×
      </button>
    </li>
  )
}

// Short-lived notifications: claims, week results, waiver moves.
export default function Toasts({ toasts, onDismiss }) {
  return (
    <ul className="toasts" aria-live="polite" aria-label="Notifications">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </ul>
  )
}
