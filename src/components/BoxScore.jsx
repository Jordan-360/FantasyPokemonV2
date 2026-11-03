import { slotLabel } from '../lib/lineup'
import './BoxScore.css'

const pct = (n) => `${n > 0 ? '+' : ''}${Math.round(n * 100)}%`

// One team's starters for a game. Played lines show real points, the Pokémon-layer
// modifier and final points; projected lines (an unplayed week) show projections only.
// detailOf(id) optionally returns the NFL player and stat line shown under the Pokémon.
export default function BoxScore({ title, total, lines, nameOf, detailOf, projected = false }) {
  return (
    <table className="box-score">
      <caption>
        <span>{title}</span>
        {total !== undefined && (
          <span className="num box-score__total">
            {total.toFixed(1)}
            {projected ? ' proj' : ''}
          </span>
        )}
      </caption>
      <thead>
        <tr>
          <th scope="col">Slot</th>
          <th scope="col">Pokémon</th>
          {projected ? (
            <th scope="col">Proj</th>
          ) : (
            <>
              <th scope="col">Real</th>
              <th scope="col">Mod</th>
              <th scope="col">Pts</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {lines.map((l) => (
          <tr key={l.slot} className={l.fainted ? 'box-score__fainted' : ''}>
            <td>{slotLabel(l.slot)}</td>
            <td className="box-score__who">
              {nameOf(l.id)}
              {detailOf && <span className="box-score__detail">{detailOf(l.id)}</span>}
            </td>
            {projected ? (
              <td className="num">{l.fainted ? 'FNT' : l.projection.toFixed(1)}</td>
            ) : (
              <>
                <td className="num">{l.fainted ? 'FNT' : l.real.toFixed(1)}</td>
                <td className="num">
                  {l.typeMod + l.evoBonus ? pct(l.typeMod + l.evoBonus) : '—'}
                </td>
                <td className="num">{l.points.toFixed(1)}</td>
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
