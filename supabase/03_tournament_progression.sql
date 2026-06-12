-- Tournament progression, group assignment, advancement and Champion Rush configuration
-- Run after 01_reference_tables.sql and 02_asset_metadata.sql.

create extension if not exists pgcrypto;

create table if not exists public.tournament_stage_config (
  id uuid primary key default gen_random_uuid(),
  tournament text not null,
  stage text not null,
  stage_type text not null check (stage_type in ('group_stage','survival','finals','other')),
  stage_order integer not null default 1,
  stage_start date,
  stage_end date,
  is_grouped boolean not null default false,
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
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament, stage)
);

create table if not exists public.tournament_team_assignments (
  id uuid primary key default gen_random_uuid(),
  tournament text not null,
  stage text,
  team_id text,
  team_tag text not null,
  team_name text,
  group_code text,
  seed integer,
  source_stage text,
  source_group text,
  source_rank integer,
  status_override text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament, stage, team_tag)
);

create index if not exists tournament_stage_config_lookup_idx on public.tournament_stage_config (tournament, stage);
create index if not exists tournament_team_assignments_lookup_idx on public.tournament_team_assignments (tournament, stage, team_tag);
create index if not exists tournament_team_assignments_group_idx on public.tournament_team_assignments (tournament, stage, group_code);

alter table public.tournament_stage_config enable row level security;
alter table public.tournament_team_assignments enable row level security;

drop policy if exists "Read tournament stage config" on public.tournament_stage_config;
create policy "Read tournament stage config" on public.tournament_stage_config for select to anon, authenticated using (true);
drop policy if exists "Read tournament team assignments" on public.tournament_team_assignments;
create policy "Read tournament team assignments" on public.tournament_team_assignments for select to anon, authenticated using (true);

grant select on public.tournament_stage_config to anon, authenticated;
grant select on public.tournament_team_assignments to anon, authenticated;

create or replace function public.configure_two_group_champion_rush_format(p_tournament text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.tournament_stage_config (
    tournament,stage,stage_type,stage_order,stage_start,stage_end,is_grouped,group_codes,
    teams_per_group,scheduled_matches_per_group,points_reset,advancement_rules,champion_rush_enabled
  ) values (
    p_tournament,'Group Stage','group_stage',1,date '2026-07-15',date '2026-07-16',true,array['A','B'],12,12,true,
    '[{"rank_from":1,"rank_to":4,"status":"qualified_finals_direct","next_stage":"Finals"},{"rank_from":5,"rank_to":10,"status":"advanced_survival","next_stage":"Survival Stage"},{"rank_from":11,"rank_to":12,"status":"eliminated","next_stage":""}]'::jsonb,false
  ) on conflict (tournament,stage) do update set
    stage_type=excluded.stage_type,stage_order=excluded.stage_order,stage_start=excluded.stage_start,stage_end=excluded.stage_end,
    is_grouped=excluded.is_grouped,group_codes=excluded.group_codes,teams_per_group=excluded.teams_per_group,
    scheduled_matches_per_group=excluded.scheduled_matches_per_group,points_reset=excluded.points_reset,advancement_rules=excluded.advancement_rules,
    updated_at=now();

  insert into public.tournament_stage_config (
    tournament,stage,stage_type,stage_order,stage_start,stage_end,is_grouped,scheduled_matches,points_reset,advancement_rules,champion_rush_enabled
  ) values (
    p_tournament,'Survival Stage','survival',2,date '2026-07-17',date '2026-07-17',false,10,true,
    '[{"rank_from":1,"rank_to":4,"status":"qualified_finals_survival","next_stage":"Finals"},{"rank_from":5,"rank_to":12,"status":"eliminated","next_stage":""}]'::jsonb,false
  ) on conflict (tournament,stage) do update set
    stage_type=excluded.stage_type,stage_order=excluded.stage_order,stage_start=excluded.stage_start,stage_end=excluded.stage_end,
    is_grouped=excluded.is_grouped,scheduled_matches=excluded.scheduled_matches,points_reset=excluded.points_reset,
    advancement_rules=excluded.advancement_rules,updated_at=now();

  insert into public.tournament_stage_config (
    tournament,stage,stage_type,stage_order,stage_start,stage_end,is_grouped,points_reset,
    champion_rush_enabled,champion_rush_threshold,champion_rush_activation_rule,champion_rush_win_rule
  ) values (
    p_tournament,'Finals','finals',3,date '2026-07-18',date '2026-07-18',false,true,true,90,'reaches_threshold','next_match_booyah'
  ) on conflict (tournament,stage) do update set
    stage_type=excluded.stage_type,stage_order=excluded.stage_order,stage_start=excluded.stage_start,stage_end=excluded.stage_end,
    is_grouped=excluded.is_grouped,points_reset=excluded.points_reset,champion_rush_enabled=excluded.champion_rush_enabled,
    champion_rush_threshold=excluded.champion_rush_threshold,champion_rush_activation_rule=excluded.champion_rush_activation_rule,
    champion_rush_win_rule=excluded.champion_rush_win_rule,updated_at=now();
end;
$$;

-- After running this migration, configure the tournament with its exact database name:
-- select public.configure_two_group_champion_rush_format('YOUR EXACT TOURNAMENT NAME');
--
-- Group assignments are optional because the dashboard can infer groups from teams that
-- participate together in each Group Stage match. For official locked assignments, insert:
-- insert into public.tournament_team_assignments (tournament,stage,team_tag,team_name,group_code,seed)
-- values ('YOUR EXACT TOURNAMENT NAME','Group Stage','BRU','Buriram United Esports','A',1);
