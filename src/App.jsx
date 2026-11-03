import Header from './components/Header'
import Home from './pages/Home'

export default function App() {
  const roster = []
  return (
    <>
      <Header leagueName="Premier League" teamName="Team Rocket" record="12-4" week="Week 12" />
      <Home roster={roster} />
    </>
  )
}
