# Fantasy Pokémon V2: Game Spec

An ESPN-style fantasy football league where every player is a Pokémon paired with a real NFL starter. One human team plus 9 CPU teams, a snake draft, then weekly head-to-head matchups scored from **real NFL stats with a Pokémon layer on top**.

Stack: React + Vite, plain JavaScript, no backend, localStorage for saving. Mobile-friendly throughout.

---

## 1. Data (in `src/data/`)

The Pokémon ↔ player matching is **done and fixed**. The app reads it from JSON; there is no matching engine in the code.

### `pairs.json`
A flat list of 704 pairs: each NFL team's 22 starters from the 2026-10-28 depth chart (QB1, RB1–2, WR1–4, TE1–2, K, 12 defenders) × 32 teams.

```jsonc
{
  "id": "606",              // Pokédex number, zero-padded. Stable key.
  "pokemon": "Beheeyem",
  "types": ["Psychic"],
  "position": "QB",         // QB | RB | WR | TE | K | DEF
  "defGroup": null,         // DL | LB | CB | S when position is DEF, else null
  "player": "Jacoby Brissett",
  "playerId": "00-0033119", // nflverse ID. Join weekly stats on this, never on names.
  "team": "ARI",
  "maddenOvr": 74           // Madden NFL 27, Week 6 roster update
}
```

| Position | Count |
|---|---|
| QB | 32 |
| RB | 64 |
| WR | 128 |
| TE | 64 |
| K | 32 |
| DEF | 384 (12 per NFL team) |

### `dst_units.json`
32 D/ST units. Defensive Pokémon are **not** drafted individually. They make up their NFL team's D/ST, and **the D/ST is the draftable unit**.

```jsonc
{ "team": "SF", "dominantType": "Rock", "memberIds": ["075", "..."] }
```

`dominantType` is the most common type among the unit's 12 Pokémon. It drives the type-matchup twist.

### Still to build
- **Weekly points:** `weekly_points.json` with each player's real fantasy points per week (from nflverse weekly stats), keyed by `playerId`, plus team D/ST points.
- **Projections:** a projected points-per-game number per pair, used to rank the draft board and drive CPU picks.

---

## 2. League rules

| Setting | Value |
|---|---|
| Teams | 10 (1 human, 9 CPU) |
| Lineup | QB, RB, RB, WR, WR, TE, FLEX (RB/WR/TE), K, D/ST |
| Bench | 6 |
| Roster size | 15 |
| Draft | Snake, 15 rounds, random draft order |
| Regular season | Weeks 1–14, round-robin (everyone plays everyone at least once) |
| Playoffs | Top 4 by record. Semifinals week 15, final week 16 |
| Ties | **None** (see tiebreaker, §7.3) |
| Trades | **None** |
| Scoring | ESPN standard PPR (offense), ESPN standard D/ST, then the Pokémon layer (§4) |

The league replays the 2026 NFL season from Week 1. Weeks unlock as weekly points data is available; future weeks show projections only.

---

## 3. CPU draft: best pick for the team, not just the best player

No personalities or quirks. Every CPU team uses the same logic.

**Step 1. Value over replacement (VOR).**
`VOR = projectedPPG − replacementPPG[position]`

Replacement level is the projected PPG of the player at this rank within the position, roughly the best player left after every team fills its starters:

| QB | RB | WR | TE | K | D/ST |
|---|---|---|---|---|---|
| 12th | 30th | 30th | 12th | 11th | 11th |

RB and WR are set at 30th to account for the FLEX spot.

**Step 2. Roster need multiplier.**

| Situation | Multiplier |
|---|---|
| Fills an open starting slot (incl. FLEX for RB/WR/TE) | 1.0 |
| 1st bench RB or WR | 0.6 |
| 2nd+ bench RB or WR | 0.4 |
| Backup QB or TE | 0.2 |
| 3rd QB/TE, any 2nd K or D/ST | 0 |
| K or D/ST before the final 2 rounds | 0 |

