create type public.app_role as enum ('admin','responder','user');
create type public.incident_status as enum ('sending','delivered','acknowledged','resolved','cancelled','failed');
create type public.incident_type as enum ('medical','fall','safety','other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text, blood_type text, medical_notes text,
  share_health boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null, unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'responder') or public.has_role(auth.uid(),'admin'));
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null, phone text not null, relationship text,
  notify_sms boolean not null default true,
  share_location boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.contacts to authenticated;
grant all on public.contacts to service_role;
alter table public.contacts enable row level security;
create policy "own contacts" on public.contacts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  type incident_type not null,
  status incident_status not null default 'sending',
  is_test boolean not null default false,
  latitude double precision, longitude double precision, accuracy double precision,
  heart_rate int, spo2 int,
  responder_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.incidents to authenticated;
grant all on public.incidents to service_role;
alter table public.incidents enable row level security;
create policy "own incidents read" on public.incidents for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'responder') or public.has_role(auth.uid(),'admin'));
create policy "own incidents insert" on public.incidents for insert to authenticated with check (user_id = auth.uid());
create policy "incident update" on public.incidents for update to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'responder') or public.has_role(auth.uid(),'admin'));

create table public.incident_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  actor_id uuid not null default auth.uid(),
  event text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.incident_events to authenticated;
grant all on public.incident_events to service_role;
alter table public.incident_events enable row level security;
create policy "events read" on public.incident_events for select to authenticated using (exists (select 1 from public.incidents i where i.id = incident_id and (i.user_id = auth.uid() or public.has_role(auth.uid(),'responder') or public.has_role(auth.uid(),'admin'))));
create policy "events insert" on public.incident_events for insert to authenticated with check (actor_id = auth.uid() and exists (select 1 from public.incidents i where i.id = incident_id and (i.user_id = auth.uid() or public.has_role(auth.uid(),'responder') or public.has_role(auth.uid(),'admin'))));

create table public.health_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  heart_rate int, spo2 int, battery int,
  recorded_at timestamptz not null default now()
);
grant select, insert on public.health_readings to authenticated;
grant all on public.health_readings to service_role;
alter table public.health_readings enable row level security;
create policy "own readings" on public.health_readings for select to authenticated using (user_id = auth.uid());
create policy "own readings insert" on public.health_readings for insert to authenticated with check (user_id = auth.uid());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, phone) values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone');
  insert into public.user_roles(user_id, role) values (new.id, 'user');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter publication supabase_realtime add table public.incidents;