-- Free Fire Data Center — Group Assignment + Team Directory
-- STEP 1: Run this after 01_reference_tables.sql and 02_asset_metadata.sql.
-- This migration is rerunnable and does not delete existing assignments.
--
-- It creates:
--   public.app_admins
--   public.ff_teams
--   public.tournament_stage_config
--   public.tournament_team_assignments
--   public.is_app_admin()
--   public.group_code_from_index()
--   public.upsert_ff_team(jsonb)
--   public.save_tournament_group_assignments(...)
--   storage bucket: team-logos
--
-- Team-logo rule:
--   team tag BRU  -> storage object bru.png
--   team tag FLCN -> storage object flcn.png
--   repository fallback path -> assets/logo/<lowercase-tag>.png

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.ffdc_team_tag_slug(p_tag text)
returns text
language sql
immutable
strict
set search_path = public
as $$
  select lower(regexp_replace(trim(p_tag), '[^a-zA-Z0-9_-]+', '', 'g'));
$$;

create or replace function public.group_code_from_index(p_index integer)
returns text
language plpgsql
immutable
strict
set search_path = public
as $$
declare
  n integer := p_index;
  result text := '';
begin
  if n < 1 then
    raise exception 'Group index must be at least 1';
  end if;

  while n > 0 loop
    n := n - 1;
    result := chr(65 + (n % 26)) || result;
    n := n / 26;
  end loop;

  return result;
end;
$$;

create or replace function public.ffdc_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin allow-list
-- ---------------------------------------------------------------------------
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

drop policy if exists "Users can read their own admin record" on public.app_admins;
create policy "Users can read their own admin record"
  on public.app_admins
  for select
  to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on public.app_admins from anon, authenticated;
grant select on public.app_admins to authenticated;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_admins
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Canonical team directory
-- ---------------------------------------------------------------------------
create table if not exists public.ff_teams (
  id uuid primary key default gen_random_uuid(),
  external_team_id text,
  team_code text not null,
  team_name text not null,
  short_name text,
  organization_name text,
  country_code text,
  region text,
  logo_filename text not null default '',
  local_image_path text not null default '',
  logo_url text not null default '',
  storage_bucket text not null default '',
  storage_path text not null default '',
  aliases text[] not null default '{}'::text[],
  is_active boolean not null default true,
  notes text,
  raw_data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ff_teams_code_not_blank check (length(trim(team_code)) > 0),
  constraint ff_teams_name_not_blank check (length(trim(team_name)) > 0)
);

alter table public.ff_teams
  add column if not exists logo_filename text not null default '',
  add column if not exists local_image_path text not null default '',
  add column if not exists logo_url text not null default '',
  add column if not exists storage_bucket text not null default '',
  add column if not exists storage_path text not null default '',
  add column if not exists aliases text[] not null default '{}'::text[],
  add column if not exists is_active boolean not null default true,
  add column if not exists notes text,
  add column if not exists raw_data jsonb not null default '{}'::jsonb,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Normalize existing team tags and their repository filename/path.
update public.ff_teams
set
  team_code = upper(trim(team_code)),
  logo_filename = public.ffdc_team_tag_slug(team_code) || '.png',
  local_image_path = 'assets/logo/' || public.ffdc_team_tag_slug(team_code) || '.png'
where trim(team_code) <> '';

create unique index if not exists ff_teams_team_code_lower_uidx
  on public.ff_teams (lower(trim(team_code)));
create index if not exists ff_teams_name_lower_idx
  on public.ff_teams (lower(trim(team_name)));
create index if not exists ff_teams_external_team_id_idx
  on public.ff_teams (external_team_id);
create index if not exists ff_teams_aliases_gin_idx
  on public.ff_teams using gin (aliases);

alter table public.ff_teams enable row level security;

drop policy if exists "Everyone can read active teams" on public.ff_teams;
create policy "Everyone can read active teams"
  on public.ff_teams
  for select
  to anon, authenticated
  using (is_active = true or public.is_app_admin());

-- Browser writes are only allowed through the protected RPC below.
revoke insert, update, delete on public.ff_teams from anon, authenticated;
grant select on public.ff_teams to anon, authenticated;

drop trigger if exists ff_teams_set_updated_at on public.ff_teams;
create trigger ff_teams_set_updated_at
before update on public.ff_teams
for each row execute function public.ffdc_set_updated_at();

