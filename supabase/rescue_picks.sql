-- Insider rescue picks. Additive migration: run after schema.sql.
-- Rescue picks are accessed ONLY via the server (service_role). RLS is enabled
-- with NO public policies, so the anon key cannot read or write rows.

create extension if not exists pgcrypto;

create table if not exists public.rescue_picks (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  team_id text not null,
  created_at timestamptz not null default now()
);

alter table public.rescue_picks enable row level security;
-- No public policies: only the service_role (server) may read/write rescue picks.

create unique index if not exists idx_rescue_picks_member_id on public.rescue_picks(member_id);
create index if not exists idx_rescue_picks_team_id on public.rescue_picks(team_id);
