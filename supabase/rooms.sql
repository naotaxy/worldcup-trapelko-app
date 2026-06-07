-- Public multiplayer draft rooms. Additive migration: run after schema.sql.
-- All room data is accessed ONLY via the server (service_role). RLS is enabled
-- with NO public policies, so the anon key cannot read or write room rows.

create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  passphrase_hash text,
  status text not null default 'lobby' check (status in ('lobby','picking','revealed')),
  picks_per_player smallint not null default 8 check (picks_per_player between 1 and 12),
  max_players smallint not null default 8 check (max_players between 2 and 8),
  max_owners_per_team smallint not null default 2 check (max_owners_per_team between 1 and 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revealed_at timestamptz
);

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  nickname text not null,
  nickname_norm text not null,
  token_hash text not null,
  avatar text,
  accent text,
  seat smallint,
  is_host boolean not null default false,
  picks_submitted boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (room_id, nickname_norm)
);

-- Secret picks before reveal. Never exposed to other players until status='revealed'.
create table if not exists public.room_pick_intents (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null references public.room_players(id) on delete cascade,
  team_id text not null references public.teams(id),
  created_at timestamptz not null default now(),
  unique (room_id, player_id, team_id)
);

-- Final ownership after reveal + roulette resolution.
create table if not exists public.room_assignments (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null references public.room_players(id) on delete cascade,
  team_id text not null references public.teams(id),
  owner_slot smallint not null default 1,
  source text not null default 'pick' check (source in ('pick','roulette')),
  original_team_id text references public.teams(id),
  created_at timestamptz not null default now(),
  unique (room_id, player_id, team_id)
);

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.room_pick_intents enable row level security;
alter table public.room_assignments enable row level security;
-- No public policies: only the service_role (server) may read/write room data.

create index if not exists idx_room_players_room on public.room_players(room_id);
create index if not exists idx_room_pick_intents_room on public.room_pick_intents(room_id, player_id);
create index if not exists idx_room_assignments_room on public.room_assignments(room_id);
create index if not exists idx_rooms_updated on public.rooms(updated_at desc);
