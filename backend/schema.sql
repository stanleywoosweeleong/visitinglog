-- Run once in a new Supabase project. Memberships are administrator provisioned.
create table public.organisations(id uuid primary key default gen_random_uuid(), name text not null);
create table public.memberships(user_id uuid primary key references auth.users(id), org_id uuid not null references public.organisations(id), display_name text not null, role text not null check(role in ('staff','supervisor','admin')));
create table public.supervisor_staff(supervisor_id uuid references public.memberships(user_id), staff_id uuid references public.memberships(user_id), primary key(supervisor_id,staff_id));
create table public.records(id uuid primary key,kind text not null check(kind in ('farm','visit')),org_id uuid not null references public.organisations(id),owner_id uuid not null references auth.users(id),payload jsonb not null,revision integer not null default 1,updated_at timestamptz not null default now());
alter table public.organisations enable row level security;
alter table public.memberships enable row level security;
alter table public.supervisor_staff enable row level security;
alter table public.records enable row level security;
create policy own_membership on public.memberships for select to authenticated using(user_id=auth.uid());
create policy own_assignments on public.supervisor_staff for select to authenticated using(supervisor_id=auth.uid());
create policy organisation_read on public.organisations for select to authenticated using(id in(select org_id from public.memberships where user_id=auth.uid()));
create policy record_read on public.records for select to authenticated using(org_id in(select org_id from public.memberships where user_id=auth.uid()) and (owner_id=auth.uid() or exists(select 1 from public.memberships where user_id=auth.uid() and role='admin') or owner_id in(select staff_id from public.supervisor_staff where supervisor_id=auth.uid())));
-- No direct insert/update/delete policies: writes must pass optimistic revision checks.
create function public.save_record(record_id uuid,record_kind text,record_payload jsonb,expected_revision integer)
returns integer language plpgsql security definer set search_path=public as $$
declare member public.memberships; existing public.records; new_revision integer;
begin
 select * into member from public.memberships where user_id=auth.uid();
 if member.user_id is null then raise exception 'membership required'; end if;
 if record_kind not in ('farm','visit') then raise exception 'invalid kind'; end if;
 perform pg_advisory_xact_lock(hashtext(record_id::text));
 select * into existing from public.records where id=record_id for update;
 if existing.id is not null then
  if existing.owner_id<>auth.uid() or existing.org_id<>member.org_id then raise exception 'access denied'; end if;
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
revoke all on function public.save_record(uuid,text,jsonb,integer) from public,anon;
grant execute on function public.save_record(uuid,text,jsonb,integer) to authenticated;
grant select on public.organisations,public.memberships,public.supervisor_staff,public.records to authenticated;
