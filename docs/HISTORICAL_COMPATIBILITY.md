## Historical Supabase compatibility update

The dashboard now has a team-level historical compatibility mode for the Historical Supabase source. When `db=historical` is active, the table fields `team`, `group`, `stage`, `day`, `match`, `map`, `booyah`, `placement`, `elimination`, `drop`, `damage`, `total`, `played`, `top3`, `tag`, `week`, `tournament`, `year`, and `season` are normalized into the dashboard schema.

Compatible areas:
- Overall — Team Summary
- Filters and latest-context reset
- Team Selection
- Team Overview KPIs
- Team Match Log
- Latest Historical Match Summary
- Tournament progression/qualification logic when configured

Player-level sections now show an explicit notice in Historical mode because the historical table does not include player rows, skills, pets, loadouts, weapon usage, or kill-feed events.