-- ---------------------------------------------------------------------------
-- Tournament/stage group configuration
-- This table already contains fields needed by the later progression step.
-- ---------------------------------------------------------------------------
create table if not exists public.tournament_stage_config (
  id uuid primary key default gen_random_uuid(),
  tournament text not null,
  stage text not null,
  stage_type text not null default 'group_stage',
  stage_order integer not null default 1,
  stage_start date,
  stage_end date,
  is_grouped boolean not null default true,
  group_count integer,
  group_codes text[] not null default '{}',
  teams_per_group integer,
  scheduled_matches integer,
  scheduled_matches_per_group integer,
  points_reset boolean not null default true,
  advancement_rules jsonb not null default '[]'::jsonb,
  ranking_tiebreakers jsonb not null default '["total_points","booyah","eliminations"]'::jsonb,
  champion_rush_enabled boolean not null default false,
  champion_rush_threshold numeric,
  champion_rush_activation_rule text not null default 'reaches_threshold',
  champion_rush_win_rule text not null default 'next_match_booyah',
  is_completed boolean not null default false,
  is_locked boolean not null default false,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament, stage),
  constraint tournament_stage_config_group_count_check
    check (group_count is null or group_count between 1 and 52),
  constraint tournament_stage_config_teams_per_group_check
    check (teams_per_group is null or teams_per_group >= 1)
);

alter table public.tournament_stage_config
  add column if not exists group_count integer,
  add column if not exists is_locked boolean not null default false,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

update public.tournament_stage_config
set group_count = cardinality(group_codes)
where group_count is null and cardinality(group_codes) > 0;

create index if not exists tournament_stage_config_lookup_idx
  on public.tournament_stage_config (tournament, stage);

alter table public.tournament_stage_config enable row level security;

drop policy if exists "Read tournament stage config" on public.tournament_stage_config;
create policy "Read tournament stage config"
  on public.tournament_stage_config
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on public.tournament_stage_config from anon, authenticated;
grant select on public.tournament_stage_config to anon, authenticated;

drop trigger if exists tournament_stage_config_set_updated_at on public.tournament_stage_config;
create trigger tournament_stage_config_set_updated_at
before update on public.tournament_stage_config
for each row execute function public.ffdc_set_updated_at();

-- ---------------------------------------------------------------------------
-- Official team-to-group assignments
-- ---------------------------------------------------------------------------
create table if not exists public.tournament_team_assignments (
  id uuid primary key default gen_random_uuid(),
  tournament text not null,
  stage text not null default 'Group Stage',
  team_directory_id uuid references public.ff_teams(id) on delete set null,
  team_id text,
  team_tag text not null,
  team_name text,
  group_code text,
  seed integer,
  source_stage text,
  source_group text,
  source_rank integer,
  status_override text,
  assignment_source text not null default 'admin_page',
  is_locked boolean not null default false,
  is_active boolean not null default true,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament, stage, team_tag),
  constraint tournament_team_assignments_tag_not_blank
    check (length(trim(team_tag)) > 0)
);

alter table public.tournament_team_assignments
  add column if not exists team_directory_id uuid references public.ff_teams(id) on delete set null,
  add column if not exists assignment_source text not null default 'admin_page',
  add column if not exists is_locked boolean not null default false,
  add column if not exists is_active boolean not null default true,
  add column if not exists notes text,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

update public.tournament_team_assignments
set team_tag = upper(trim(team_tag))
where trim(team_tag) <> '';

create index if not exists tournament_team_assignments_lookup_idx
  on public.tournament_team_assignments (tournament, stage, team_tag);
create index if not exists tournament_team_assignments_group_idx
  on public.tournament_team_assignments (tournament, stage, group_code);
create index if not exists tournament_team_assignments_directory_idx
  on public.tournament_team_assignments (team_directory_id);

alter table public.tournament_team_assignments enable row level security;

drop policy if exists "Read tournament team assignments" on public.tournament_team_assignments;
create policy "Read tournament team assignments"
  on public.tournament_team_assignments
  for select
  to anon, authenticated
  using (is_active = true or public.is_app_admin());

revoke insert, update, delete on public.tournament_team_assignments from anon, authenticated;
grant select on public.tournament_team_assignments to anon, authenticated;

drop trigger if exists tournament_team_assignments_set_updated_at on public.tournament_team_assignments;
create trigger tournament_team_assignments_set_updated_at
before update on public.tournament_team_assignments
for each row execute function public.ffdc_set_updated_at();

-- ---------------------------------------------------------------------------
-- Public logo bucket. The admin page converts every upload to PNG and saves it
-- as the lower-case team tag, e.g. BRU -> bru.png.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-logos', 'team-logos', true, 5242880, array['image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view team logos" on storage.objects;
create policy "Public can view team logos"
  on storage.objects
  for select
  to public
  using (bucket_id = 'team-logos');

drop policy if exists "Admins can upload team logos" on storage.objects;
create policy "Admins can upload team logos"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'team-logos' and public.is_app_admin());

drop policy if exists "Admins can update team logos" on storage.objects;
create policy "Admins can update team logos"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'team-logos' and public.is_app_admin())
  with check (bucket_id = 'team-logos' and public.is_app_admin());

