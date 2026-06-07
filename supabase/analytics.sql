-- Privacy-friendly access analytics. Additive migration: run after schema.sql.
-- All analytics data is accessed ONLY via the server (service_role). RLS is
-- enabled with NO public policies, so the anon key cannot read or write rows.

create extension if not exists pgcrypto;

create table if not exists public.analytics_visits (
  id uuid primary key default gen_random_uuid(),
  visitor_hash text not null,
  day date not null,
  created_at timestamptz not null default now()
);

alter table public.analytics_visits enable row level security;
-- No public policies: only the service_role (server) may read/write analytics data.

create index if not exists idx_analytics_visits_day on public.analytics_visits(day);

create or replace function public.analytics_visit_summary(start_day date, end_day date)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with normalized as (
    select least(start_day, end_day) as start_day, greatest(start_day, end_day) as end_day
  ),
  days as (
    select generate_series(n.start_day, n.end_day, interval '1 day')::date as day
    from normalized n
  ),
  daily as (
    select
      d.day,
      count(v.id)::bigint as visits,
      count(distinct v.visitor_hash)::bigint as uniques
    from days d
    left join public.analytics_visits v on v.day = d.day
    group by d.day
  ),
  totals as (
    select
      count(v.id)::bigint as total_visits,
      count(distinct v.visitor_hash)::bigint as unique_visitors
    from normalized n
    left join public.analytics_visits v on v.day between n.start_day and n.end_day
  )
  select jsonb_build_object(
    'totalVisits', coalesce((select total_visits from totals), 0),
    'uniqueVisitors', coalesce((select unique_visitors from totals), 0),
    'today', coalesce(
      (
        select jsonb_build_object('visits', visits, 'uniques', uniques)
        from daily
        where day = (select end_day from normalized)
      ),
      '{"visits":0,"uniques":0}'::jsonb
    ),
    'daily', coalesce(
      (
        select jsonb_agg(jsonb_build_object('day', day, 'visits', visits, 'uniques', uniques) order by day)
        from daily
      ),
      '[]'::jsonb
    )
  );
$$;

revoke all on function public.analytics_visit_summary(date, date) from public;
revoke all on function public.analytics_visit_summary(date, date) from anon;
revoke all on function public.analytics_visit_summary(date, date) from authenticated;
grant execute on function public.analytics_visit_summary(date, date) to service_role;
