-- Staff identity is supplied by the server rather than accepted from the phone.
create or replace function public.validate_record_payload()
returns trigger language plpgsql security definer set search_path=public as $$
declare staff_name text; farm public.records;
begin
 select display_name into staff_name from public.memberships where user_id=new.owner_id and org_id=new.org_id;
 if staff_name is null then raise exception 'organisation membership required'; end if;
 if new.payload->>'kind' is distinct from new.kind then raise exception 'record kind mismatch'; end if;
 if new.payload->>'id' is distinct from new.id::text then raise exception 'record ID mismatch'; end if;
 if new.kind='farm' then
  if length(trim(coalesce(new.payload->>'name','')))=0 or length(new.payload->>'name')>300 then raise exception 'farm name required, maximum 300 characters'; end if;
 else
  if jsonb_typeof(new.payload->'date') is distinct from 'string' then raise exception 'visit time required'; end if;
  perform (new.payload->>'date')::timestamptz;
  select * into farm from public.records where id=(new.payload->>'farmId')::uuid and kind='farm' and org_id=new.org_id;
  if farm.id is null then raise exception 'farm must belong to the same organisation'; end if;
  if length(coalesce(new.payload->>'note',''))>20000 or length(coalesce(new.payload->>'advice',''))>20000 then raise exception 'note exceeds 20000 characters'; end if;
  if new.payload ? 'photos' and (jsonb_typeof(new.payload->'photos')<>'array' or jsonb_array_length(new.payload->'photos')>8) then raise exception 'maximum eight photos'; end if;
 end if;
 new.payload=new.payload || jsonb_build_object('staff',staff_name,'ownerId',new.owner_id,'revision',new.revision,'serverUpdatedAt',now());
 return new;
end; $$;
create trigger validate_record_payload before insert or update on public.records for each row execute function public.validate_record_payload();
