// Loads the fixed + generated data once and builds the game context for the browser.
import pairs from '../data/pairs.json'
import dstUnits from '../data/dst_units.json'
import projections from '../data/projections.json'
import weekly from '../data/weekly_points.json'
import evolutions from '../data/evolutions.json'
import { createGameContext } from './players.js'

export const ctx = createGameContext({ pairs, dstUnits, projections, weekly, evolutions })
