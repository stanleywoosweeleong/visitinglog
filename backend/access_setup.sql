-- Administrator provisions membership using an email allowlist.
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
create table private.allowed_members(email text primary key,org_id uuid not null references public.organisations(id),display_name text not null,role text not null check(role in('staff','admin')));
alter table private.allowed_members enable row level security;
create function private.enrol_confirmed_member() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.email_confirmed_at is not null then
  insert into public.memberships(user_id,org_id,display_name,role)
  select new.id,org_id,display_name,role from private.allowed_members where email=lower(new.email)
  on conflict(user_id) do nothing;
 end if;
 return new;
end; $$;
revoke all on function private.enrol_confirmed_member() from public,anon,authenticated;
create trigger visitinglog_enrol_user after insert or update of email_confirmed_at on auth.users for each row execute function private.enrol_confirmed_member();
create function public.allow_team_member(member_email text,member_name text) returns void language plpgsql security definer set search_path='' as $$
declare admin_member public.memberships; target_org uuid;
begin
 select * into admin_member from public.memberships where user_id=(select auth.uid()) and role='admin';
 if admin_member.user_id is null then raise exception 'administrator required'; end if;
 if length(trim(member_name))<1 or length(member_name)>200 or length(member_email)>320 or member_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'valid name and email required'; end if;
 select org_id into target_org from private.allowed_members where email=lower(trim(member_email));
 if target_org is not null and target_org<>admin_member.org_id then raise exception 'email belongs to another organisation'; end if;
 insert into private.allowed_members(email,org_id,display_name,role) values(lower(trim(member_email)),admin_member.org_id,trim(member_name),'staff')
 on conflict(email) do update set display_name=excluded.display_name;
 insert into public.memberships(user_id,org_id,display_name,role)
 select id,admin_member.org_id,trim(member_name),'staff' from auth.users
 where lower(email)=lower(trim(member_email)) and email_confirmed_at is not null
 on conflict(user_id) do nothing;
end; $$;
revoke all on function public.allow_team_member(text,text) from public,anon;
grant execute on function public.allow_team_member(text,text) to authenticated;
