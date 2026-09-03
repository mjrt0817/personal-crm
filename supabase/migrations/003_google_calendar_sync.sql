-- Ver.1.4 Google Calendar双方向同期（アプリ→自動 / Google→手動取り込み）

alter table public.schedules add column if not exists google_calendar_id text;
alter table public.schedules add column if not exists google_sync_status text not null default 'not_synced';
alter table public.schedules add column if not exists google_sync_error text;
alter table public.schedules add column if not exists google_updated_at timestamptz;
alter table public.schedules add column if not exists google_html_link text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'schedules_google_sync_status_check'
  ) then
    alter table public.schedules add constraint schedules_google_sync_status_check
      check (google_sync_status in ('not_synced','synced','error'));
  end if;
end $$;

create unique index if not exists schedules_user_google_event_uidx
  on public.schedules(user_id, google_event_id)
  where google_event_id is not null;

create table if not exists public.google_calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token_encrypted text not null,
  google_email text,
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz,
  last_sync_error text,
  updated_at timestamptz not null default now()
);

alter table public.google_calendar_connections enable row level security;
revoke all on public.google_calendar_connections from anon;
grant select, insert, update, delete on public.google_calendar_connections to authenticated;

drop policy if exists "google_calendar_connections_select_own" on public.google_calendar_connections;
drop policy if exists "google_calendar_connections_insert_own" on public.google_calendar_connections;
drop policy if exists "google_calendar_connections_update_own" on public.google_calendar_connections;
drop policy if exists "google_calendar_connections_delete_own" on public.google_calendar_connections;
create policy "google_calendar_connections_select_own" on public.google_calendar_connections for select to authenticated using ((select auth.uid()) = user_id);
create policy "google_calendar_connections_insert_own" on public.google_calendar_connections for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "google_calendar_connections_update_own" on public.google_calendar_connections for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "google_calendar_connections_delete_own" on public.google_calendar_connections for delete to authenticated using ((select auth.uid()) = user_id);

drop trigger if exists set_google_calendar_connections_updated_at on public.google_calendar_connections;
create trigger set_google_calendar_connections_updated_at
before update on public.google_calendar_connections
for each row execute function public.set_updated_at();
