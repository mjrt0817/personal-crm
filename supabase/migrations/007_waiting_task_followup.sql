-- Ver.2.0 待ちタスクの経過日数・フォローアップ管理

alter table public.tasks add column if not exists waiting_since timestamptz;
alter table public.tasks add column if not exists follow_up_at timestamptz;

-- 既存の「待ち」タスクは updated_at を待ち開始の暫定値として補完。
update public.tasks
set waiting_since = coalesce(waiting_since, updated_at, created_at)
where status = 'waiting' and waiting_since is null;

create index if not exists tasks_waiting_followup_idx
  on public.tasks(user_id, status, follow_up_at, waiting_since)
  where status = 'waiting';
