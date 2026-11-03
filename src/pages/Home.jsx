import { useState } from 'react'
import DraftBanner from '../components/DraftBanner'
import Field from '../components/Field'
import RosterPanel from '../components/RosterPanel'
import ScheduleStandings from '../components/ScheduleStandings'
import FreeAgentsPanel from '../components/FreeAgentsPanel'
import MobileTabBar from '../components/MobileTabBar'
import { createTeams, generateSchedule } from '../lib/league'
import { buildPlayerPool } from '../lib/players'
import pairs from '../data/pairs.json'
import dstUnits from '../data/dst_units.json'
import './Home.css'

// ---------- Data built once when the app loads ----------
const playerPool = buildPlayerPool(pairs, dstUnits)

// Placeholder league until league setup + saving exist
const teams = createTeams('Team Wood')
const schedule = generateSchedule(teams.map((t) => t.id))

// ---------- Preview data (temporary, until the draft fills the roster) ----------
const PREVIEW = true // set to false to see the empty, pre-draft state

const find = (name) => playerPool.find((p) => p.pokemon === name)

const sample = {
  QB: find('Mewtwo'),
  RB1: find('Arceus'),
  RB2: find('Kangaskhan'),
  WR1: find('Aerodactyl'),
  WR2: find('Thundurus'),
  TE: find('Palkia'),
  FLEX: find('Talonflame'),
  K: find('Hitmonlee'),
  DST: find('DEN D/ST'),
}

const sampleBench = [find('Jolteon'), find('Salamence')]

// ---------- Home page ----------
export default function Home({ roster }) {
  const hasDrafted = roster.length > 0

  const lineup = PREVIEW ? sample : {}
  const bench = PREVIEW ? sampleBench : []

  // Free agents = everyone not on your roster
  const rosteredIds = new Set([...Object.values(lineup), ...bench].map((p) => p.id))
  const freeAgents = playerPool.filter((p) => !rosteredIds.has(p.id))

  // Which inner tab the Schedule/Standings panel shows
  const [leagueTab, setLeagueTab] = useState('schedule')
  // Which section the phone tab bar shows: team | schedule | standings | fa
  const [mobileTab, setMobileTab] = useState('team')

  function changeMobileTab(tab) {
    setMobileTab(tab)
    if (tab === 'schedule' || tab === 'standings') setLeagueTab(tab)
    window.scrollTo(0, 0)
  }

  function changeLeagueTab(tab) {
    setLeagueTab(tab)
    if (mobileTab === 'schedule' || mobileTab === 'standings') setMobileTab(tab)
  }

  // On phones, only the active tab's sections are shown (see Home.css)
  const showOnMobile = {
    team: mobileTab === 'team',
    league: mobileTab === 'schedule' || mobileTab === 'standings',
    fa: mobileTab === 'fa',
  }

  return (
    <main className="home">
      {!hasDrafted && <DraftBanner onDraftClick={() => console.log('Draft Room coming soon')} />}

      <div className="home__grid">
        <div className="home__roster" data-mobile-active={showOnMobile.team}>
          <RosterPanel lineup={lineup} bench={bench} />
        </div>

        <div className="home__schedule" data-mobile-active={showOnMobile.league}>
          <ScheduleStandings
            teams={teams}
            schedule={schedule}
            userId="user"
            currentWeek={1}
            hasDrafted={hasDrafted}
            tab={leagueTab}
            onTabChange={changeLeagueTab}
          />
        </div>

        <div className="home__field" data-mobile-active={showOnMobile.team}>
          <Field lineup={lineup} />
        </div>

        <div className="home__free-agents" data-mobile-active={showOnMobile.fa}>
          <FreeAgentsPanel
            players={freeAgents}
            canClaim={hasDrafted}
            onClaim={(player) => console.log('Claim', player.pokemon)}
          />
        </div>
      </div>

      <MobileTabBar active={mobileTab} onChange={changeMobileTab} />
    </main>
  )
}
