-- Ver.2.6 請求・入金管理
-- 案件ごとの請求予定、請求済み、入金済みを管理します。
-- 既存案件・売上データは変更しません。

create table if not exists public.project_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict,
  title text not null,
  status text not null default 'planned' check (status in ('planned','invoiced','paid','cancelled')),
  amount numeric(12,0) not null default 0 check (amount >= 0),
  unit_quantity numeric(8,2) check (unit_quantity is null or unit_quantity >= 0),
  unit_price numeric(12,0) check (unit_price is null or unit_price >= 0),
  scheduled_invoice_date date,
  invoice_date date,
  due_date date,
  paid_date date,
  reference_no text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_invoices_user_status_due_idx
  on public.project_invoices(user_id, status, due_date);
create index if not exists project_invoices_project_created_idx
  on public.project_invoices(project_id, created_at desc);
create index if not exists project_invoices_company_idx
  on public.project_invoices(company_id);

alter table public.project_invoices enable row level security;
revoke all on public.project_invoices from anon;
grant select, insert, update, delete on public.project_invoices to authenticated;

drop policy if exists "project_invoices_select_own" on public.project_invoices;
drop policy if exists "project_invoices_insert_own" on public.project_invoices;
drop policy if exists "project_invoices_update_own" on public.project_invoices;
drop policy if exists "project_invoices_delete_own" on public.project_invoices;
create policy "project_invoices_select_own" on public.project_invoices for select to authenticated using ((select auth.uid()) = user_id);
create policy "project_invoices_insert_own" on public.project_invoices for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "project_invoices_update_own" on public.project_invoices for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "project_invoices_delete_own" on public.project_invoices for delete to authenticated using ((select auth.uid()) = user_id);

drop trigger if exists set_project_invoices_updated_at on public.project_invoices;
create trigger set_project_invoices_updated_at
before update on public.project_invoices
for each row execute function public.set_updated_at();