drop policy if exists "Admins can delete team logos" on storage.objects;
create policy "Admins can delete team logos"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'team-logos' and public.is_app_admin());

-- ---------------------------------------------------------------------------
-- Protected team upsert
-- ---------------------------------------------------------------------------
create or replace function public.upsert_ff_team(p_team jsonb)
returns public.ff_teams
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_code text := upper(trim(coalesce(p_team->>'team_code', '')));
  v_name text := trim(coalesce(p_team->>'team_name', ''));
  v_slug text;
  v_filename text;
  v_local_path text;
  v_aliases text[] := coalesce(
    array(select jsonb_array_elements_text(coalesce(p_team->'aliases', '[]'::jsonb))),
    '{}'::text[]
  );
  v_row public.ff_teams;
begin
  if not public.is_app_admin() then
    raise exception 'Administrator access required';
  end if;

  if v_code = '' or v_name = '' then
    raise exception 'Team tag and team name are required';
  end if;

  v_slug := public.ffdc_team_tag_slug(v_code);
  if v_slug = '' then
    raise exception 'Team tag must contain letters, numbers, hyphens or underscores';
  end if;

  v_filename := v_slug || '.png';
  v_local_path := 'assets/logo/' || v_filename;

  if nullif(p_team->>'id', '') is not null then
    v_id := (p_team->>'id')::uuid;
  else
    select id into v_id
    from public.ff_teams
    where lower(trim(team_code)) = lower(v_code)
    limit 1;
  end if;

  if v_id is null then
    insert into public.ff_teams (
      external_team_id, team_code, team_name, short_name, organization_name,
      country_code, region, logo_filename, local_image_path, logo_url,
      storage_bucket, storage_path, aliases, is_active, notes, raw_data,
      created_by, updated_by
    ) values (
      nullif(trim(p_team->>'external_team_id'), ''), v_code, v_name,
      nullif(trim(p_team->>'short_name'), ''), nullif(trim(p_team->>'organization_name'), ''),
      upper(nullif(trim(p_team->>'country_code'), '')), nullif(trim(p_team->>'region'), ''),
      v_filename, v_local_path, coalesce(p_team->>'logo_url', ''),
      coalesce(p_team->>'storage_bucket', ''), coalesce(p_team->>'storage_path', ''),
      v_aliases, coalesce((p_team->>'is_active')::boolean, true),
      nullif(trim(p_team->>'notes'), ''), coalesce(p_team->'raw_data', '{}'::jsonb),
      auth.uid(), auth.uid()
    ) returning * into v_row;
  else
    update public.ff_teams set
      external_team_id = nullif(trim(p_team->>'external_team_id'), ''),
      team_code = v_code,
      team_name = v_name,
      short_name = nullif(trim(p_team->>'short_name'), ''),
      organization_name = nullif(trim(p_team->>'organization_name'), ''),
      country_code = upper(nullif(trim(p_team->>'country_code'), '')),
      region = nullif(trim(p_team->>'region'), ''),
      logo_filename = v_filename,
      local_image_path = v_local_path,
      logo_url = coalesce(p_team->>'logo_url', logo_url),
      storage_bucket = coalesce(p_team->>'storage_bucket', storage_bucket),
      storage_path = coalesce(p_team->>'storage_path', storage_path),
      aliases = v_aliases,
      is_active = coalesce((p_team->>'is_active')::boolean, is_active),
      notes = nullif(trim(p_team->>'notes'), ''),
      raw_data = coalesce(p_team->'raw_data', raw_data),
      updated_by = auth.uid()
    where id = v_id
    returning * into v_row;
  end if;

  -- Keep the existing site logo-reference table aligned when it exists.
  if to_regclass('public.ff_team_logos') is not null then
    insert into public.ff_team_logos (
      team_code, team_name, image_url, local_image_path, storage_bucket,
      storage_path, aliases, is_placeholder, raw_data, updated_at
    ) values (
      v_row.team_code,
      v_row.team_name,
      case when v_row.logo_url <> '' then v_row.logo_url else v_row.local_image_path end,
      v_row.local_image_path,
      v_row.storage_bucket,
      v_row.storage_path,
      v_row.aliases,
      false,
      jsonb_build_object(
        'team_directory_id', v_row.id,
        'logo_filename', v_row.logo_filename,
        'country_code', v_row.country_code,
        'region', v_row.region
      ),
      now()
    ) on conflict (team_code) do update set
      team_name = excluded.team_name,
      image_url = excluded.image_url,
      local_image_path = excluded.local_image_path,
      storage_bucket = excluded.storage_bucket,
      storage_path = excluded.storage_path,
      aliases = excluded.aliases,
      is_placeholder = false,
      raw_data = public.ff_team_logos.raw_data || excluded.raw_data,
      updated_at = now();
  end if;

  return v_row;
