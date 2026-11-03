import Header from './components/Header'
import DraftBanner from './components/DraftBanner'

export default function App() {
  const roster = []
  return (
    <>
      <Header leagueName="Premier League" teamName="Team Rocket" record="12-4" week="Week 12" />
      <main style={{ padding: 24 }}>
        {roster.length === 0 && (
          <DraftBanner onDraftClick={() => console.log('Draft Room coming soon...')} />
        )}
      </main>
    </>
  )
}
