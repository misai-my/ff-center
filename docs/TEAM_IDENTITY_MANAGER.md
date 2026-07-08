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
