// Saves the league in the browser. Wrapped in try/catch: storage can be blocked
// (private windows, full quota) and the game should still run without it.
import { STATE_VERSION } from './season.js'

const KEY = 'fantasy-pokemon-v2:league'

export function loadLeague() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const state = JSON.parse(raw)
    return state?.version === STATE_VERSION ? state : null
  } catch {
    return null
  }
}

export function saveLeague(state) {
  try {
    if (state) localStorage.setItem(KEY, JSON.stringify(state))
    else localStorage.removeItem(KEY)
  } catch {
    // Saving is best-effort
  }
}
