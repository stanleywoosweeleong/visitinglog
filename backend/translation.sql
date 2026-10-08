create table public.translation_requests(id bigint generated always as identity primary key,user_id uuid not null references auth.users(id),created_at timestamptz not null default now(),characters integer not null);
alter table public.translation_requests enable row level security;
revoke all on public.translation_requests from public,anon,authenticated;
grant select,insert on public.translation_requests to service_role;
grant usage,select on sequence public.translation_requests_id_seq to service_role;
create index translation_user_time_idx on public.translation_requests(user_id,created_at);
grant insert,update on public.server_settings to service_role;
