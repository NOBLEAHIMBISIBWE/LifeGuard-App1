-- Permit reporters to attach private Storage object paths to their own case,
-- while preventing responders and citizens from changing unrelated case fields.
grant update (evidence_names) on public.incidents to authenticated;

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
       or new.accuracy is distinct from old.accuracy
       or new.evidence_names is distinct from old.evidence_names then
      raise exception 'Responders cannot change reporter location or evidence references';
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
  if new.evidence_names is distinct from old.evidence_names
     and exists (
       select 1 from unnest(new.evidence_names) as evidence_path
       where evidence_path not like (select auth.uid())::text || '/' || old.id::text || '/%'
     ) then
    raise exception 'Evidence references must belong to your own incident';
  end if;
  return new;
end;
$$;
