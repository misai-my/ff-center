# EWC Team Command Center

Standalone repository build of the EWC Team Command Center. The dashboard UI and application behavior are preserved, while the reference JSON files and available image assets are bundled in this repository.

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
