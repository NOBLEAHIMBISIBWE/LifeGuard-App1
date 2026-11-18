-- Server-only rate-limit state for anonymous case lookups. Store only a keyed hash of client IPs.
create table if not exists private.anonymous_lookup_attempts (
  ip_hash text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0
);
alter table private.anonymous_lookup_attempts enable row level security;
revoke all on private.anonymous_lookup_attempts from public, anon, authenticated;

create or replace function public.allow_anonymous_case_lookup(_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  _allowed boolean;
begin
  insert into private.anonymous_lookup_attempts(ip_hash, window_started_at, attempts)
  values (_ip_hash, now(), 1)
  on conflict (ip_hash) do update
    set window_started_at = case
          when private.anonymous_lookup_attempts.window_started_at < now() - interval '10 minutes'
          then now()
          else private.anonymous_lookup_attempts.window_started_at
        end,
        attempts = case
          when private.anonymous_lookup_attempts.window_started_at < now() - interval '10 minutes'
          then 1
          else private.anonymous_lookup_attempts.attempts + 1
        end
  returning attempts <= 10 into _allowed;
  return coalesce(_allowed, false);
end;
$$;
revoke all on function public.allow_anonymous_case_lookup(text) from public, anon, authenticated;
grant execute on function public.allow_anonymous_case_lookup(text) to service_role;
