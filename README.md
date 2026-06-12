# Free Fire Data Center

Standalone repository build of the Free Fire Data Center. The dashboard UI and application behavior are preserved, while the reference JSON files and available image assets are bundled in this repository.

## Repository contents

```text
.
├── index.html
├── ewc-team-overview.html
├── package.json
├── assets/
│   ├── css/
│   ├── js/
│   ├── img/
│   │   ├── characters/
│   │   ├── pets/
│   │   ├── loadouts/
│   │   └── weapons/
│   └── logo/
├── data/
│   ├── character.json
│   ├── pet.json
│   ├── loadout.json
│   ├── weapon.json
│   ├── counter.json
│   ├── team_logos.json
│   └── asset_manifest.json
└── supabase/
    ├── 01_reference_tables.sql
    └── 02_asset_metadata.sql
```

## Bundled data

- 64 characters
- 23 pets
- 4 loadouts
- 75 weapons
- 23 character counter profiles
- Team-logo registry and local asset manifest

The JSON records retain their original remote `image_url` fields and also contain local asset paths where matching artwork is bundled.

## Image coverage

- Characters: 64 of 64 local PNG files
- Pets: 23 of 23 local PNG files
- Loadouts: 4 of 4 local PNG files
- Weapons: 67 of 75 local PNG files
- Team logos: 29 supplied PNG files, with SVG fallbacks for configured teams that do not yet have supplied artwork

Weapons still using their bundled SVG/remote fallback:

```text
Treatment Laser Gun
Crossbow
MGL140
Gatling
FF Knife
Flamethrower
CG15
Hydro Blaster
```

Configured team codes still using SVG placeholders:

```text
CLVS
E1
HS
NVL
R7
RC
RHK
TS
```

## Team Summary qualification tools

The Overall Team Summary includes a qualification-cutoff selector populated from `1` through the number of teams in the active filters. Teams below the selected total-points position are highlighted in red.

- `1UP` is the current total-points gap to the team immediately above in the total-points standings.
- `Quali Pts` is `0` for teams inside the selected cutoff. For teams below it, it is the additional score needed to move one point above the current cutoff score.

## Supabase setup

In the Supabase SQL Editor, run:

1. `supabase/01_reference_tables.sql`
2. `supabase/02_asset_metadata.sql`

The migrations create and seed the reference tables and add local image metadata and team-logo records.

The live dashboard still expects the existing backend resources used by the original page, including:

- Supabase authentication/session access
- `ff_player_stats_raw`
- `match_api`
- The `team-insights` Edge Function where AI insights are used

## Run locally

Node.js is optional but provides the simplest local server:

```bash
npm install
npm run dev
```

Open the local address printed by Vite. Avoid opening `index.html` through `file://`, because browsers can block local JSON requests.

## GitHub Pages deployment

1. Create a new GitHub repository.
2. Upload the contents of this folder to the repository root.
3. Open **Settings → Pages**.
4. Select deployment from the repository branch and root folder.
5. Use `index.html` as the entry page.

No sibling JSON repository or asset-download script is required for the bundled reference content.


## Qualification cutoff build v2

The Team Summary uses versioned CSS and JavaScript asset filenames so GitHub Pages and browsers do not retain an older cached dashboard script. The cutoff dropdown is rebuilt from the currently filtered team count every time the summary renders.


## Premium Team Summary

The Team Summary uses color-coded podium ranks, qualification-line highlighting, sticky rank/team columns on desktop, and responsive standings cards on mobile. Existing sorting, qualification cutoff, 1UP, Quali Pts, team profile opening, and saved view-state behavior are unchanged.

## Team Selection premium layout

The team selector uses larger logo cards, natural responsive wrapping, a high-contrast selected state, and mobile-friendly tap targets. Desktop cards keep consistent dimensions instead of compressing up to 24 teams into a single row; phones use four columns or three columns on narrow screens.


## Premium modal system

The active build now includes a unified popup layer system, keyboard focus trapping and restoration, independent sidebar/modal scroll locks, Escape-to-close for the topmost popup, accessible team tabs, mobile-safe `dvh` sizing, larger tap targets, consistent loading/empty states, and contextual Back navigation in item details.

Active assets:

- `assets/css/styles.css`
- `assets/js/app.js`


## Loadout modal

The Loadout detail popup uses separate Battle Royale and Clash Squad description panels, structured cost/unlock cards, and a dedicated Team Booster grid. Six Team Booster icons are bundled under `assets/img/team-boosters/`; Helper Bot uses an inline fallback icon because no separate image was supplied.


## Latest Match Live Feed

