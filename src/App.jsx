import { useEffect, useState } from 'react'
import Header from './components/Header'
import Home from './pages/Home'
import DraftRoom from './pages/DraftRoom'
import useLeague from './hooks/useLeague'
import { weekLabel } from './lib/league'
import { playedUserWeeks, userResult } from './lib/season'

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

// Options for the header's week picker: every week you've played, then the current one.
// The current week (or "Season over") has value 0.
function weekOptions(league) {
  if (!league || league.phase === 'draft') return null
  const played = playedUserWeeks(league).map((w) => {
    const r = userResult(league, w)
    return { value: w, label: `${weekLabel(w)} · ${r.winner === 'user' ? 'W' : 'L'}` }
  })
  const current = { value: 0, label: headerWeek(league) }
  return [...played, current]
}

export default function App() {
  const { league, ctx, actions } = useLeague()
  const [screen, go] = useScreen()
  const user = league?.teams.find((t) => t.isUser)

  // Which week Home shows: null = the current week, a number = a played week
  const [viewWeek, setViewWeek] = useState(null)
  const options = weekOptions(league)
  const shownWeek = options?.some((o) => o.value === viewWeek) ? viewWeek : null

  function newLeague() {
    if (window.confirm('Start a new league? Your current league will be deleted.')) {
      actions.resetLeague()
      setViewWeek(null)
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
        weekNav={
          screen === 'home' && options?.length > 1
            ? {
                options,
                value: shownWeek ?? 0,
                onChange: (w) => setViewWeek(w || null),
              }
            : null
        }
        onLogoClick={() => go('home')}
        onNewLeague={league ? newLeague : null}
      />
      {screen === 'draft' ? (
        <DraftRoom league={league} ctx={ctx} actions={actions} onDone={() => go('home')} />
      ) : (
        <Home
          league={league}
          ctx={ctx}
          actions={actions}
          onOpenDraft={() => go('draft')}
          viewWeek={shownWeek}
          onViewWeek={setViewWeek}
        />
      )}
    </>
  )
}
