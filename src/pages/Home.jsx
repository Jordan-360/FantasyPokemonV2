import DraftBanner from '../components/DraftBanner'
import Panel from '../components/Panel'
import './Home.css'

export default function Home({ roster }) {
  const hasDrafted = roster.length > 0

  return (
    <main className="home">
      {!hasDrafted && <DraftBanner onDraftClick={() => console.log('Draft Room coming soon')} />}

      <div className="home__grid">
        <Panel title="My Roster" className="home__roster">
          <p className="placeholder">Roster goes here</p>
        </Panel>

        <Panel className="home__schedule">
          <p className="placeholder">Schedule / Standings go here</p>
        </Panel>

        <div className="home__field">
          <p className="placeholder">Field goes here</p>
        </div>

        <Panel title="Free Agents" className="home__free-agents">
          <p className="placeholder">Free agents go here</p>
        </Panel>
      </div>
    </main>
  )
}