**Step 3. Snake awareness (scarcity).**
Count the picks until this team picks again. For each position, estimate the best player still available by then, assuming the picks in between go to the highest-VOR players.
`scarcity = VOR(best now at position) − VOR(expected best at next pick)`

**Pick score** = `VOR × needMultiplier + 0.5 × scarcity`. Take the highest score; Madden OVR breaks ties.

The human sees the same board, ranked by plain VOR as the "recommended" order. Auto-pick uses the CPU logic for the human's roster.

**Sanity checks:** every team ends the draft with a starter at every lineup slot, and no team has 2 K or 2 D/ST.

---

## 4. Weekly scoring: real points + Pokémon layer

```
finalPoints = realPoints × (1 + typeMod + evolutionBonus)
```

The Pokémon layer is capped at ±10% total, so real NFL production always decides most of the score. Final points are rounded to 0.1.

### 4.1 Type matchup (`typeMod`)
The matchup is **fantasy team vs. fantasy team**, not the NFL schedule.

- **Offensive players:** the player's types attack the fantasy opponent's starting D/ST `dominantType`. Use the best multiplier across the player's types (Gen 6 type chart, Fairy included).
- **D/ST:** its `dominantType` attacks the fantasy opponent's starting QB, using the best multiplier against either of the QB's types.
- **K:** no type modifier.

| Effectiveness | typeMod |
|---|---|
| Super effective (×2 or ×4) | +0.05 |
| Neutral | 0 |
| Not very effective (×0.5 or ×0.25) | −0.05 |
| No effect (×0) | −0.08 |

Shown on the matchup card ("It's super effective!").

### 4.2 Evolution (`evolutionBonus`)
- **Trigger:** every 3 qualifying weeks, the Pokémon evolves one stage. Qualifying means ≥20 real points (K: ≥12, D/ST: ≥15). The count resets after each evolution.
- **Effect:** +0.03 per stage gained this season, max 2 stages (+0.06). It lasts the rest of the season.
- **Display only:** the pair keeps its NFL player; the card shows the evolved form ("Charmander → Charmeleon").
- **Fully evolved or single-stage Pokémon:** no form change, but they still earn the bonus ("Powered up!").

### 4.3 Shiny (cosmetic)
One week of ≥30 real points (K/D/ST: ≥20) makes the Pokémon shiny for the rest of the season. No stat effect. Featured in the news feed.

### 4.4 Fainted (injuries and byes)
If the NFL player doesn't play (injured, inactive or bye week), the Pokémon shows as **fainted** and scores 0. The My Team panel warns about fainted starters before the week locks.

---

## 5. Waivers

