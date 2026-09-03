-- Ver.1.5 Google Drive案件フォルダ連携
-- 既存データは削除せず、案件ごとのDriveフォルダと同期済みファイルメタデータを追加します。

create table if not exists public.project_drive_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  google_folder_id text not null,
  name text not null,
  url text not null check (url ~ '^https?://'),
  last_sync_at timestamptz,
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, project_id, google_folder_id)
);

alter table public.files add column if not exists source text not null default 'manual';
alter table public.files add column if not exists external_id text;
alter table public.files add column if not exists external_parent_id text;
alter table public.files add column if not exists drive_folder_id uuid references public.project_drive_folders(id) on delete cascade;
alter table public.files add column if not exists mime_type text;
alter table public.files add column if not exists relative_path text;
alter table public.files add column if not exists external_modified_at timestamptz;
alter table public.files add column if not exists is_folder boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'files_source_check'
  ) then
    alter table public.files add constraint files_source_check check (source in ('manual','google_drive'));
  end if;
end $$;

create index if not exists project_drive_folders_user_project_idx
  on public.project_drive_folders(user_id, project_id);
create index if not exists files_drive_folder_idx
  on public.files(drive_folder_id);
create index if not exists files_project_source_modified_idx
  on public.files(project_id, source, external_modified_at desc);
create unique index if not exists files_drive_external_uidx
  on public.files(user_id, drive_folder_id, external_id);

alter table public.project_drive_folders enable row level security;
revoke all on public.project_drive_folders from anon;
grant select, insert, update, delete on public.project_drive_folders to authenticated;

drop policy if exists "project_drive_folders_select_own" on public.project_drive_folders;
drop policy if exists "project_drive_folders_insert_own" on public.project_drive_folders;
drop policy if exists "project_drive_folders_update_own" on public.project_drive_folders;
drop policy if exists "project_drive_folders_delete_own" on public.project_drive_folders;
create policy "project_drive_folders_select_own" on public.project_drive_folders
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "project_drive_folders_insert_own" on public.project_drive_folders
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "project_drive_folders_update_own" on public.project_drive_folders
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "project_drive_folders_delete_own" on public.project_drive_folders
  for delete to authenticated using ((select auth.uid()) = user_id);

drop trigger if exists set_project_drive_folders_updated_at on public.project_drive_folders;
create trigger set_project_drive_folders_updated_at
before update on public.project_drive_folders
for each row execute function public.set_updated_at();
