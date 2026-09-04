-- Ver.2.2: 優先アクションの判定条件をユーザーごとに調整可能にする
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  waiting_followup_days integer not null default 3 check (waiting_followup_days between 1 and 30),
  stale_project_days integer not null default 14 check (stale_project_days between 3 and 90),
  task_horizon_days integer not null default 7 check (task_horizon_days between 1 and 30),
  schedule_horizon_days integer not null default 7 check (schedule_horizon_days between 1 and 30),
  project_due_horizon_days integer not null default 7 check (project_due_horizon_days between 1 and 30),
  gmail_lookback_days integer not null default 7 check (gmail_lookback_days between 1 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

revoke all on public.user_preferences from anon;
grant select, insert, update, delete on public.user_preferences to authenticated;

drop policy if exists "user_preferences_select_own" on public.user_preferences;
drop policy if exists "user_preferences_insert_own" on public.user_preferences;
drop policy if exists "user_preferences_update_own" on public.user_preferences;
drop policy if exists "user_preferences_delete_own" on public.user_preferences;

create policy "user_preferences_select_own" on public.user_preferences
for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_preferences_insert_own" on public.user_preferences
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_preferences_update_own" on public.user_preferences
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "user_preferences_delete_own" on public.user_preferences
for delete to authenticated using ((select auth.uid()) = user_id);

create index if not exists user_preferences_updated_at_idx on public.user_preferences(updated_at desc);
