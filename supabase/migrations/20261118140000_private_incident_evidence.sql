-- Private evidence storage for authenticated incident reporters.
-- Anonymous reporting remains attachment-free until a token-protected upload workflow is deployed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'incident-evidence',
  'incident-evidence',
  false,
  20971520,
  array['image/jpeg','image/png','image/webp','image/heic','video/mp4','video/webm','audio/mpeg','audio/mp4','audio/wav','audio/webm']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "reporters upload evidence to their own cases" on storage.objects;
create policy "reporters upload evidence to their own cases"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'incident-evidence'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.incidents i
    where i.id::text = (storage.foldername(name))[2]
      and i.user_id = (select auth.uid())
      and i.is_anonymous = false
  )
);

drop policy if exists "case owners and response staff read evidence" on storage.objects;
create policy "case owners and response staff read evidence"
on storage.objects for select to authenticated
using (
  bucket_id = 'incident-evidence'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select private.has_role('responder'::public.app_role))
    or (select private.has_role('admin'::public.app_role))
  )
);

drop policy if exists "reporters delete their own case evidence" on storage.objects;
create policy "reporters delete their own case evidence"
on storage.objects for delete to authenticated
using (
  bucket_id = 'incident-evidence'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.incidents i
    where i.id::text = (storage.foldername(name))[2]
      and i.user_id = (select auth.uid())
      and i.is_anonymous = false
  )
);
