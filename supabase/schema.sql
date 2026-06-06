create extension if not exists pgcrypto;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  member_key text unique,
  line_user_id text unique,
  line_display_name text,
  real_name text,
  avatar_url text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- For existing databases created before member_key was added.
alter table public.members add column if not exists member_key text;
create unique index if not exists members_member_key_key on public.members(member_key);

create table if not exists public.line_groups (
  id uuid primary key default gen_random_uuid(),
  line_group_id text unique not null,
  display_name text,
  notify_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id text primary key,
  group_code text not null check (group_code in ('A','B','C','D','E','F','G','H','I','J','K','L')),
  name text not null,
  short_name text not null,
  flag_code text not null,
  confederation text,
  seed int not null default 4
);

create table if not exists public.fixtures (
  id text primary key,
  group_code text not null,
  match_date date,
  venue text,
  home_team_id text not null references public.teams(id),
  away_team_id text not null references public.teams(id),
  official_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.squad_players (
  id uuid primary key default gen_random_uuid(),
  team_id text not null references public.teams(id) on delete cascade,
  name text not null,
  position text not null check (position in ('GK','DF','MF','FW')),
  shirt_number int,
  club text,
  source_url text,
  created_at timestamptz not null default now(),
  unique (team_id, name)
);

create table if not exists public.selections (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  team_id text not null references public.teams(id),
  owner_slot smallint not null default 1 check (owner_slot between 1 and 2),
  created_at timestamptz not null default now(),
  unique (team_id, owner_slot),
  unique (member_id, team_id)
);

create table if not exists public.rulesets (
  id text primary key default 'default',
  rules jsonb not null,
  awards jsonb not null default '{}'::jsonb,
  updated_by uuid references public.members(id),
  updated_at timestamptz not null default now()
);

-- For existing databases created before awards was added.
alter table public.rulesets add column if not exists awards jsonb not null default '{}'::jsonb;

create table if not exists public.match_results (
  match_id text primary key references public.fixtures(id) on delete cascade,
  home_score int not null check (home_score >= 0),
  away_score int not null check (away_score >= 0),
  home_penalty_win boolean not null default false,
  away_penalty_win boolean not null default false,
  event_payload jsonb not null default '{}'::jsonb,
  source text not null default 'manual',
  updated_by uuid references public.members(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_links (
  id uuid primary key default gen_random_uuid(),
  match_id text references public.fixtures(id) on delete cascade,
  source text not null,
  title text not null,
  url text not null,
  summary text,
  kind text not null check (kind in ('highlight','news','search','official')),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  line_group_id text not null,
  event_type text not null,
  payload jsonb not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.members enable row level security;
alter table public.line_groups enable row level security;
alter table public.teams enable row level security;
alter table public.fixtures enable row level security;
alter table public.squad_players enable row level security;
alter table public.selections enable row level security;
alter table public.rulesets enable row level security;
alter table public.match_results enable row level security;
alter table public.content_links enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "public read teams" on public.teams;
create policy "public read teams" on public.teams
  for select using (true);

drop policy if exists "public read fixtures" on public.fixtures;
create policy "public read fixtures" on public.fixtures
  for select using (true);

drop policy if exists "public read squad players" on public.squad_players;
create policy "public read squad players" on public.squad_players
  for select using (true);

drop policy if exists "public read results" on public.match_results;
create policy "public read results" on public.match_results
  for select using (true);

drop policy if exists "public read content links" on public.content_links;
create policy "public read content links" on public.content_links
  for select using (true);

create index if not exists idx_fixtures_group_code on public.fixtures(group_code);
create index if not exists idx_squad_players_team_id on public.squad_players(team_id);
create index if not exists idx_selections_member_id on public.selections(member_id);
create index if not exists idx_content_links_match_id on public.content_links(match_id);
create index if not exists idx_notifications_group on public.notifications(line_group_id, created_at desc);
