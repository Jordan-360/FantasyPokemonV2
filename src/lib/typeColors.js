const TYPE_COLORS = {
  Normal: ['#A8A77A', '#10151b'],
  Fire: ['#EE8130', '#10151b'],
  Water: ['#6390F0', '#10151b'],
  Electric: ['#F7D02C', '#10151b'],
  Grass: ['#7AC74C', '#10151b'],
  Ice: ['#96D9D6', '#10151b'],
  Fighting: ['#C22E28', '#ffffff'],
  Poison: ['#A33EA1', '#ffffff'],
  Ground: ['#E2BF65', '#10151b'],
  Flying: ['#A98FF3', '#10151b'],
  Psychic: ['#F95587', '#10151b'],
  Bug: ['#A6B91A', '#10151b'],
  Rock: ['#B6A136', '#10151b'],
  Ghost: ['#735797', '#ffffff'],
  Dragon: ['#6F35FC', '#ffffff'],
  Dark: ['#705746', '#ffffff'],
  Steel: ['#B7B7CE', '#10151b'],
  Fairy: ['#D685AD', '#10151b'],
}

export function typeStyle(types = []) {
  const [bg, fg] = TYPE_COLORS[types[0]] ?? TYPE_COLORS.Normal
  return { background: bg, color: fg }
}
