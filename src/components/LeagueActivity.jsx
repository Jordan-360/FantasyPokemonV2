import Panel from './Panel'
import { positionLabel } from '../lib/players'
import './LeagueActivity.css'

const SHOW = 12

// Every add/drop in the league, newest first.
export default function LeagueActivity({ transactions, teams, nameOf, byId }) {
  const teamName = (id) => teams.find((t) => t.id === id)?.name
  const recent = [...transactions].reverse().slice(0, SHOW)
  const label = (id) => {
    const p = byId.get(id)
    return p ? `${nameOf(id)} (${positionLabel(p.position)})` : id
  }

  return (
    <Panel title="League activity">
      {recent.length === 0 ? (
        <p className="muted activity__empty">No moves yet. Waiver claims show up here.</p>
      ) : (
        <ol className="activity">
          {recent.map((t, i) => (
            <li key={`${t.week}-${t.teamId}-${t.addId}-${i}`} className="activity__row">
              <span className="activity__week num">Wk {t.week}</span>
              <span className="activity__text">
                <span className={`activity__team ${t.teamId === 'user' ? 'is-user' : ''}`}>
                  {teamName(t.teamId)}
                </span>
                <span className="activity__add">+ {label(t.addId)}</span>
                {t.dropId && <span className="activity__drop">− {label(t.dropId)}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}
