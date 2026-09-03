-- Ver.1.8 Gmail案件連携
-- Gmail本文そのものは保存せず、件名・送受信者・日時・snippet・Gmail URLなどの参照情報を保存します。

alter table public.activities add column if not exists source text not null default 'manual';
alter table public.activities add column if not exists source_external_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'activities_source_check'
  ) then
    alter table public.activities add constraint activities_source_check
      check (source in ('manual','gmail'));
  end if;
end $$;

create unique index if not exists activities_project_source_external_uidx
  on public.activities(user_id, project_id, source, source_external_id)
  where source_external_id is not null;

create table if not exists public.project_gmail_syncs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  last_sync_at timestamptz,
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, project_id)
);

create table if not exists public.gmail_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  gmail_message_id text not null,
  gmail_thread_id text not null,
  rfc_message_id text,
  subject text,
  from_text text,
  to_text text,
  cc_text text,
  sent_at timestamptz,
  snippet text,
  gmail_url text not null check (gmail_url ~ '^https?://'),
  is_outgoing boolean not null default false,
  activity_id uuid references public.activities(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, project_id, gmail_message_id)
);

create index if not exists project_gmail_syncs_user_project_idx
  on public.project_gmail_syncs(user_id, project_id);
create index if not exists gmail_messages_project_sent_idx
  on public.gmail_messages(project_id, sent_at desc);
create index if not exists gmail_messages_user_thread_idx
  on public.gmail_messages(user_id, gmail_thread_id);

alter table public.project_gmail_syncs enable row level security;
alter table public.gmail_messages enable row level security;
revoke all on public.project_gmail_syncs from anon;
revoke all on public.gmail_messages from anon;
grant select, insert, update, delete on public.project_gmail_syncs to authenticated;
grant select, insert, update, delete on public.gmail_messages to authenticated;

drop policy if exists "project_gmail_syncs_select_own" on public.project_gmail_syncs;
drop policy if exists "project_gmail_syncs_insert_own" on public.project_gmail_syncs;
drop policy if exists "project_gmail_syncs_update_own" on public.project_gmail_syncs;
drop policy if exists "project_gmail_syncs_delete_own" on public.project_gmail_syncs;
create policy "project_gmail_syncs_select_own" on public.project_gmail_syncs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "project_gmail_syncs_insert_own" on public.project_gmail_syncs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "project_gmail_syncs_update_own" on public.project_gmail_syncs
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "project_gmail_syncs_delete_own" on public.project_gmail_syncs
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "gmail_messages_select_own" on public.gmail_messages;
drop policy if exists "gmail_messages_insert_own" on public.gmail_messages;
drop policy if exists "gmail_messages_update_own" on public.gmail_messages;
drop policy if exists "gmail_messages_delete_own" on public.gmail_messages;
create policy "gmail_messages_select_own" on public.gmail_messages
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "gmail_messages_insert_own" on public.gmail_messages
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "gmail_messages_update_own" on public.gmail_messages
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "gmail_messages_delete_own" on public.gmail_messages
  for delete to authenticated using ((select auth.uid()) = user_id);

drop trigger if exists set_project_gmail_syncs_updated_at on public.project_gmail_syncs;
create trigger set_project_gmail_syncs_updated_at
before update on public.project_gmail_syncs
for each row execute function public.set_updated_at();

drop trigger if exists set_gmail_messages_updated_at on public.gmail_messages;
create trigger set_gmail_messages_updated_at
before update on public.gmail_messages
for each row execute function public.set_updated_at();
