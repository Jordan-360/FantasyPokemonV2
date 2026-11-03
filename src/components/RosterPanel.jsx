import Panel from './Panel'
import { STARTER_SLOTS, BENCH_SIZE } from '../lib/lineup'
import { typeStyle } from '../lib/typeColors'
import './RosterPanel.css'

function RosterRow({ label, player, action }) {
  return (
    <li className="roster-row">
      <span className="roster-row__slot">{label}</span>

      {player ? (
        <>
          <span className="roster-row__circle" style={typeStyle(player.types)}>
            {player.pokemon.slice(0, 2)}
          </span>
          <span className="roster-row__text">
            <span className="roster-row__name">{player.pokemon}</span>
            <span className="roster-row__player">
              {player.player} · {player.team}
            </span>
          </span>
          {action ?? <span className="roster-row__ovr num">{player.maddenOvr}</span>}
        </>
      ) : (
        <>
          <span className="roster-row__circle roster-row__circle--empty" />
          <span className="roster-row__text roster-row__text--empty">Empty</span>
        </>
      )}
    </li>
  )
}

export default function RosterPanel({ lineup = {}, bench = [] }) {
  const hasPlayers = Object.keys(lineup).length > 0 || bench.length > 0

  // Always show 6 bench rows: real players first, then empty spots
  const benchRows = Array.from({ length: BENCH_SIZE }, (_, i) => bench[i] ?? null)

  return (
    <Panel
      title="My Roster"
      className="home__roster"
      action={
        <button className="roster__edit" disabled={!hasPlayers}>
          Edit lineup
        </button>
      }
    >
      <h3 className="roster__group">Starters</h3>
      <ul className="roster__list">
        {STARTER_SLOTS.map((slot) => (
          <RosterRow key={slot.id} label={slot.label} player={lineup[slot.id]} />
        ))}
      </ul>

      <h3 className="roster__group">Bench</h3>
      <ul className="roster__list">
        {benchRows.map((player, i) => (
          <RosterRow
            key={player?.id ?? `empty-${i}`}
            label="BN"
            player={player}
            action={player && <button className="roster-row__start">Start</button>}
          />
        ))}
      </ul>
    </Panel>
  )
}
