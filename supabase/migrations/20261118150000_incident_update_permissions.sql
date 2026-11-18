-- Tighten incident writes: citizens can only update their SOS coordinates or cancel their own case;
-- responders can acknowledge/resolve cases assigned to them; administrators retain full control.
revoke update on public.incidents from authenticated;
grant update (status, responder_id, latitude, longitude, accuracy, updated_at)
on public.incidents to authenticated;

create or replace function private.guard_incident_updates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select private.has_role('admin'::public.app_role)) then
    return new;
  end if;

  if (select private.has_role('responder'::public.app_role)) then
    if new.status is distinct from old.status
       and new.status not in ('acknowledged'::public.incident_status, 'resolved'::public.incident_status) then
      raise exception 'Responders may only acknowledge or resolve incidents';
    end if;
    if new.responder_id is distinct from old.responder_id
       and new.responder_id is distinct from (select auth.uid()) then
      raise exception 'A responder may only assign an incident to themselves';
    end if;
    if old.responder_id is not null
       and old.responder_id is distinct from (select auth.uid())
       and new.responder_id is distinct from old.responder_id then
      raise exception 'This incident is already assigned to another responder';
    end if;
    if new.latitude is distinct from old.latitude
       or new.longitude is distinct from old.longitude
       or new.accuracy is distinct from old.accuracy then
      raise exception 'Responders cannot change the reporter location';
    end if;
    return new;
  end if;

  if old.user_id is distinct from (select auth.uid()) then
    raise exception 'You may only update your own incident';
  end if;
  if new.responder_id is distinct from old.responder_id then
    raise exception 'Citizens cannot assign responders';
  end if;
  if new.status is distinct from old.status
     and (new.status <> 'cancelled'::public.incident_status
          or old.status in ('resolved'::public.incident_status, 'cancelled'::public.incident_status)) then
    raise exception 'Citizens may only cancel an active incident';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_incident_updates on public.incidents;
create trigger guard_incident_updates
before update on public.incidents
for each row execute function private.guard_incident_updates();

drop policy if exists "citizens and response staff update permitted incidents" on public.incidents;
create policy "citizens and response staff update permitted incidents"
on public.incidents for update to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_role('responder'::public.app_role))
  or (select private.has_role('admin'::public.app_role))
)
with check (
  user_id = (select auth.uid())
  or (select private.has_role('responder'::public.app_role))
  or (select private.has_role('admin'::public.app_role))
);
