# Package Audit

## Current state

This package is a static HTML/CSS/JavaScript app. Most pages are self-contained, which makes the project easy to deploy but harder to maintain because styling, navigation, and Supabase setup are repeated across many files.

## What was improved

1. **Compatibility fixes**
   - Added `dashboard.html` because some pages referenced it while the actual file was `x-dashboard.html`.
   - Added `ewc-team-overview.html` because EWC navigation referenced it but the file was missing.

2. **Configuration cleanup**
   - Added `assets/js/app-config.js` so future Supabase project moves can be done in one place.
   - Existing pages now load the shared config before their inline scripts.

3. **Deployment readiness**
   - Added `.nojekyll` for GitHub Pages.
   - Added `package.json` with local preview and audit commands.
   - Added documentation for setup, file map, asset inventory, and future cleanup.
   - Added favicon/web manifest assets from the existing Free Fire logo.


4. **Global full-site search**
   - Added `assets/js/global-search-index.js`, generated from HTML pages, JSON data, and team logo inventory.
   - Added `assets/js/global-site-search.js`, a non-breaking overlay that attaches to existing search boxes.
   - Added deep-link behavior so selected resources redirect to their page and attempt to open the matching card/modal.
   - Added keyboard launch shortcuts: `Ctrl/Cmd + K` and `/`.

## Recommended next refactor

The next upgrade should extract repeated navigation, theme CSS, Supabase helpers, and data utilities into shared files. This package intentionally does not do that yet because several pages are large and production-sensitive; a non-breaking release package is safer as the first step.

Suggested next structure:

```text
assets/
  css/
    base.css
    layout.css
    components.css
  js/
    app-config.js
    supabase-client.js
    navigation.js
    theme.js
    utils.js
  data/
    character.json
    pet.json
    weapon.json
    loadout.json
pages/
  dashboard/
  br/
  clash-squad/
  reference/
  admin/
```

## Checks completed

- JSON files parse correctly.
- Local HTML references were scanned.
- Missing static page references were patched with compatibility redirects.
- Existing assets were preserved.
- Global search scripts were injected into all root HTML pages.
