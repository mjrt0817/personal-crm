-- Ver.2.4 売上・見込パイプライン
-- 既存データは保持し、案件へ受注確度と受注見込日を追加します。

alter table public.projects
  add column if not exists win_probability smallint,
  add column if not exists expected_close_date date;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'projects_win_probability_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_win_probability_check
      check (win_probability is null or win_probability between 0 and 100);
  end if;
end $$;

create index if not exists projects_expected_close_date_idx
  on public.projects(user_id, expected_close_date)
  where is_archived = false;

create index if not exists projects_order_date_idx
  on public.projects(user_id, order_date)
  where is_archived = false;
