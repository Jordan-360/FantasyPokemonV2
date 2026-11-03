import './DraftBanner.css'

export default function DraftBanner({
  title = 'Your roster is empty',
  subtitle = 'Draft your team to start the season.',
  buttonLabel = 'Go to Draft Room',
  onDraftClick,
}) {
  return (
    <section className="draft-banner" aria-label="Draft reminder">
      <div className="draft-banner__text">
        <p className="draft-banner__title">{title}</p>
        <p className="draft-banner__subtitle">{subtitle}</p>
      </div>
      {onDraftClick && (
        <button className="draft-banner__button" onClick={onDraftClick}>
          {buttonLabel}
        </button>
      )}
    </section>
  )
}
