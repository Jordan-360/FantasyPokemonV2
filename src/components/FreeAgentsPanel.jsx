import { useState } from 'react'
import Panel from './Panel'
import { POSITION_FILTERS, positionLabel } from '../lib/players'
import { typeStyle } from '../lib/typeColors'
import './FreeAgentsPanel.css'

export default function FreeAgentsPanel({ players, canClaim, onClaim }) {
  const [query, setQuery] = useState('')
  const [position, setPosition] = useState('ALL')

  const search = query.trim().toLowerCase()
  const visible = players.filter((p) => {
    const matchesPosition = position === 'ALL' || p.position === position
    const matchesSearch =
      search === '' ||
      p.pokemon.toLowerCase().includes(search) ||
      p.player.toLowerCase().includes(search)
    return matchesPosition && matchesSearch
  })

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
        {visible.length} {visible.length === 1 ? 'player' : 'players'}
        {!canClaim && ' · claiming opens after the draft'}
      </p>

      <ul className="fa__list">
        {visible.map((p) => (
          <li key={p.id} className="fa-row">
            <span className="fa-row__circle" style={typeStyle(p.types)}>
              {p.pokemon.slice(0, 2)}
            </span>
            <span className="fa-row__text">
              <span className="fa-row__name">
                {p.pokemon} <span className="fa-row__pos">{positionLabel(p.position)}</span>
              </span>
              <span className="fa-row__player">
                {p.player} · {p.team} · OVR <span className="num">{p.maddenOvr}</span>
              </span>
            </span>
            <button
              className="fa-row__claim"
              disabled={!canClaim}
              onClick={() => onClaim(p)}
              aria-label={`Claim ${p.pokemon}`}
            >
              Claim
            </button>
          </li>
        ))}
        {visible.length === 0 && <li className="fa__empty">No players match your search.</li>}
      </ul>
    </Panel>
  )
}
