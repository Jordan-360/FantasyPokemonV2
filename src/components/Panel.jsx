import './Panel.css'

export default function Panel({ title, action, className = '', children }) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <div className="panel__header">
          {title && <h2 className="panel__title">{title}</h2>}
          {action && <div className="panel__action">{action}</div>}
        </div>
      )}
      {children}
    </section>
  )
}
