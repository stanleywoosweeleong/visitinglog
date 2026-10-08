-- Private photographs are separate from visit records and remain recoverable.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('visit-photos','visit-photos',false,5242880,array['image/jpeg'])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg'];
create policy team_photo_read on storage.objects for select to authenticated
using(bucket_id='visit-photos' and (storage.foldername(name))[1] in
 (select org_id::text from public.memberships where user_id=auth.uid()));
create policy own_photo_insert on storage.objects for insert to authenticated
with check(bucket_id='visit-photos' and (storage.foldername(name))[2]=auth.uid()::text
 and (storage.foldername(name))[1] in(select org_id::text from public.memberships where user_id=auth.uid()));
create policy own_photo_delete on storage.objects for delete to authenticated
using(bucket_id='visit-photos' and (storage.foldername(name))[2]=auth.uid()::text
 and (storage.foldername(name))[1] in(select org_id::text from public.memberships where user_id=auth.uid()));