end;
$$;

revoke all on function public.upsert_ff_team(jsonb) from public;
grant execute on function public.upsert_ff_team(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Save configuration + every assignment in one transaction
-- ---------------------------------------------------------------------------
create or replace function public.save_tournament_group_assignments(
  p_tournament text,
  p_stage text,
  p_group_count integer,
  p_teams_per_group integer,
  p_assignments jsonb,
  p_lock boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codes text[];
  v_item jsonb;
  v_group_code text;
  v_team_tag text;
  v_saved integer := 0;
begin
  if not public.is_app_admin() then
    raise exception 'Administrator access required';
  end if;

  if trim(coalesce(p_tournament, '')) = '' or trim(coalesce(p_stage, '')) = '' then
    raise exception 'Tournament and stage are required';
  end if;
  if p_group_count < 1 or p_group_count > 52 then
    raise exception 'Group count must be between 1 and 52';
  end if;
  if p_teams_per_group is not null and p_teams_per_group < 1 then
    raise exception 'Teams per group must be at least 1';
  end if;
  if jsonb_typeof(coalesce(p_assignments, '[]'::jsonb)) <> 'array' then
    raise exception 'Assignments must be a JSON array';
  end if;

  select array_agg(public.group_code_from_index(i) order by i)
  into v_codes
  from generate_series(1, p_group_count) i;

  insert into public.tournament_stage_config (
    tournament, stage, stage_type, stage_order, is_grouped, group_count,
    group_codes, teams_per_group, is_locked, created_by, updated_by
  ) values (
    trim(p_tournament), trim(p_stage), 'group_stage', 1, true, p_group_count,
    v_codes, p_teams_per_group, p_lock, auth.uid(), auth.uid()
  ) on conflict (tournament, stage) do update set
    is_grouped = true,
    group_count = excluded.group_count,
    group_codes = excluded.group_codes,
    teams_per_group = excluded.teams_per_group,
    is_locked = excluded.is_locked,
    updated_by = auth.uid();

  -- Replace only this tournament/stage assignment set.
  delete from public.tournament_team_assignments
  where lower(trim(tournament)) = lower(trim(p_tournament))
    and lower(trim(stage)) = lower(trim(p_stage));

  for v_item in select * from jsonb_array_elements(coalesce(p_assignments, '[]'::jsonb))
  loop
    v_group_code := upper(nullif(trim(v_item->>'group_code'), ''));
    v_team_tag := upper(trim(coalesce(v_item->>'team_tag', '')));

    if v_team_tag = '' then
      raise exception 'Every assignment requires a team tag';
    end if;
    if v_group_code is not null and not (v_group_code = any(v_codes)) then
      raise exception 'Invalid group code: %', v_group_code;
    end if;

    insert into public.tournament_team_assignments (
      tournament, stage, team_directory_id, team_id, team_tag, team_name,
      group_code, seed, assignment_source, is_locked, is_active, notes,
      created_by, updated_by
    ) values (
      trim(p_tournament),
      trim(p_stage),
      nullif(v_item->>'team_directory_id', '')::uuid,
      nullif(trim(v_item->>'team_id'), ''),
      v_team_tag,
      nullif(trim(v_item->>'team_name'), ''),
      v_group_code,
      nullif(v_item->>'seed', '')::integer,
      coalesce(nullif(v_item->>'assignment_source', ''), 'admin_page'),
      p_lock,
      true,
      nullif(trim(v_item->>'notes'), ''),
      auth.uid(),
      auth.uid()
    );

    v_saved := v_saved + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'tournament', trim(p_tournament),
    'stage', trim(p_stage),
    'group_count', p_group_count,
    'group_codes', to_jsonb(v_codes),
    'teams_per_group', p_teams_per_group,
    'assignments_saved', v_saved,
    'locked', p_lock
  );
end;
$$;

revoke all on function public.save_tournament_group_assignments(text,text,integer,integer,jsonb,boolean) from public;
grant execute on function public.save_tournament_group_assignments(text,text,integer,integer,jsonb,boolean) to authenticated;

grant execute on function public.group_code_from_index(integer) to anon, authenticated;
grant execute on function public.ffdc_team_tag_slug(text) to anon, authenticated;

commit;

-- ---------------------------------------------------------------------------
-- AFTER RUNNING THIS MIGRATION, ADD YOUR LOGIN AS AN ADMIN:
-- ---------------------------------------------------------------------------
-- insert into public.app_admins (user_id, display_name)
-- select id, 'Neptune'
-- from auth.users
-- where email = 'YOUR_LOGIN_EMAIL'
-- on conflict (user_id) do update set display_name = excluded.display_name;
