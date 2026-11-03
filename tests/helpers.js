import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createGameContext } from '../src/lib/players.js'

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data')
export const load = (name) => JSON.parse(readFileSync(join(DATA, name), 'utf8'))

// Real data; `fillFuture` copies weeks 1-8 into 9-16 so the playoffs can be tested.
export function makeContext({ fillFuture = false } = {}) {
  const weekly = load('weekly_points.json')
  if (fillFuture) {
    const real = weekly.weeksAvailable.length
    for (const pts of Object.values(weekly.points)) {
      for (let w = real; w < 16; w++) pts[w] = pts[w % real]
    }
    weekly.weeksAvailable = Array.from({ length: 16 }, (_, i) => i + 1)
  }
  return createGameContext({
    pairs: load('pairs.json'),
    dstUnits: load('dst_units.json'),
    projections: load('projections.json'),
    weekly,
    evolutions: load('evolutions.json'),
    statLines: load('stat_lines.json'),
  })
}

export function seeded(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
