import { useState } from 'react'
import BoxScoreDialog from './BoxScoreDialog'
import { weekLabel } from '../lib/league'
import './Scoreboard.css'

function TeamLine({ team, score, isWinner, final }) {
  return (
    <span className={`score-chip__team ${final && !isWinner ? 'is-loser' : ''}`}>
      <span className="score-chip__name">{team.name}</span>
      <span className="score-chip__score num">{score.toFixed(1)}</span>
    </span>
  )
}

// ESPN-style score bar under the header: every game in the week being viewed.
// Tap a game for its box score.
export default function Scoreboard({ week, games, teams, nameOf, detailOf }) {
  const [open, setOpen] = useState(null)
  if (!games.length) return null

  const teamOf = (id) => teams.find((t) => t.id === id)
  const final = games[0].final

  return (
    <div className="scoreboard">
      <div className="scoreboard__label">
        <span className="scoreboard__week">{weekLabel(week)}</span>
        <span className="scoreboard__status">{final ? 'Final' : 'Projected'}</span>
      </div>
      <ul className="scoreboard__games">
        {games.map((g) => {
          const isUser = g.a === 'user' || g.b === 'user'
          return (
            <li key={`${g.a}-${g.b}`}>
              <button
                className={`score-chip ${isUser ? 'score-chip--user' : ''}`}
                onClick={() => setOpen(g)}
                aria-label={`${teamOf(g.a).name} ${g.scoreA} vs ${teamOf(g.b).name} ${g.scoreB}. View box score`}
              >
                <TeamLine
                  team={teamOf(g.a)}
                  score={g.scoreA}
                  isWinner={g.winner === g.a}
                  final={final}
                />
                <TeamLine
                  team={teamOf(g.b)}
                  score={g.scoreB}
                  isWinner={g.winner === g.b}
                  final={final}
                />
                <span className="score-chip__cta">Box score</span>
              </button>
            </li>
          )
        })}
      </ul>

      {open && (
        <BoxScoreDialog
          week={week}
          game={open}
          teamA={teamOf(open.a)}
          teamB={teamOf(open.b)}
          nameOf={nameOf}
          detailOf={detailOf}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}
