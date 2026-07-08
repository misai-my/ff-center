# Historical Supabase Data Source

This package now supports switching between the existing live database and a separate historical Supabase database.

## Switch modes

Use the new **Database** dropdown in the dashboard filters:

- **Live Supabase**: current production source.
- **Historical Supabase**: historical team-level match results.

You can also force the mode through the URL:

```text
index.html?db=historical
index.html?db=live
```

Or through the browser console:

```js
localStorage.setItem('ffdc_database_mode', 'historical');
location.reload();
```

To return to live mode:

```js
localStorage.setItem('ffdc_database_mode', 'live');
location.reload();
```

## Historical project

Project URL:

```text
https://gkugecflfddkpitlrmws.supabase.co
```

Default table name expected by the package:

```text
public.historical_team_results
```

The app can also auto-detect these fallback table names:

- `historical_team_results`
- `ff_historical_team_results`
- `ff_historical_data`
- `ffws_historical_data`
- `ewc_qualifier_data`
- `historical_data`
- `ff_match_results`
- `ff_player_stats_raw`

To force a table name:

```js
localStorage.setItem('ffdc_historical_table', 'your_table_name');
location.reload();
```

## Expected table format

The historical source is team-level Battle Royale match data. The app maps it into the dashboard format automatically.

Required/useful columns:

```text
id, team, group, stage, day, match, map, booyah, placement, elimination, drop, damage, total, played, top3, tag, week, tournament, year, season
```

Mapping used by the dashboard:

| Historical column | Dashboard meaning |
|---|---|
| `team` | Team name |
| `tag` | Team tag/reference |
| `group` | Group filter/progression support |
| `stage` | Stage filter |
| `day` | Day filter |
| `match` | Match number |
| `map` | Map metadata |
| `booyah` | Booyah count/flag |
| `placement` | Placement / rank points |
| `elimination` | Eliminations / kills |
| `damage` | Damage |
| `tournament` | Tournament filter |
| `year` | Year filter |
| `season` | Season metadata |

## Public key warning

The key provided during setup decodes with the JWT role `service_role`. A `service_role` key should **not** be embedded into a public static frontend because it can bypass RLS and allow broad database access.

Use a real Supabase **anon/public** key for frontend deployment.

After you create a safe anon key/policy, paste it into:

```text
assets/js/data-source-config.js
```

```js
window.FFDC_DATA_SOURCES.historical.anonKey = 'YOUR_PUBLIC_ANON_KEY_HERE';
```

For local/private testing only, you can set a runtime key in the browser console:

```js
localStorage.setItem('ffdc_historical_anon_key', 'YOUR_KEY');
location.reload();
```

## RLS suggestion

For a public historical read-only table, enable RLS and add a read-only SELECT policy for the anon role.

See:

```text
supabase/07_historical_team_results.sql
```

## Missing historical key behavior

If Historical Supabase is selected but no public anon key is configured, the dashboard no longer stops with a fatal error. It displays a warning and falls back to the Live Supabase source so the dashboard remains usable.

To enable Historical Supabase, use one of these safe options:

```js
localStorage.setItem('ffdc_historical_anon_key', 'YOUR_PUBLIC_ANON_KEY');
localStorage.setItem('ffdc_database_mode', 'historical');
location.reload();
```

or edit:

```text
assets/js/data-source-config.js
```

and set:

```js
anonKey: 'YOUR_PUBLIC_ANON_KEY'
```

Do not use a `service_role` key in this frontend package.
