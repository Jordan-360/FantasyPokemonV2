import { useEffect, useState } from 'react'
import { ctx } from '../lib/gameData'
import { loadLeague, saveLeague } from '../lib/storage'
import * as season from '../lib/season'

// Holds the league state, saves every change, and exposes the game actions.
// Actions ignore extra arguments, so they can be passed straight to onClick.
export default function useLeague() {
  const [league, setLeague] = useState(loadLeague)

  useEffect(() => {
    saveLeague(league)
  }, [league])

  const [actions] = useState(() => {
    const update = (fn) => setLeague((state) => (state ? fn(state) : state))
    return {
      createLeague: (settings) => setLeague(season.createLeague(settings)),
      resetLeague: () => setLeague(null),

      makePick: (playerId) => update((s) => season.makePick(s, playerId, ctx)),
      runCpuPick: () => update((s) => season.runCpuPicks(s, ctx, { max: 1 })),
      simToUser: () => update((s) => season.runCpuPicks(s, ctx)),
      autoPick: () =>
        update((s) =>
          season.currentPick(s)?.teamId === 'user'
            ? season.makePick(s, season.suggestedPick(s, ctx), ctx)
            : s
        ),
      autoDraftRest: () => update((s) => season.autoDraftRest(s, ctx)),

      startPlayer: (playerId, slot) =>
        update((s) => season.startPlayer(s, 'user', playerId, slot, ctx)),
      benchPlayer: (slot) => update((s) => season.benchPlayer(s, 'user', slot, ctx)),
      optimizeLineup: () => update((s) => season.optimizeLineup(s, 'user', ctx)),
      claimPlayer: (addId, dropId = null) =>
        update((s) => season.claimPlayer(s, addId, dropId, ctx)),
      playWeek: () => update((s) => season.playWeek(s, ctx)),
    }
  })

  return { league, ctx, actions }
}