- After each week resolves, every unrostered pair is a free agent.
- **Priority** resets weekly in reverse standings order (worst record = #1). Each successful claim uses up that team's priority for the week.
- **Human:** claims a player (add X, drop Y) directly from the Free Agents panel.
- **CPU claims only when it clearly helps:**
  1. A starter is fainted for the coming week and a free agent at that position projects above its bench option, or
  2. A free agent projects at least 15% better than the team's weakest starter at that position.

  It drops its lowest-value bench player at a position it doesn't need. Max 2 CPU claims per team per week.
- **CPU lineups:** start the highest-projected healthy players at each slot every week.

---

## 6. News feed (deferred)

Not part of the home screen for now. If added later: generated after each week from the results, about 5–8 items, covering the biggest upset and blowout, the week's top scorer, evolutions, shinies, notable faintings and waiver pickups.

---

## 7. Screens

Two screens only: **Home** and **Draft Room**. Both are mobile-friendly.

### 7.1 Home screen

The home screen is built around **your roster on a football field**. It starts empty, with dashed placeholder slots, and fills in once you've drafted.

| Section | Contents | Actions |
|---|---|---|
| Header | Logo + "Fantasy Pokémon", league name, team name + record, current week | — |
| Draft banner | Shown only while the roster is empty: "Your roster is empty · Draft your team to start the season" | Button to the Draft Room |
| My Roster | 9 starters (slot, Pokémon, NFL player, team, Madden OVR), then 6 bench | Edit lineup; Start a bench player |
| Schedule / Standings | One box with two tabs. Schedule = weeks 1–14 with opponents. Standings = see §7.3 | Switch tabs |
| Field | This week's matchup strip (opponent + their D/ST type) above the field. The 7 offensive starters in formation on the field. K and D/ST as two cards below it | — |
| Free Agents | Search box, position filters (All · QB · RB · WR · TE · K · D/ST), and a **scrollable container** with the list | Claim from each row |

**Desktop layout (mockup A)**

```
┌───────────────────────────────────────────────────────────┐
│ LOGO  FANTASY POKÉMON        League · Team · Record · Wk  │
├───────────────────────────────────────────────────────────┤
│ [ Draft banner — only before the draft ]                  │
├──────────────┬─────────────────────────┬──────────────────┤
│ MY ROSTER    │ Week matchup strip      │ FREE AGENTS      │
│ starters     │ ┌─────────────────────┐ │ search           │
│ bench        │ │   FIELD             │ │ position filters │
│              │ │   (offense)         │ │ ┌──────────────┐ │
├──────────────┤ └─────────────────────┘ │ │ scrollable   │ │
│ SCHEDULE |   │ [ K card ] [ D/ST card ]│ │ list         │ │
│ STANDINGS    │                         │ └──────────────┘ │
└──────────────┴─────────────────────────┴──────────────────┘
```

- **Tablet:** field full width on top; roster + schedule/standings on the left, free agents on the right.
- **Phone (mockup "Phone · Before the draft"):** header, draft banner, team name + draft position, the field filling the screen (vertical, offense facing up, K and D/ST below), and a bottom tab bar: **Team · Schedule · Standings · Free Agents**. Each tab shows one section.

### 7.2 Visual style

- **Theme:** dark, with an electric-yellow accent and a turf-green field.

  | Token | Value |
  |---|---|
  | Background | `#0f1419` |
  | Header | `#121a22` |
  | Panel | `#182029` |
  | Border | `#263241` |
  | Text | `#e8edf2` |
  | Muted text | `#9aa7b4` |
  | Accent | `#ffd23f` |
  | Field | `#2e6b3f` / `#2a6439` stripes, white yard lines |

- **Fonts (Google Fonts):** Barlow Condensed for headings and numbers, Barlow for body text.
- **Players:** each Pokémon is a circle in its **primary type's color** with the first two letters of its name. On the field the circle is larger with a white ring, above a dark name tag (slot · OVR, Pokémon, NFL player).
- **No official artwork:** the project is public, so no Pokémon sprites, NFL team logos or Pokémon logos. The type-colored circles stand in for sprites.
- **Logo:** an original mark, a yellow football with a lightning bolt, next to "FANTASY POKÉMON" ("Pokémon" in the accent color).

### 7.3 Standings
- **Preseason:** ranked by team Madden OVR, the average of the 9 starters' ratings. The D/ST slot counts as the average OVR of its 12 defenders.
- **In season:** ranked by record (wins, then losses). No ties.
- **Matchup tiebreaker:** if two teams finish a week with the same score, the team whose highest-scoring starter scored more wins. If those are equal too, compare the second-highest, and so on.

### 7.4 Draft Room
- **Desktop:** player board, my roster and the pick ticker side by side.
- **Phone:** player board fills the screen; my roster and the draft order are one tap away.
- **Both:** position filters, search, and a sticky "You're on the clock" banner. Players show Pokémon, NFL player, team, position, Madden OVR and projection, using the same type-colored circles as the home screen.

---

## 8. Out of scope (decided)

- Trades, human or CPU
- CPU draft personalities or quirks
- Playable on-field football
- A matching engine (pairs are fixed data)
- Official Pokémon sprites, Pokémon logos and NFL team logos (public project)
- News feed and top-players panels on the home screen (for now)
- Backend / database (localStorage for now)

---

## 9. Open questions

- **League setup:** how the user names their league and team before the first draft (a first-launch form, or part of the Draft Room).
- **Standings record ties:** playoff seeding tiebreaker when two teams have the same record (e.g., total points scored).