-- Ver.2.5 単価 × 回数・数量による案件売上管理
-- 既存案件は fixed のまま保持され、既存金額は変更しません。

alter table public.projects
  add column if not exists pricing_model text not null default 'fixed',
  add column if not exists unit_label text not null default '回',
  add column if not exists unit_price numeric(12,0),
  add column if not exists planned_units numeric(8,2),
  add column if not exists completed_units numeric(8,2);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'projects_pricing_model_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_pricing_model_check
      check (pricing_model in ('fixed','unit'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'projects_unit_price_nonnegative_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_unit_price_nonnegative_check
      check (unit_price is null or unit_price >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'projects_planned_units_nonnegative_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_planned_units_nonnegative_check
      check (planned_units is null or planned_units >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'projects_completed_units_nonnegative_check'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_completed_units_nonnegative_check
      check (completed_units is null or completed_units >= 0);
  end if;
end $$;

create index if not exists projects_pricing_model_idx
  on public.projects(user_id, pricing_model)
  where is_archived = false;
