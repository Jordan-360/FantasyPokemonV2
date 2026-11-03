import Panel from './Panel'
import {
  sortStandings,
  PLAYOFF_TEAMS,
  REGULAR_SEASON_WEEKS,
  SEMIFINAL_WEEK,
  FINAL_WEEK,
} from '../lib/league'
import './ScheduleStandings.css'

function resultFor(results, week, userId) {
  const r = results?.[week]?.find((g) => g.a === userId || g.b === userId)
  if (!r) return null
  const mine = r.a === userId ? r.scoreA : r.scoreB
  const theirs = r.a === userId ? r.scoreB : r.scoreA
  return { won: r.winner === userId, mine, theirs }
}

function ScheduleRow({ label, opponent, result, isCurrent }) {
  return (
    <li className={`schedule__row ${isCurrent ? 'schedule__row--current' : ''}`}>
      <span className="schedule__week">{label}</span>
      <span className="schedule__opponent">{opponent}</span>
      <span className={`schedule__result ${result ? (result.won ? 'is-win' : 'is-loss') : ''}`}>
        {result ? (
          <>
            {result.won ? 'W' : 'L'}{' '}
            <span className="num">
              {result.mine.toFixed(1)}–{result.theirs.toFixed(1)}
            </span>
          </>
        ) : (
          '—'
        )}
      </span>
    </li>
  )
}

function ScheduleList({ teams, schedule, results, playoffs, userId, currentWeek }) {
  const nameOf = (id) => teams.find((t) => t.id === id)?.name ?? '—'

  const playoffRow = (week, label, games) => {
    const game = games?.find((g) => g?.includes(userId))
    let opponent = 'TBD'
    if (game) opponent = `vs ${nameOf(game[0] === userId ? game[1] : game[0])}`
    else if (games) opponent = inSemis ? 'Eliminated' : 'Missed playoffs'
    return (
      <ScheduleRow
        key={week}
        label={label}
        opponent={opponent}
        result={resultFor(results, week, userId)}
        isCurrent={week === currentWeek}
      />
    )
  }

  // Final: known once the semis are played; TBD while you're still alive
  const inSemis = playoffs?.semis.some((g) => g.includes(userId))
  let finalGames = null
  if (playoffs?.final) finalGames = [playoffs.final]
  else if (playoffs && !inSemis) finalGames = []

  return (
    <ol className="schedule">
      {schedule.map(({ week, games }) => {
        const game = games.find((g) => g.includes(userId))
        const opponentId = game[0] === userId ? game[1] : game[0]
        return (
          <ScheduleRow
            key={week}
            label={`Wk ${week}`}
            opponent={`vs ${nameOf(opponentId)}`}
            result={resultFor(results, week, userId)}
            isCurrent={week === currentWeek}
          />
        )
      })}
      {playoffRow(SEMIFINAL_WEEK, 'Semi', playoffs?.semis)}
      {playoffRow(FINAL_WEEK, 'Final', finalGames)}
    </ol>
  )
}

function StandingsTable({ teams, hasDrafted, inSeason, playoffs }) {
  const ranked = sortStandings(teams)
  const seeds = playoffs?.seeds ?? []

  let note = 'Rankings set after the draft'
  if (inSeason) note = `Top ${PLAYOFF_TEAMS} make the playoffs · ties broken by points scored`
  else if (hasDrafted) note = 'Preseason · ranked by team Madden OVR'

  return (
    <>
      <p className="standings__note">{note}</p>
      <table className="standings">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Team</th>
            <th scope="col">W–L</th>
            <th scope="col">PF</th>
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
              <td>
                {team.name}
                {playoffs?.champion === team.id && <span className="standings__tag"> 🏆</span>}
                {seeds.includes(team.id) && playoffs?.champion !== team.id && (
                  <span className="standings__tag"> · Seed {seeds.indexOf(team.id) + 1}</span>
                )}
              </td>
              <td className="num">
                {team.wins}–{team.losses}
              </td>
              <td className="num">{team.pointsFor ? Math.round(team.pointsFor) : '—'}</td>
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
  results,
  playoffs,
  userId,
  currentWeek,
  hasDrafted,
  tab,
  onTabChange,
}) {
  const inSeason = Object.keys(results ?? {}).length > 0

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
            schedule={schedule.slice(0, REGULAR_SEASON_WEEKS)}
            results={results}
            playoffs={playoffs}
            userId={userId}
            currentWeek={currentWeek}
          />
        ) : (
          <StandingsTable
            teams={teams}
            hasDrafted={hasDrafted}
            inSeason={inSeason}
            playoffs={playoffs}
          />
        )}
      </div>
    </Panel>
  )
}