The live feed now includes visible `mm:ss` elimination timestamps, point-based rank labels, local team logos, full tournament/stage/day/match context, live refresh status, and a Team Elimination Feed inside the **Elims** view. When another elimination follows within five seconds, only the reference event timestamp is highlighted. The five-second data refresh also detects changes in `player_stats_kill_info`, and an already-open Team Profile refreshes without changing its active tab.

## Latest Match Live Feed identity fix

The elimination feed now resolves player names from all available player identifiers (`account_id`, player ID, role ID, UID, and user ID aliases). Compact cards and mobile views always display the killer name, victim name, weapon image, and weapon label. When a lookup is unavailable, the feed shows an explicit shortened player ID or weapon ID instead of a blank value.
## Interface update

- `index.html` and `ewc-team-overview.html` are kept identical and load the same refreshed `styles.css` and `app.js` assets.
- The accent color selector is collapsible. When closed, only the selected color and expand button remain visible.

## Interactive map viewer

The enlarged map modal supports mouse-wheel and button zoom, pointer drag/pan, mobile pinch zoom, double-click or double-tap reset, keyboard navigation (`+`, `-`, arrow keys, and `0`), and an expanded viewer mode. Controls and viewport sizing adapt to desktop, tablet, and mobile screens.



## Map viewer behavior

The enlarged map opens in **Fit** mode, where the complete map image is visible. Zooming uses the fitted image dimensions, so every edge remains reachable by panning. The expand control reads **Expand** before expansion and **Exit Expand** while expanded.


## Map viewer visible-area correction

The map viewer now measures the actually visible clipped viewport, permits panning at 100% whenever overflow exists, and uses fresh asset query strings to prevent older cached viewer code from loading. Map images may remain remote; local map files are optional for availability, not required for fit or panning.


## Map fullscreen

The map viewer Fullscreen button uses the browser Fullscreen API. Browsers without element-fullscreen support automatically use a full-viewport fallback.

## Global Search

The top navigation includes a responsive dashboard search. It can open page sections, team profiles, player tabs, match logs, and direct detail modals for skills, pets, weapons, loadouts, and maps. Use `Ctrl/Cmd + K` or `/` to focus it, arrow keys to navigate, and Enter to open a result.


## Global search layout correction

The topbar search uses a fixed 42 px field and constrained icon sizing. Critical layout CSS is also embedded in both entry pages to prevent a stale external stylesheet from rendering the search icon at its browser-default size.

## Latest-filter behavior

On a fresh load, the dashboard now selects the newest tournament represented in `ff_player_stats_raw`. **Reset to Latest** restores the newest available stage, year, week, day, and match within that tournament. Mode and source return to **All** so they cannot hide the newest match. Filter selections made afterward continue to be saved locally.


## Tournament progression and Champion Rush

The dashboard now supports grouped stages, automatic advancement paths, Survival Stage qualification, and Champion Rush.

Run `supabase/03_tournament_progression.sql`, then configure the event using the exact tournament name stored in `ff_player_stats_raw`:

```sql
select public.configure_two_group_champion_rush_format('YOUR EXACT TOURNAMENT NAME');
```

Group assignment priority is: official rows in `tournament_team_assignments`, a Group/group_code column in match data, then automatic detection from teams participating together in the same Group Stage matches. The bundled `data/tournament_progression.json` provides the 2x12 Group Stage, 12-team Survival Stage, and 90-point Champion Rush defaults when the Supabase config tables have not yet been created.

Progression remains marked **PROVISIONAL** until the configured match count is reached or `is_completed` is set to true in `tournament_stage_config`.


## Login and logout

The dashboard now includes an in-page Supabase email/password sign-in dialog. When a session is missing or the user logs out, the dialog opens automatically and the topbar action changes from **Logout** to **Login**.


## Animated hero cover

The homepage hero uses the bundled Kelly, Tatsuya, Orion, and Hayato transparent character assets. The character layers fly into position on first load and then use restrained floating motion. Reduced-motion preferences disable the animation automatically.


## Free Fire Data Center cover

The homepage cover is rendered from bundled Kelly, Tatsuya, Orion, and Hayato PNG assets. Critical inline CSS and a runtime hero guard ensure the title and character layers appear even when a browser has cached an older stylesheet or an older HTML entry file is still deployed.


## Mobile Team Summary

On screens up to 680px, the standings table becomes touch-friendly team cards. Rank, team, total points, tournament progression, core scoring, 1UP, and qualification points remain visible. Damage and per-match efficiency metrics are available through each card's **More** button. Expanded-card state is retained locally.


## iPhone portrait Team Summary

At phone portrait widths (500px and below), Team Summary uses dedicated compact standings cards. Landscape and tablet layouts retain the wider standings presentation. Each portrait card keeps rank, team, score, progression, MP, Booyah, eliminations, placement, 1UP, and Quali Pts visible, with efficiency metrics behind More.
