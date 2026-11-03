import WeekPicker from './WeekPicker'
import './Header.css'

export default function Header({
  leagueName,
  teamName,
  record,
  week,
  weekNav,
  onLogoClick,
  onNewLeague,
  children,
}) {
  return (
    <header className="header">
      <a
        className="header__brand"
        href="#"
        onClick={(e) => {
          e.preventDefault()
          onLogoClick?.()
        }}
      >
        <img src="/logo.svg" alt="" width={40} height={40} />
        <span className="header__title">
          Fantasy <span className="header__title-accent">Pokémon</span>
        </span>
      </a>
      <div className="header__info">
        {leagueName && <span className="header__league">{leagueName}</span>}
        {teamName && (
          <span className="header__team">
            {teamName}
            {record && (
              <>
                {' '}
                · <span className="num">{record}</span>
              </>
            )}
          </span>
        )}
        {weekNav ? (
          <WeekPicker {...weekNav} />
        ) : (
          week && <span className="header__week">{week}</span>
        )}
        {onNewLeague && (
          <button className="header__new" onClick={onNewLeague} title="Start a new league">
            New league
          </button>
        )}
      </div>
      {children}
    </header>
  )
}
