import { useState } from 'react'
import Panel from './Panel'
import PlayerCircle from './PlayerCircle'
import ClaimDialog from './ClaimDialog'
import { POSITION_FILTERS, positionLabel } from '../lib/players'
import { faintedLabel } from '../lib/views'
import './FreeAgentsPanel.css'

// `players` are player views (see lib/views.js), already sorted best-first.
export default function FreeAgentsPanel({
  players,
  canClaim,
  lockedNote = 'claiming opens after the draft',
  rosterFull,
  rosterViews,
  onClaim,
}) {
  const [query, setQuery] = useState('')
  const [position, setPosition] = useState('ALL')
  const [claiming, setClaiming] = useState(null)

  const search = query.trim().toLowerCase()
  const visible = players.filter(({ player: p, name }) => {
    const matchesPosition = position === 'ALL' || p.position === position
    const matchesSearch =
      search === '' ||
      p.pokemon.toLowerCase().includes(search) ||
      name.toLowerCase().includes(search) ||
      p.player.toLowerCase().includes(search)
    return matchesPosition && matchesSearch
  })

  function claim(view) {
    if (rosterFull) setClaiming(view)
    else onClaim(view.player.id, null)
  }

  return (
    <Panel title="Free Agents">
      <label htmlFor="fa-search" className="fa__label">
        Search players or Pokémon
      </label>
      <input
        id="fa-search"
        type="search"
        className="fa__search"
        placeholder="e.g. Pikachu or Diggs"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="fa__filters" role="group" aria-label="Filter by position">
        {POSITION_FILTERS.map((f) => (
          <button
            key={f.id}
            className="fa__filter"
            aria-pressed={position === f.id}
            onClick={() => setPosition(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="fa__count">
        {visible.length} {visible.length === 1 ? 'player' : 'players'} · sorted by projection
        {!canClaim && ` · ${lockedNote}`}
      </p>

      <ul className="fa__list">
        {visible.map((view) => {
          const { player: p, name, shiny, fainted } = view
          return (
            <li key={p.id} className="fa-row">
              <PlayerCircle
                player={p}
                name={name}
                shiny={shiny}
                fainted={fainted}
                className="fa-row__circle"
              />
              <span className="fa-row__text">
                <span className="fa-row__name">
                  {name} <span className="fa-row__pos">{positionLabel(p.position)}</span>
                </span>
                <span className="fa-row__player">
                  {p.player} · {p.team} · OVR <span className="num">{p.maddenOvr}</span>
                </span>
                {fainted && <span className="chip chip--fainted">{faintedLabel(fainted)}</span>}
              </span>
              <span className="fa-row__proj" title="Projected points this week">
                <span className="num">{view.projection.toFixed(1)}</span>
                <span className="fa-row__proj-label">proj</span>
              </span>
              <button
                className="fa-row__claim"
                disabled={!canClaim}
                onClick={() => claim(view)}
                aria-label={`Claim ${name}`}
              >
                Claim
              </button>
            </li>
          )
        })}
        {visible.length === 0 && <li className="fa__empty">No players match your search.</li>}
      </ul>

      {claiming && (
        <ClaimDialog
          adding={claiming}
          rosterViews={rosterViews}
          onConfirm={(dropId) => {
            onClaim(claiming.player.id, dropId)
            setClaiming(null)
          }}
          onCancel={() => setClaiming(null)}
        />
      )}
    </Panel>
  )
}
