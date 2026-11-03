# Fantasy Pokémon V2

[![CI](https://github.com/Jordan-360/FantasyPokemonV2/actions/workflows/ci.yml/badge.svg)](https://github.com/Jordan-360/FantasyPokemonV2/actions/workflows/ci.yml)

**Play it: [fantasy-pokemon-v2.vercel.app](https://fantasy-pokemon-v2.vercel.app/)**

An ESPN-style fantasy football league where every player is a Pokémon paired with a real NFL starter. Draft against 9 CPU teams, set your lineup, work the waiver wire, and chase a championship.

Scoring uses real NFL stats with a Pokémon twist: type matchups, evolutions, and shinies.

## How it works

- **704 Pokémon, each paired with a real NFL starter.** Every team's 22 starters, from Josh Allen (Mewtwo) to the kicker.
- **10-team league:** you plus 9 CPU managers.
- **15-round snake draft.** Lineup: QB, 2 RB, 2 WR, TE, FLEX, K, D/ST, plus 6 bench spots.
- **14-week season,** then the top 4 teams make the playoffs.
- **Real stats, Pokémon twist:**
  - _Type matchups:_ your players get a small boost or penalty against your opponent's defense type.
  - _Evolution:_ players who keep putting up big weeks evolve and earn a permanent bonus.
  - _Shiny:_ a 30-point week turns a Pokémon shiny for the rest of the season.
  - _Fainted:_ if the real player is hurt or on bye, your Pokémon has fainted and scores 0.
- **Waiver wire** to pick up free agents. No trades.

## The home screen

Your roster lives on a football field: your Pokémon line up in formation, with your lineup, schedule, standings and the free-agent list around it. Before the draft the field is empty, and a banner sends you to the Draft Room.

## Plays anywhere

Built mobile-first: draft, set your lineup, and manage your team from your phone or your computer. The live site is at [fantasy-pokemon-v2.vercel.app](https://fantasy-pokemon-v2.vercel.app/) and redeploys from `main` on Vercel.

## Tech

- React + Vite
- Plain JavaScript
- Saved in your browser (localStorage), no account needed
- Hosted on Vercel; GitHub Actions for checks and weekly stats

## Run it locally

```bash
npm install
npm run dev
```

Then open the link shown in the terminal (usually http://localhost:5173).

## Update the NFL stats

Fantasy weeks unlock as real NFL weeks are played.

**Automatic:** the [Update NFL stats](.github/workflows/update-stats.yml) workflow runs every Tuesday, Wednesday and Friday morning during the season (September–January). When nflverse has new stats it tests them, commits them to `main`, and Vercel redeploys, so the next week unlocks on the live site by itself. You can also start it any time from the repo's **Actions** tab → **Update NFL stats** → **Run workflow**.

**By hand:**

```bash
npm run build-data
```

This rewrites `src/data/weekly_points.json`, `stat_lines.json`, `projections.json` and `evolutions.json`. Your saved league keeps going, and the next week becomes playable.

## Checks

```bash
npm test
```

Unit tests for the scoring rules, plus whole-league tests: draft sanity, waiver limits, and full seasons with random lineup moves and claims, checking every rule after every week.

```bash
npm run simulate -- --fill-future
```

Drafts and plays a full league in the terminal and prints the results.

The [CI workflow](.github/workflows/ci.yml) runs formatting, lint, tests, the simulation and a production build on every pull request and every push to `main`.

## Project structure

```
.github/workflows/  CI and the weekly stats update
docs/               Game spec and planning notes
scripts/            build-data (download stats) and simulate (play a league)
src/
  components/       Reusable UI pieces
  data/             Pokémon ↔ NFL pairs, D/ST units, and the generated stats
  hooks/            useLeague: league state + saving
  lib/              Game logic: draft, scoring, waivers, season, saving
  pages/            Screens: Home dashboard and Draft Room
  styles/           Global CSS
tests/              npm test (Node's built-in test runner)
```

## Data sources

- Pokémon data: [PokeAPI](https://github.com/PokeAPI/pokeapi)
- NFL rosters and stats: [nflverse](https://github.com/nflverse/nflverse-data)
- Player ratings: EA Sports Madden NFL 27

The app uses no official Pokémon artwork or NFL logos: players are shown as circles in their Pokémon's type color.

Pokémon is a trademark of Nintendo, Creatures Inc. and GAME FREAK. NFL and team names are trademarks of the National Football League. This is a personal, non-commercial fan project.
