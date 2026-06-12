# Group Assignment Setup

## 1. Create the database objects

Run these files in Supabase SQL Editor in order:

1. `supabase/01_reference_tables.sql`
2. `supabase/02_asset_metadata.sql`
3. `supabase/03_group_assignment_admin.sql`

Migration 03 creates the team directory, group configuration, official assignments, admin access checks, and the public `team-logos` Storage bucket.

## 2. Add your login as an administrator

Replace the email below with the account used to sign in to the Data Center:

```sql
insert into public.app_admins (user_id, display_name)
select id, 'Neptune'
from auth.users
where email = 'YOUR_LOGIN_EMAIL'
on conflict (user_id)
do update set display_name = excluded.display_name;
```

## 3. Open the admin page

Sign in, then open:

```text
admin-group-assignments.html
```

The page is also linked as **Group Assignments** in the main sidebar.

## 4. Configure an event

1. Select or type the tournament.
2. Select or type the stage.
3. Choose the number of groups.
4. Choose the expected teams per group.
5. Load the assignment board.
6. Add missing teams or assign existing teams.
7. Save Draft while incomplete.
8. Use Confirm & Lock when official.

Group labels are generated automatically: A, B, C … Z, AA, AB, and so on.

## Team logo naming

The team tag controls the logo filename:

```text
Buriram United Esports | BRU  | bru.png
Team Falcons           | FLCN | flcn.png
```

Every uploaded logo is converted to PNG and uploaded to the `team-logos` Storage bucket as `<lowercase-team-tag>.png`.

The database also stores the matching repository fallback path:

```text
assets/logo/bru.png
assets/logo/flcn.png
```

Use **Download PNG for Repository** to obtain the correctly named file for GitHub. The browser page does not directly commit into GitHub because a repository token must not be exposed in frontend JavaScript.

## 5. Progression comes later

After official group assignments are working, run:

```text
supabase/04_tournament_progression.sql
```

That later step adds advancement rules, provisional/confirmed status, Survival Stage logic, and Champion Rush.


## If the admin page does not open

The page now displays its own login form instead of silently returning to `index.html`. Make sure all three files are uploaded together:

```text
admin-group-assignments.html
assets/css/admin-group-assignments.css
assets/js/admin-group-assignments.js
```

If it displays an admin setup error, run `supabase/03_group_assignment_admin.sql` in the same Supabase project configured in `assets/js/admin-group-assignments.js`, then add your login account to `public.app_admins`.


## Loading-screen recovery

The admin page now times out stalled authentication/database requests instead of remaining behind the loading overlay. Use **Retry loading** when the network or Supabase session check fails.

- Fixed the Group Assignment admin startup event binding so missing optional controls cannot stop the page from loading.
