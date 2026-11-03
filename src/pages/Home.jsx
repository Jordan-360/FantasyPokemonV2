import DraftBanner from '../components/DraftBanner'
import Panel from '../components/Panel'
import Field from '../components/Field'
import RosterPanel from '../components/RosterPanel'
import pairs from '../data/pairs.json'
import './Home.css'
import ScheduleStandings from '../components/ScheduleStandings'
import { createTeams, generateSchedule } from '../lib/league'

const PREVIEW = true
const teams = createTeams('Team Wood')
const schedule = generateSchedule(teams.map((t) => t.id))
const find = (name) => pairs.find((p) => p.pokemon === name)

const sample = {
  QB: find('Mewtwo'),
  RB1: find('Arceus'),
  RB2: find('Kangaskhan'),
  WR1: find('Aerodactyl'),
  WR2: find('Thundurus'),
  TE: find('Palkia'),
  FLEX: find('Talonflame'),
  K: find('Hitmonlee'),
}

const sampleBench = [find('Jolteon'), find('Salamence')]

export default function Home({ roster }) {
  const hasDrafted = roster.length > 0

  const lineup = PREVIEW ? sample : {}
  const bench = PREVIEW ? sampleBench : []

  return (
    <main className="home">
      {!hasDrafted && <DraftBanner onDraftClick={() => console.log('Draft Room coming soon')} />}

      <div className="home__grid">
        <RosterPanel lineup={lineup} bench={bench} />

        <ScheduleStandings
          teams={teams}
          schedule={schedule}
          userId="user"
          currentWeek={1}
          hasDrafted={hasDrafted}
        />

        <div className="home__field">
          <Field lineup={lineup} />
        </div>

        <Panel title="Free Agents" className="home__free-agents">
          <p className="placeholder">Free agents go here</p>
        </Panel>
      </div>
    </main>
  )
}
