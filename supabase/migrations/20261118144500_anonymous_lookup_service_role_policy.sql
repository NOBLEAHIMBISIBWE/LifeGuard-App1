drop policy if exists "service role manages anonymous lookup rate limits" on private.anonymous_lookup_attempts;
create policy "service role manages anonymous lookup rate limits"
on private.anonymous_lookup_attempts
for all to service_role
using (true)
with check (true);