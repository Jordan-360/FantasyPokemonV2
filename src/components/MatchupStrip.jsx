import { typeStyle } from '../lib/typeColors'
import './MatchupStrip.css'

// This week's matchup above the field: opponent, their D/ST type, projections, and
// the button that locks lineups and plays the week.
export default function MatchupStrip({
  title,
  userName,
  opponent,
  opponentDst,
  userProj,
  oppProj,
  note,
  action,
}) {
  return (
    <section className="matchup" aria-label="This week's matchup">
      <div className="matchup__top">
        <span className="matchup__week">{title}</span>
        {opponentDst && (
          <span className="matchup__dst">
            Their D/ST type{' '}
            <span className="matchup__type" style={typeStyle(opponentDst.types)}>
              {opponentDst.types[0]}
            </span>
          </span>
        )}
      </div>

      {opponent ? (
        <div className="matchup__teams">
          <div className="matchup__team">
            <span className="matchup__name">{userName}</span>
            {userProj !== undefined && (
              <span className="matchup__proj">
                <span className="num">{userProj.toFixed(1)}</span> proj
              </span>
            )}
          </div>
          <span className="matchup__vs">vs</span>
          <div className="matchup__team matchup__team--right">
            <span className="matchup__name">
              {opponent.name}{' '}
              <span className="num muted">
                {opponent.wins}–{opponent.losses}
              </span>
            </span>
            {oppProj !== undefined && (
              <span className="matchup__proj">
                <span className="num">{oppProj.toFixed(1)}</span> proj
              </span>
            )}
          </div>
        </div>
      ) : null}

      {(note || action) && (
        <div className="matchup__bottom">
          {note && <p className="matchup__note">{note}</p>}
          {action}
        </div>
      )}
    </section>
  )
}
