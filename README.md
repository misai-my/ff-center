# Free Fire Caster Command Center

A static web package for Free Fire esports broadcast preparation and live desk support. It includes dashboard pages, BR/CS data tools, character/pet/weapon/loadout galleries, presets, map planning, upload tools, report tools, and team assets.

## Start here

- `index.html` — login page
- `home.html` — main dashboard
- `ewc-center.html` — team command center
- `br-team.html` — BR teams and players
- `clash-draft-team.html` — Clash Squad draft tool
- `clash-data.html` — Clash Squad data summary
- `split-view.html` — split-screen reference view

## Local preview

Run either command from the project folder:

```bash
python -m http.server 5173
```

or:

```bash
npm run start
```

Then open `http://localhost:5173`.

## Supabase configuration

Supabase settings are centralized in:

```text
assets/js/app-config.js
```

When moving to a new Supabase project, update `SUPABASE_URL` and `SUPABASE_ANON_KEY` in that file. The pages still include safe fallbacks so the package remains compatible with the original build.

## GitHub Pages deployment

1. Upload all files to the repository root.
2. Keep `.nojekyll` in the root.
3. In GitHub, open **Settings → Pages**.
4. Deploy from the branch/root folder where these files are stored.
5. Open the Pages URL and test `index.html`, `home.html`, and `ewc-center.html`.

## Package improvements in this version

- Added a shared config file for Supabase.
- Added missing alias pages: `dashboard.html` and `ewc-team-overview.html`.
- Added GitHub Pages support through `.nojekyll`.
- Added project documentation and file map.
- Added a local audit script for broken local page/asset references.
- Preserved all existing HTML pages and assets for compatibility.

## Important note

This is still a static front-end package. Database security should be controlled in Supabase with Row Level Security policies. Do not add service-role keys to any browser file.
