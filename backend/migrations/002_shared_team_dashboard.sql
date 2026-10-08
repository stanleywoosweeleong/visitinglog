-- For projects that already ran the original schema. Run as database administrator.
begin;
drop policy if exists record_read on public.records;
create policy record_read on public.records for select to authenticated
using (org_id in (select org_id from public.memberships where user_id=auth.uid()));
-- Historical supervisor assignments are retained if present, but no longer used.
commit;
