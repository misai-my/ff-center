# Index Team Selection

The package includes an admin page for choosing which teams appear on `index.html`.

Open:

```text
admin-index-teams.html
```

What it does:

- Loads teams from the selected database source.
- Supports `Live Supabase` and `Historical Supabase (ffbr_data)`.
- Lets you search/filter teams by tournament, stage, year, and season.
- Saves the selected team list for the matching source/table.
- `index.html` applies the saved list to the dashboard when the same database/table is active.

## Shared save setup

Run this SQL in the main dashboard Supabase project:

```text
supabase/09_index_team_selection.sql
```

This creates `public.index_team_selection`.

If this SQL is not installed yet, the admin page still saves the selection locally in the current browser using:

```text
localStorage.ffdc_index_team_selection_v1
```

Local save is useful for testing, but shared save is needed for other devices/viewers.

## Historical source

For Historical Supabase, the page reads from:

```text
public.ffbr_data
```

You still need a safe public anon key in:

```text
assets/js/data-source-config.js
```

Do not put a `service_role` key in frontend files.
