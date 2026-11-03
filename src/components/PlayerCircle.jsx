import { typeStyle } from '../lib/typeColors'

// The type-colored circle that stands in for a sprite.
// Shiny Pokémon get a gold ring and sparkle; fainted ones are greyed out.
export default function PlayerCircle({ player, name, shiny, fainted, className = '' }) {
  const label = (name ?? player.pokemon).slice(0, 2)
  const classes = [className, shiny && 'circle--shiny', fainted && 'circle--fainted']
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes} style={typeStyle(player.types)} aria-hidden="true">
      {label}
    </span>
  )
}
