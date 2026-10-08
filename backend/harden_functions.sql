-- Keep privileged implementation outside the exposed Data API schema.
alter function public.save_record(uuid,text,jsonb,integer) set schema private;
create function public.save_record(record_id uuid,record_kind text,record_payload jsonb,expected_revision integer)
returns integer language sql security invoker set search_path='' as $$
 select private.save_record(record_id,record_kind,record_payload,expected_revision);
$$;
revoke all on function public.save_record(uuid,text,jsonb,integer) from public,anon;
grant execute on function public.save_record(uuid,text,jsonb,integer) to authenticated;
alter function public.allow_team_member(text,text) set schema private;
create function public.allow_team_member(member_email text,member_name text)
returns void language sql security invoker set search_path='' as $$
 select private.allow_team_member(member_email,member_name);
$$;
revoke all on function public.allow_team_member(text,text) from public,anon;
grant execute on function public.allow_team_member(text,text) to authenticated;
grant usage on schema private to authenticated;
revoke all on all tables in schema private from public,anon,authenticated;
revoke all on function public.rls_auto_enable() from public,anon,authenticated;
