# Free Fire Data Center

Standalone repository build of the Free Fire Data Center. The dashboard UI and application behavior are preserved, while the reference JSON files and available image assets are bundled in this repository.

## Historical Supabase source

The dashboard can switch between Live Supabase and Historical Supabase. If Historical is selected without a public anon key, the dashboard now falls back to Live Supabase instead of showing a fatal init error. Configure the safe public key in `assets/js/data-source-config.js` or set `localStorage.ffdc_historical_anon_key`. Do not put a `service_role` key in a public frontend.

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
3. `supabase/03_group_assignment_admin.sql`

The first two migrations create the bundled reference tables and asset metadata. Migration 03 creates the official group-assignment tables, team directory, admin permissions, team-logo bucket, and the Group Assignment Admin RPCs. Run `04_tournament_progression.sql` later when you are ready to configure advancement and Champion Rush.

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

After group assignments are working, run `supabase/04_tournament_progression.sql`, then configure the event using the exact tournament name stored in `ff_player_stats_raw`:

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

## Group Assignment Admin

Open `admin-group-assignments.html` to manage official tournament groups without editing rows manually.

Before using it:

1. Run `supabase/03_group_assignment_admin.sql` after migrations 01–02.
2. Add your login to `app_admins` using the SQL example at the bottom of migration 03.
3. Sign in to the Data Center and open **Group Assignments** from the sidebar.

The page supports:

- Existing or newly typed tournament and stage names
- Configurable group counts from 1 to 52
- Automatic Group A, B, C … Z, AA, AB labels
- Configurable teams per group
- Drag-and-drop assignment on desktop
- Per-team group dropdowns for mobile and tablet
- Auto Split, Clear Groups, Save Draft, and Confirm & Lock
- Validation for unassigned teams and incorrect group sizes
- Creating and editing teams before they appear in match data
- Team logo uploads to the public `team-logos` Supabase Storage bucket
- Every logo is converted to PNG and named from the lowercase team tag: `BRU → bru.png`, `FLCN → flcn.png`
- Repository fallback paths are stored as `assets/logo/<team-tag>.png`
- A **Download PNG for Repository** button creates the exact file to add to GitHub
- Team code, official name, short name, organization, country, region, external match-data ID, aliases, and notes

Migration 03 creates or upgrades `ff_teams`, `tournament_stage_config`, and `tournament_team_assignments`; synchronizes team-logo metadata into `ff_team_logos`; and saves all group assignments in one database transaction through `save_tournament_group_assignments`. The browser cannot directly commit files into GitHub without a protected server function, so the page stores the live image in Supabase Storage and provides the correctly named PNG for `assets/logo/`.

- Fixed the Group Assignment admin startup event binding so missing optional controls cannot stop the page from loading.


Gloo Rush mobile movement now uses a floating analog joystick.

## Mini-game integration: Card Arena

This package includes `minigames/card-arena/` as a standalone Free Fire Card Arena mini-game.

- Opens through the new floating Card Arena launcher.
- Uses the Data Center's existing `assets/img/characters/` and `assets/img/pets/` images.
- Keeps its own generated comic arena background under `minigames/card-arena/assets/bg/`.
- Supports direct access at `minigames/card-arena/index.html`.


## Card Arena responsive integration update
- Card Arena header/options are merged into a compact top bar.
- Battle mode minimizes the top UI so the arena animation has more space.
- Mobile/tablet portrait orientation now shows a landscape prompt.
- Mobile landscape has a battle-deck collapse toggle to show only Basic/Active/Pet buttons.
- Floating Data Center mini-game order changed: Card Arena is the lower icon, Gloo Rush is stacked above it.
- Gloo Rush launcher icon is now a landscape phone/game-screen icon.

## Card Arena auto battle update
- Added player-side Auto Battle toggle in the battle controls.
- Auto logic chooses between Basic, Active, and Pet based on HP, shield, energy, cooldowns, enemy HP, and skill type.
- Auto Battle persists locally and can be toggled on/off mid-battle.

## Card Arena update: combat polish
- Battle log now shows the latest move at the top.
- iPhone/mobile landscape view has additional spacing and safe-area fixes.
- Card Arena close button is offset so it does not cover in-game buttons.
- AI opponent name now uses the active character and map, e.g. `Dimitri - NexTerra`.
- Pet skills now trigger a pet overlay attack animation.
- Critical hits now trigger a longer attacking animation and CRIT popup.

## Historical Supabase data source

This build includes a second dashboard data source for historical team-level BR results.

Use the **Database** dropdown in the Filters accordion to switch between:

