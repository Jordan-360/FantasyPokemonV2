import './Header.css'

export default function Header({ leagueName, teamName, record, week }) {
  return (
    <header className="header">
      <div className="header__brand">
        <img src="/logo.svg" alt="Fantasy Pokemon Logo" width={40} height={40} />
        <span className="header__title">
          Fantasy <span className="header__title-accent">Pokemon</span>
        </span>
      </div>
      <div className="header__info">
        <span className="header__league">{leagueName}</span>
        <span className="header__team">
          {teamName} · <span className="num">{record}</span>
        </span>
        <span className="header__week">{week}</span>
      </div>
    </header>
  )
}
