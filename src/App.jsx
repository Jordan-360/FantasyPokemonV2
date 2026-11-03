import { useEffect, useState } from 'react'
import Header from './components/Header'
import Home from './pages/Home'
import DraftRoom from './pages/DraftRoom'
import useLeague from './hooks/useLeague'
import { weekLabel } from './lib/league'

// Two screens, picked by the URL hash so the back button works: #draft or home.
function useScreen() {
  const read = () => (window.location.hash === '#draft' ? 'draft' : 'home')
  const [screen, setScreen] = useState(read)

  useEffect(() => {
    const onHash = () => {
      setScreen(read())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (next) => {
    window.location.hash = next === 'draft' ? 'draft' : ''
  }
  return [screen, go]
}

function headerWeek(league) {
  if (!league) return 'Preseason'
  if (league.phase === 'draft') return 'Draft'
  if (league.phase === 'complete') return 'Season over'
  return weekLabel(league.currentWeek)
}

export default function App() {
  const { league, ctx, actions } = useLeague()
  const [screen, go] = useScreen()
  const user = league?.teams.find((t) => t.isUser)

  function newLeague() {
    if (window.confirm('Start a new league? Your current league will be deleted.')) {
      actions.resetLeague()
      go('draft')
    }
  }

  return (
    <>
      <Header
        leagueName={league?.leagueName}
        teamName={user?.name}
        record={user && league.phase !== 'draft' ? `${user.wins}-${user.losses}` : null}
        week={headerWeek(league)}
        onLogoClick={() => go('home')}
        onNewLeague={league ? newLeague : null}
      />
      {screen === 'draft' ? (
        <DraftRoom league={league} ctx={ctx} actions={actions} onDone={() => go('home')} />
      ) : (
        <Home league={league} ctx={ctx} actions={actions} onOpenDraft={() => go('draft')} />
      )}
    </>
  )
}
