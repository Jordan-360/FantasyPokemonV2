// Where each starter stands on the field, as [x%, y%] of the field.
// Desktop: offense moves left → right (line of scrimmage at x = 76%).
// Phone: offense faces up (line of scrimmage at y = 28%).
// anchor: K hugs the left edge and the D/ST the right edge (desktop only).
export const FIELD_SLOTS = [
  { id: 'QB', label: 'QB', desktop: [44, 50], phone: [50, 56] },
  { id: 'RB1', label: 'RB', desktop: [21, 28], phone: [30, 76] },
  { id: 'RB2', label: 'RB', desktop: [21, 72], phone: [70, 76] },
  { id: 'WR1', label: 'WR', desktop: [66, 12], phone: [13, 37] },
  { id: 'FLEX', label: 'FLEX', desktop: [66, 37.5], phone: [37, 37] },
  { id: 'TE', label: 'TE', desktop: [66, 62.5], phone: [63, 37] },
  { id: 'WR2', label: 'WR', desktop: [66, 88], phone: [87, 37] },
  { id: 'K', label: 'K', desktop: [1, 50], phone: [50, 91], anchor: 'left' },
  { id: 'DST', label: 'D/ST', desktop: [99, 50], phone: [50, 11], anchor: 'right' },
]

export const STARTER_SLOTS = [
  { id: 'QB', label: 'QB' },
  { id: 'RB1', label: 'RB' },
  { id: 'RB2', label: 'RB' },
  { id: 'WR1', label: 'WR' },
  { id: 'WR2', label: 'WR' },
  { id: 'TE', label: 'TE' },
  { id: 'FLEX', label: 'FLEX' },
  { id: 'K', label: 'K' },
  { id: 'DST', label: 'D/ST' },
]

export const BENCH_SIZE = 6
export const ROSTER_SIZE = STARTER_SLOTS.length + BENCH_SIZE

// Which positions can play in each slot
export const SLOT_POSITIONS = {
  QB: ['QB'],
  RB1: ['RB'],
  RB2: ['RB'],
  WR1: ['WR'],
  WR2: ['WR'],
  TE: ['TE'],
  FLEX: ['RB', 'WR', 'TE'],
  K: ['K'],
  DST: ['DST'],
}

export const slotLabel = (slotId) => STARTER_SLOTS.find((s) => s.id === slotId)?.label ?? slotId

export function eligibleSlots(position) {
  return STARTER_SLOTS.filter((s) => SLOT_POSITIONS[s.id].includes(position)).map((s) => s.id)
}

// Bench = rostered players who aren't in a starting slot
export function benchOf(roster) {
  const starters = new Set(Object.values(roster.lineup))
  return roster.players.filter((id) => !starters.has(id))
}

// Fills every slot with the best available player.
// value(player) ranks candidates; healthy(player) keeps fainted players out when possible.
// The FLEX is filled last so it gets the best RB/WR/TE left over.
export function bestLineup(playerIds, byId, value, healthy = () => true) {
  const order = ['QB', 'K', 'DST', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX']
  const remaining = playerIds.map((id) => byId.get(id)).filter(Boolean)
  const lineup = {}

  const rank = (p) => (healthy(p) ? 1e6 : 0) + value(p)

  for (const slot of order) {
    const candidates = remaining.filter((p) => SLOT_POSITIONS[slot].includes(p.position))
    if (!candidates.length) continue
    const best = candidates.reduce((a, b) => (rank(b) > rank(a) ? b : a))
    lineup[slot] = best.id
    remaining.splice(remaining.indexOf(best), 1)
  }
  return lineup
}
