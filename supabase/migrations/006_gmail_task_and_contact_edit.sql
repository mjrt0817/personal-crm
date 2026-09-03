-- Ver.1.9 Gmail→タスク連携
-- 担当者編集自体は既存contactsテーブルを利用するためDB変更不要です。

alter table public.tasks add column if not exists source text not null default 'manual';
alter table public.tasks add column if not exists source_external_id text;

-- 既存環境で何度実行しても安全なように制約を存在確認して追加。
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tasks_source_check'
  ) then
    alter table public.tasks add constraint tasks_source_check
      check (source in ('manual','gmail'));
  end if;
end $$;

create unique index if not exists tasks_project_source_external_uidx
  on public.tasks(user_id, project_id, source, source_external_id)
  where source_external_id is not null;

alter table public.gmail_messages
  add column if not exists task_id uuid references public.tasks(id) on delete set null;

create index if not exists gmail_messages_task_id_idx
  on public.gmail_messages(task_id)
  where task_id is not null;
