-- LifeGuard core schema. Safe to run on an existing project.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

do $$ begin create type public.app_role as enum ('admin','responder','user');
exception when duplicate_object then null; end $$;
do $$ begin create type public.incident_status as enum ('sending','delivered','acknowledged','resolved','cancelled','failed');
exception when duplicate_object then null; end $$;
do $$ begin create type public.incident_type as enum ('medical','fall','safety','other');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text, blood_type text, medical_notes text,
  share_health boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  unique(user_id, role)
);
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null, phone text not null, relationship text,
  is_primary boolean not null default false,
  notify_sms boolean not null default true,
  share_location boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  type public.incident_type not null,
  status public.incident_status not null default 'sending',
  is_test boolean not null default false,
  is_anonymous boolean not null default false,
  tracking_token text unique,
  district text, description text, location text, persons_involved text,
  date_of_incident timestamptz,
  evidence_names text[] not null default '{}',
  sender_name text, sender_email text, sender_phone text, sender_nin text,
  coordinate_source text check (coordinate_source in ('gps','manual','wearable') or coordinate_source is null),
  latitude double precision, longitude double precision, accuracy double precision,
  heart_rate integer, spo2 integer,
  responder_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint incidents_location_pair check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180)),
  constraint incidents_anonymous_token check ((is_anonymous = false) or (tracking_token is not null))
);
create table if not exists public.incident_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  actor_id uuid default auth.uid() references auth.users(id) on delete set null,
  event text not null, created_at timestamptz not null default now()
);
create table if not exists public.health_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  heart_rate integer check (heart_rate is null or heart_rate between 20 and 250),
  spo2 integer check (spo2 is null or spo2 between 50 and 100),
  battery integer check (battery is null or battery between 0 and 100),
  recorded_at timestamptz not null default now()
);

create index if not exists contacts_user_id_created_at_idx on public.contacts(user_id, created_at desc);
create index if not exists incidents_user_id_created_at_idx on public.incidents(user_id, created_at desc);
create index if not exists incidents_status_created_at_idx on public.incidents(status, created_at desc);
create index if not exists incidents_tracking_token_idx on public.incidents(tracking_token) where tracking_token is not null;
create index if not exists incident_events_incident_id_created_at_idx on public.incident_events(incident_id, created_at);
create index if not exists incident_events_actor_id_idx on public.incident_events(actor_id) where actor_id is not null;
create index if not exists incidents_responder_id_idx on public.incidents(responder_id) where responder_id is not null;
create index if not exists health_readings_user_id_recorded_at_idx on public.health_readings(user_id, recorded_at desc);
create index if not exists user_roles_user_id_role_idx on public.user_roles(user_id, role);

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.contacts enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_events enable row level security;
alter table public.health_readings enable row level security;

create or replace function private.has_role(_role public.app_role)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = _role
  );
$$;
revoke all on function private.has_role(public.app_role) from public, anon;
grant execute on function private.has_role(public.app_role) to authenticated;

drop policy if exists "own roles" on public.user_roles;
drop policy if exists "users read own roles or admins read all" on public.user_roles;
create policy "users read own roles or admins read all" on public.user_roles
for select to authenticated using (user_id = (select auth.uid()) or (select private.has_role('admin'::public.app_role)));

drop policy if exists "own profile read" on public.profiles;
drop policy if exists "own profile insert" on public.profiles;
drop policy if exists "own profile update" on public.profiles;
drop policy if exists "users read own profile" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
create policy "users read own profile" on public.profiles
for select to authenticated using (id = (select auth.uid()));
create policy "users update own profile" on public.profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "own contacts" on public.contacts;
drop policy if exists "users manage own contacts" on public.contacts;
create policy "users manage own contacts" on public.contacts
for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own incidents read" on public.incidents;
drop policy if exists "own incidents insert" on public.incidents;
drop policy if exists "incident update" on public.incidents;
drop policy if exists "citizens and response staff read incidents" on public.incidents;
drop policy if exists "authenticated users create own incidents" on public.incidents;
drop policy if exists "anonymous visitors create anonymous incidents" on public.incidents;
drop policy if exists "citizens and response staff update permitted incidents" on public.incidents;
create policy "citizens and response staff read incidents" on public.incidents
for select to authenticated using (
  user_id = (select auth.uid())
  or (select private.has_role('responder'::public.app_role))
  or (select private.has_role('admin'::public.app_role))
);
create policy "authenticated users create own incidents" on public.incidents
for insert to authenticated with check (user_id = (select auth.uid()) and is_anonymous = false);
create policy "anonymous visitors create anonymous incidents" on public.incidents
for insert to anon with check (user_id is null and is_anonymous = true and tracking_token is not null and is_test = false);
create policy "citizens and response staff update permitted incidents" on public.incidents
for update to authenticated
using (user_id = (select auth.uid()) or (select private.has_role('responder'::public.app_role)) or (select private.has_role('admin'::public.app_role)))
with check (user_id = (select auth.uid()) or (select private.has_role('responder'::public.app_role)) or (select private.has_role('admin'::public.app_role)));

drop policy if exists "events read" on public.incident_events;
drop policy if exists "events insert" on public.incident_events;
drop policy if exists "users read events for accessible incidents" on public.incident_events;
drop policy if exists "users add events to accessible incidents" on public.incident_events;
create policy "users read events for accessible incidents" on public.incident_events
for select to authenticated using (exists (
  select 1 from public.incidents i where i.id = incident_id and (
    i.user_id = (select auth.uid())
    or (select private.has_role('responder'::public.app_role))
    or (select private.has_role('admin'::public.app_role))
  )
));
create policy "users add events to accessible incidents" on public.incident_events
for insert to authenticated with check (
  actor_id = (select auth.uid()) and exists (
    select 1 from public.incidents i where i.id = incident_id and (
      i.user_id = (select auth.uid())
      or (select private.has_role('responder'::public.app_role))
      or (select private.has_role('admin'::public.app_role))
    )
  )
);

drop policy if exists "own readings" on public.health_readings;
drop policy if exists "own readings insert" on public.health_readings;
drop policy if exists "users read own health readings" on public.health_readings;
drop policy if exists "users insert own health readings" on public.health_readings;
create policy "users read own health readings" on public.health_readings
for select to authenticated using (user_id = (select auth.uid()));
create policy "users insert own health readings" on public.health_readings
for insert to authenticated with check (user_id = (select auth.uid()));

grant usage on schema public to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select, insert, update, delete on public.contacts to authenticated;
grant select, insert, update on public.incidents to authenticated;
grant insert on public.incidents to anon;
grant select, insert on public.incident_events to authenticated;
grant select, insert on public.health_readings to authenticated;
grant all on all tables in schema public to service_role;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id, full_name, phone)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  insert into public.user_roles(user_id, role)
  values (new.id, 'user'::public.app_role)
  on conflict (user_id, role) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='incidents') then
    alter publication supabase_realtime add table public.incidents;
  end if;
end $$;
