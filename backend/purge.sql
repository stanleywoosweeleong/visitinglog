-- A tombstone prevents an offline device from recreating a purged record.
create table public.purge_jobs (
 record_id uuid primary key references public.records(id),
 prefix text not null,
 created_at timestamptz not null default now()
);
alter table public.purge_jobs enable row level security;
revoke all on public.purge_jobs from public,anon,authenticated;
grant select,delete on public.purge_jobs to service_role;

create or replace function private.save_record(record_id uuid,record_kind text,record_payload jsonb,expected_revision integer)
returns integer language plpgsql security definer set search_path='' as $$
declare member public.memberships; existing public.records; new_revision integer;
begin
 select * into member from public.memberships where user_id=auth.uid();
 if member.user_id is null then raise exception 'membership required'; end if;
 if record_kind not in ('farm','visit') then raise exception 'invalid kind'; end if;
 if record_payload ? 'purged' then raise exception 'permanent deletion requires an administrator'; end if;
 perform pg_advisory_xact_lock(hashtext(member.org_id::text));
 perform pg_advisory_xact_lock(hashtext(record_id::text));
 select * into existing from public.records where id=record_id for update;
 if existing.id is not null then
  if existing.org_id<>member.org_id or existing.owner_id<>auth.uid() then raise exception 'access denied'; end if;
  if existing.payload->>'purged'='true' then raise exception 'record permanently deleted'; end if;
  if existing.kind<>record_kind then raise exception 'record kind mismatch'; end if;
  if existing.revision<>expected_revision then raise exception 'revision conflict'; end if;
  new_revision=existing.revision+1;
  update public.records set payload=record_payload,revision=new_revision,updated_at=now() where id=record_id;
 else
  if expected_revision<>0 then raise exception 'revision conflict'; end if;
  new_revision=1;
  insert into public.records(id,kind,org_id,owner_id,payload) values(record_id,record_kind,member.org_id,auth.uid(),record_payload);
 end if;
 return new_revision;
end; $$;

-- Keep the existing validation rules, with guarded tombstones and deleted-farm checks.
do $$ declare definition text; begin
 select pg_get_functiondef('public.validate_record_payload()'::regprocedure) into definition;
 definition=replace(definition,'begin', 'begin
 if new.payload->>''purged''=''true'' then
  if TG_OP<>''UPDATE'' or not exists(select 1 from public.memberships where user_id=auth.uid() and org_id=new.org_id and role=''admin'') then raise exception ''administrator required''; end if;
  return new;
 end if;');
 definition=replace(definition,'if farm.id is null then','if farm.id is null or farm.payload->>''purged''=''true'' then');
 execute definition;
end; $$;

create function private.purge_record(record_id uuid,expected_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare member public.memberships; existing public.records;
begin
 select * into member from public.memberships where user_id=auth.uid();
 if member.user_id is null or member.role<>'admin' then raise exception 'administrator required'; end if;
 perform pg_advisory_xact_lock(hashtext(member.org_id::text));
 select * into existing from public.records where id=record_id and org_id=member.org_id for update;
 if existing.id is null then raise exception 'record unavailable'; end if;
 if existing.payload->>'purged'='true' then return jsonb_build_object('purged',true,'revision',existing.revision); end if;
 if existing.revision<>expected_revision then raise exception 'record changed; refresh before deleting'; end if;
 if coalesce(existing.payload->>'deletedAt','')='' then raise exception 'move record to Trash first'; end if;
 if existing.kind='farm' and exists(select 1 from public.records where org_id=member.org_id and kind='visit' and payload->>'farmId'=record_id::text and coalesce(payload->>'purged','false')<>'true') then raise exception 'permanently delete associated visits first'; end if;
 insert into public.purge_jobs(record_id,prefix) values(record_id,member.org_id::text||'/'||existing.owner_id::text||'/'||record_id::text) on conflict do nothing;
 update public.records set payload=jsonb_build_object('id',record_id,'kind',existing.kind,'purged',true),revision=revision+1,updated_at=now() where id=record_id;
 return jsonb_build_object('purged',true,'revision',existing.revision+1);
end; $$;
revoke all on function private.purge_record(uuid,integer) from public,anon;
grant execute on function private.purge_record(uuid,integer) to authenticated;
create function public.purge_record(record_id uuid,expected_revision integer)
returns jsonb language sql security invoker set search_path='' as $$ select private.purge_record(record_id,expected_revision); $$;
revoke all on function public.purge_record(uuid,integer) from public,anon;
grant execute on function public.purge_record(uuid,integer) to authenticated;

-- Photos waiting for cleanup must already be inaccessible to team members.
drop policy if exists "team_photo_read" on storage.objects;
create policy team_photo_read on storage.objects for select to authenticated using (bucket_id='visit-photos' and (storage.foldername(name))[1] in (select org_id::text from public.memberships where user_id=(select auth.uid())) and not exists(select 1 from public.records r where r.id::text=(storage.foldername(name))[3] and r.payload->>'purged'='true'));

alter policy own_photo_insert on storage.objects with check (bucket_id='visit-photos' and (storage.foldername(name))[2]=(select auth.uid())::text and (storage.foldername(name))[1] in(select org_id::text from public.memberships where user_id=(select auth.uid())) and not exists(select 1 from public.records r where r.id::text=(storage.foldername(name))[3] and r.payload->>'purged'='true'));
