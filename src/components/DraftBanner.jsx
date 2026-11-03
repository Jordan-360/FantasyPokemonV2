import './DraftBanner.css'

export default function DraftBanner({ onDraftClick }) {
  return (
    <section className="draft-banner" aria-label="Draft reminder">
      <div className="draft-banner__text">
        <p className="draft-banner__title">Your roster is empty</p>
        <p className="draft-banner__subtitle">Draft your team to start the season.</p>
      </div>
      <button className="draft-banner__button" onClick={onDraftClick}>
        Go to Draft Room
      </button>
    </section>
  )
}
