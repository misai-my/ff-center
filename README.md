# EWC Team Command Center Package

This package is a structural recreation of the supplied single-file dashboard. The visible interface, Supabase queries, storage keys, event handlers, filters, refresh behavior, modal logic, and relative URLs are preserved.

## Files

- `index.html` — package entry point
- `ewc-team-overview.html` — original page filename for compatibility with existing navigation
- `assets/css/styles.css` — extracted original CSS
- `assets/js/theme-init.js` — theme pre-load logic, kept in the document head
- `assets/js/app.js` — extracted original dashboard application logic
- `legacy/original-single-file.html` — untouched source copy for rollback/comparison

## Run locally

The page uses `fetch()`, Supabase, and browser storage, so open it through a local web server rather than by double-clicking the HTML file.

```bash
npm install
npm run dev
```

Then open the local address shown by Vite.

A no-install alternative is:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080/`.

## Existing runtime dependencies preserved

The application still expects these sibling JSON files at the package root, exactly as before:

- `character.json`
- `pet.json`
- `loadout.json`
- one of `weapon.json`, `weapons.json`, or `free_fire_full_weapon_data_with_armory.json`

It also keeps links to the existing sibling dashboard pages such as `home.html`, `character.html`, `pet.html`, `weapon.html`, `preset.html`, `map.html`, and the other pages already referenced by the source. Add those existing files beside this package when integrating it into the full site.

## Deployment

Upload the contents of this folder to the same directory level used by the original page. No build step is required for static hosting. The Vite build command is optional.
