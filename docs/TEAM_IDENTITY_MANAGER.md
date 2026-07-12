# Team Identity Manager

The Team Identity Manager lets you group historical team names, old tags, rebrands, and spelling variants under one canonical team identity without changing the raw historical match rows.

## Files added

- `admin-team-identity.html`
- `assets/js/admin-team-identity.js`
- `supabase/10_team_identity_aliases.sql`

## Required SQL

Run this in the LIVE dashboard Supabase project:

```sql
supabase/10_team_identity_aliases.sql
```

This creates:

- `public.team_identity` — canonical team records
- `public.team_alias` — aliases/rebrands that point to a canonical team

## Admin workflow

1. Open `admin-team-identity.html`.
2. Choose a database source:
   - Live Supabase
   - Historical Supabase (`ffbr_data`)
3. Load teams from the selected source.
4. Select team names/tags that belong to the same organization.
5. Choose an existing identity or create a new canonical name.
6. Save aliases.

Example:

| Raw historical name | Canonical identity |
|---|---|
| EVOS DIVINE | EVOS DIVINE |
| EVOS ESPORTS | EVOS DIVINE |
| EVOS | EVOS DIVINE |

## Dashboard behavior

The Index / Team Overview dashboard now has a **Team Names** dropdown:

- `Historical Names` — raw team names exactly as they appear in the selected source.
- `Group by Team Identity` — aliases are combined under the canonical identity.

This keeps tournament history accurate while allowing all-time / multi-year analytics to combine rebrands correctly.

## Fallback behavior

If the SQL has not been installed, the admin page still saves mappings in the current browser using `localStorage.ffdc_team_identity_mappings_v1`. Shared saves across devices require the SQL table.

## Troubleshooting: `column "source_mode" does not exist`

This means `public.team_alias` already existed from an older/manual setup that did not include the newer data-source columns. The updated `supabase/10_team_identity_aliases.sql` is migration-safe and now adds missing columns with `alter table ... add column if not exists` before creating the indexes.

You do **not** need to drop your existing aliases. Run the updated SQL again.

## Identity merge fix / edit workflow

This build improves Team Identity behavior in two ways:

1. The dashboard now loads identity mappings from both Supabase and the browser local backup. This prevents unmapped standings when aliases were created locally before the SQL tables were installed or populated.
2. Selecting an existing canonical identity in `admin-team-identity.html` now loads it for editing and selects the already-mapped team aliases from the loaded database list.

When saving an identity, the canonical team name is also saved as a global alias. This makes rows that already use the new identity name merge together with older names.

Example:

- `TEAM VITALITY / VIT`
- `BIGETRON / BTR`
- `BIGETRON BY VITALITY / BTR`

When all are saved under the `TEAM VITALITY` identity, the Index summary should show one merged `TEAM VITALITY` row when **Team Names → Merge by Team Identity** is selected.


## Hard merge behavior

When the dashboard is set to **Merge by Team Identity**, the app now uses a two-step merge:

1. Strict match by source/table/year/tournament/season where available.
2. Final hard match by any saved alias name or alias tag under the identity.

This means visible aliases under an identity, for example `BIGETRON / BTR`, `BIGETRON BY VITALITY / BTR`, and `TEAM VITALITY / VIT`, will merge into the canonical identity row on the dashboard.

## Delete identity

Saved identities now include a **Delete** button in `admin-team-identity.html`. Deleting an identity removes the canonical identity record and all alias mappings connected to it. It does **not** delete or change any raw match rows in `ffbr_data` or the live source table.

Use this when an identity was created by mistake or when aliases need to be rebuilt from scratch. After deletion, reload `index.html` and choose **Team Names → Merge by Team Identity** to confirm the old merge no longer applies.

If deleting from Supabase fails with an RLS or permission error, rerun `supabase/10_team_identity_aliases.sql` so the admin delete policies are installed.
