## Historical Supabase compatibility update

The dashboard now has a team-level historical compatibility mode for the Historical Supabase source. The current table target is `public.ffbr_data`. When `db=historical` is active, the table fields `team`, `group`, `stage`, `day`, `match`, `map`, `booyah`, `placement`, `elimination`, `drop`, `damage`, `total`, `played`, `top3`, `tag`, `week`, `tournament`, `year`, and `season` are normalized into the dashboard schema.

Compatible areas:
- Overall — Team Summary
- Filters and latest-context reset
- Team Selection
- Team Overview KPIs
- Team Match Log
- Latest Historical Match Summary
- Tournament progression/qualification logic when configured

Player-level sections now show an explicit notice in Historical mode because the historical table does not include player rows, skills, pets, loadouts, weapon usage, or kill-feed events.


### ffbr_data compatibility

The dashboard now uses `ffbr_data` as the default historical table. Legacy stored table names from older builds, such as `historical_team_results`, are ignored so the Historical dropdown loads `ffbr_data` by default.

The Season filter is included in the dashboard scope and saved filter state. Summary totals, team KPIs, match logs, latest historical match summary, and progression views are calculated from normalized `ffbr_data` rows.

### Historical selection behavior

When Historical Supabase is selected but no safe public anon key is configured, the dashboard now keeps the selector on **Historical Supabase (ffbr_data)** and shows a setup warning instead of silently switching back to Live Supabase. Add the public anon key in `assets/js/data-source-config.js` or set `localStorage.ffdc_historical_anon_key`, then reload.

