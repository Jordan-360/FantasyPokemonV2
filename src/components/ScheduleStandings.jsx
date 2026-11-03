import Panel from './Panel'
import { sortStandings, PLAYOFF_TEAMS } from '../lib/league'
import './ScheduleStandings.css'

function ScheduleList({ teams, schedule, userId, currentWeek }) {
  const nameOf = (id) => teams.find((t) => t.id === id)?.name ?? '—'

  return (
    <ol className="schedule">
      {schedule.map(({ week, games }) => {
        const game = games.find((g) => g.includes(userId))
        const opponentId = game[0] === userId ? game[1] : game[0]
        const isCurrent = week === currentWeek

        return (
          <li key={week} className={`schedule__row ${isCurrent ? 'schedule__row--current' : ''}`}>
            <span className="schedule__week">Wk {week}</span>
            <span className="schedule__opponent">vs {nameOf(opponentId)}</span>
            <span className="schedule__result">—</span>
          </li>
        )
      })}
    </ol>
  )
}

function StandingsTable({ teams, hasDrafted }) {
  const ranked = sortStandings(teams)

  return (
    <>
      <p className="standings__note">
        {hasDrafted ? 'Preseason · ranked by team Madden OVR' : 'Rankings set after the draft'}
      </p>
      <table className="standings">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Team</th>
            <th scope="col">W–L</th>
            <th scope="col">OVR</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((team, i) => (
            <tr
              key={team.id}
              className={[
                team.isUser ? 'standings__row--user' : '',
                i === PLAYOFF_TEAMS - 1 ? 'standings__row--cutoff' : '',
              ].join(' ')}
            >
              <td className="num">{i + 1}</td>
              <td>{team.name}</td>
              <td className="num">
                {team.wins}–{team.losses}
              </td>
              <td className="num">{team.ovr ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

// `tab` and `onTabChange` come from Home, so the phone tab bar can open
// this panel straight to Schedule or to Standings.
export default function ScheduleStandings({
  teams,
  schedule,
  userId,
  currentWeek,
  hasDrafted,
  tab,
  onTabChange,
}) {
  return (
    <Panel>
      <div className="tabs" role="tablist" aria-label="Schedule and standings">
        <button
          role="tab"
          id="tab-schedule"
          aria-selected={tab === 'schedule'}
          aria-controls="panel-schedule"
          className="tabs__tab"
          onClick={() => onTabChange('schedule')}
        >
          Schedule
        </button>
        <button
          role="tab"
          id="tab-standings"
          aria-selected={tab === 'standings'}
          aria-controls="panel-standings"
          className="tabs__tab"
          onClick={() => onTabChange('standings')}
        >
          Standings
        </button>
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'schedule' ? (
          <ScheduleList
            teams={teams}
            schedule={schedule}
            userId={userId}
            currentWeek={currentWeek}
          />
        ) : (
          <StandingsTable teams={teams} hasDrafted={hasDrafted} />
        )}
      </div>
    </Panel>
  )
}
