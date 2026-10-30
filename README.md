# Fantasy Pokémon V2

An ESPN-style fantasy football league where every player is a Pokémon paired with a real NFL starter. Draft against 9 CPU teams, set your lineup, work the waiver wire, and chase a championship.

Scoring uses real NFL stats with a Pokémon twist: type matchups, evolutions, and shinies.

## How it works

- **704 Pokémon, each paired with a real NFL starter.** Every team's 22 starters, from Josh Allen (Mewtwo) to the kicker.
- **10-team league:** you plus 9 CPU managers.
- **15-round snake draft.** Lineup: QB, 2 RB, 2 WR, TE, FLEX, K, D/ST, plus 6 bench spots.
- **14-week season,** then the top 4 teams make the playoffs.
- **Real stats, Pokémon twist:**
  - *Type matchups:* your players get a small boost or penalty against your opponent's defense type.
  - *Evolution:* players who keep putting up big weeks evolve and earn a permanent bonus.
  - *Shiny:* a 30-point week turns a Pokémon shiny for the rest of the season.
  - *Fainted:* if the real player is hurt or on bye, your Pokémon has fainted and scores 0.
- **Waiver wire** to pick up free agents. No trades.

## The home screen

Your roster lives on a football field: your Pokémon line up in formation, with your lineup, schedule, standings and the free-agent list around it. Before the draft the field is empty, and a banner sends you to the Draft Room.

## Plays anywhere

Built mobile-first: draft, set your lineup, and manage your team from your phone or your computer.

## Tech

- React + Vite
- Plain JavaScript
- Saved in your browser (localStorage), no account needed

## Run it locally

```bash
npm install
npm run dev
```

Then open the link shown in the terminal (usually http://localhost:5173).

## Project structure

```
docs/            Game spec and planning notes
src/
  data/          Pokémon ↔ NFL pairs and D/ST units (fixed data)
  pages/         Screens: Home dashboard and Draft Room
  components/    Reusable UI pieces
  lib/           Game logic: draft, scoring, standings, saving
  styles/        Global CSS
```

## Data sources

- Pokémon data: [PokeAPI](https://github.com/PokeAPI/pokeapi)
- NFL rosters and stats: [nflverse](https://github.com/nflverse/nflverse-data)
- Player ratings: EA Sports Madden NFL 27

The app uses no official Pokémon artwork or NFL logos: players are shown as circles in their Pokémon's type color.

Pokémon is a trademark of Nintendo, Creatures Inc. and GAME FREAK. NFL and team names are trademarks of the National Football League. This is a personal, non-commercial fan project.