- Live Supabase
- Historical Supabase

Historical project URL is configured as:

```text
https://gkugecflfddkpitlrmws.supabase.co
```

Default historical table:

```text
public.ffbr_data
```

Setup notes are in:

```text
docs/HISTORICAL_SUPABASE_SOURCE.md
supabase/07_historical_team_results.sql
supabase/08_ffbr_data.sql
```

Security note: do not publish a Supabase `service_role` key in this static package. Add a public anon key in `assets/js/data-source-config.js` instead.


## Historical Supabase compatibility update

The dashboard now has a team-level historical compatibility mode for the Historical Supabase source. The default historical table is `public.ffbr_data`. When `db=historical` is active, the table fields `team`, `group`, `stage`, `day`, `match`, `map`, `booyah`, `placement`, `elimination`, `drop`, `damage`, `total`, `played`, `top3`, `tag`, `week`, `tournament`, `year`, and `season` are normalized into the dashboard schema.

Compatible areas:
- Overall — Team Summary
- Filters and latest-context reset
- Team Selection
- Team Overview KPIs
- Team Match Log
- Latest Historical Match Summary
- Tournament progression/qualification logic when configured

Player-level sections now show an explicit notice in Historical mode because the historical table does not include player rows, skills, pets, loadouts, weapon usage, or kill-feed events.


## ffbr_data historical source update

This build sets **Historical Supabase** to use:

```text
public.ffbr_data
```

The attached sample format is normalized automatically. The dashboard maps:

- `team` / `tag` into team identity
- `group`, `stage`, `year`, `season`, `week`, `day`, `match`, `map` into filters and match scope
- `placement`, `elimination`, `booyah`, `top3`, `damage`, `drop`, `played`, `total` into standings, KPIs, match logs, and latest match summaries

Historical mode now allows up to 50,000 rows per browser load so sample-sized historical tables can load fully.

### Historical selection behavior

When Historical Supabase is selected but no safe public anon key is configured, the dashboard now keeps the selector on **Historical Supabase (ffbr_data)** and shows a setup warning instead of silently switching back to Live Supabase. Add the public anon key in `assets/js/data-source-config.js` or set `localStorage.ffdc_historical_anon_key`, then reload.



## Index Team Selection

A new admin page is included for controlling which teams appear on `index.html`:

```text
admin-index-teams.html
```

It can load teams from Live Supabase or Historical Supabase (`ffbr_data`), then save a selected team list for the matching database/table. Run `supabase/09_index_team_selection.sql` in the main dashboard Supabase project to enable shared saves. Without that SQL, the page still saves locally in the current browser for testing.

See `docs/INDEX_TEAM_SELECTION.md` for details.

## Team Identity / Alias Manager

This package includes a new `admin-team-identity.html` page for grouping historical team names, tags, and rebrands under one canonical identity.

Use it when a team changes names across years but should still count as the same organization in long-term analytics. The raw match table stays unchanged; the dashboard can switch between raw historical names and grouped identities.

Run this SQL for shared mappings:

```text
supabase/10_team_identity_aliases.sql (migration-safe; adds missing columns such as source_mode/source_table when upgrading older installs)
```

Dashboard users can choose:

- **Historical Names** — show names exactly as stored in the selected database.
- **Group by Team Identity** — combine aliases under the saved canonical team.

See `docs/TEAM_IDENTITY_MANAGER.md` for setup and workflow.

### Team Identity merge behavior

When **Team Names → Merge by Team Identity** is active, the dashboard now materializes the canonical team identity into the working rows before rendering. Standings, team tiles, selected team profile, match log, team KPIs, and historical totals are merged under the canonical team name while preserving the original historical name in `ffdc_original_team` / `ffdc_original_tag` for reference.

### Team Identity merge/edit update

`admin-team-identity.html` now supports editing previously saved identities. Pick an identity from the dropdown or click **Edit** in the saved mappings list; the form is filled and the matching team aliases from the loaded source are selected automatically.

The dashboard now merges identity mappings from Supabase plus localStorage backup, and each canonical identity is treated as a global alias so rows already using the new name are included in the merged total.


### Team Identity hard-merge fix

This build strengthens **Merge by Team Identity** so saved aliases are also used as a final hard-merge map. If an admin identity contains aliases such as `BIGETRON`, `BIGETRON BY VITALITY`, and `TEAM VITALITY`, the dashboard will collapse those rows into the canonical team name even if the alias was saved with older source/table/year metadata.

After deploying, hard refresh the browser so `assets/js/app.js?v=team-identity-hard-merge-v3` is loaded.
