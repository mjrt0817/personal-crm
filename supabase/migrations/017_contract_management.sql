-- Ver.3.1 契約管理 + 複数契約まとめ請求
-- Webサイト保守・運用などの月契約 / 年間契約を管理し、
-- 同一取引先の複数契約を1枚の請求書へまとめられるようにします。

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  name text not null,
  status text not null default 'active' check (status in ('draft','active','paused','ended')),
  cycle text not null default 'monthly' check (cycle in ('monthly','annual')),
  amount numeric(12,0) not null default 0 check (amount >= 0),
  tax_rate numeric(5,2) not null default 10 check (tax_rate >= 0 and tax_rate <= 100),
  billing_timing text not null default 'prepaid' check (billing_timing in ('prepaid','postpaid')),
  start_date date not null,
  end_date date,
  auto_renew boolean not null default true,
  next_period_start date not null,
  next_billing_date date not null,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contracts_user_status_billing_idx on public.contracts(user_id,status,next_billing_date);
create index if not exists contracts_company_idx on public.contracts(company_id,status);
create index if not exists contracts_project_idx on public.contracts(project_id) where project_id is not null;

alter table public.contracts enable row level security;
revoke all on public.contracts from anon;
grant select, insert, update, delete on public.contracts to authenticated;

drop policy if exists "contracts_select_own" on public.contracts;
drop policy if exists "contracts_insert_own" on public.contracts;
drop policy if exists "contracts_update_own" on public.contracts;
drop policy if exists "contracts_delete_own" on public.contracts;
create policy "contracts_select_own" on public.contracts for select to authenticated using ((select auth.uid()) = user_id);
create policy "contracts_insert_own" on public.contracts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "contracts_update_own" on public.contracts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "contracts_delete_own" on public.contracts for delete to authenticated using ((select auth.uid()) = user_id);

drop trigger if exists set_contracts_updated_at on public.contracts;
create trigger set_contracts_updated_at before update on public.contracts for each row execute function public.set_updated_at();

-- 複数契約をまとめた請求書では単一案件に属さない場合があるため nullable 化します。
alter table public.project_invoices alter column project_id drop not null;
alter table public.project_invoices
  add column if not exists source_type text not null default 'project' check (source_type in ('project','estimate','contracts'));

create table if not exists public.contract_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null references public.project_invoices(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  description text not null,
  service_period_start date,
  service_period_end date,
  quantity numeric(8,2) not null default 1,
  unit text not null default '式',
  unit_price numeric(12,0) not null default 0,
  tax_rate numeric(5,2) not null default 10 check (tax_rate >= 0 and tax_rate <= 100),
  amount numeric(12,0) not null default 0 check (amount >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists contract_invoice_lines_invoice_idx on public.contract_invoice_lines(invoice_id,sort_order);
create index if not exists contract_invoice_lines_contract_idx on public.contract_invoice_lines(contract_id);

alter table public.contract_invoice_lines enable row level security;
revoke all on public.contract_invoice_lines from anon;
grant select, insert, update, delete on public.contract_invoice_lines to authenticated;

drop policy if exists "contract_invoice_lines_select_own" on public.contract_invoice_lines;
drop policy if exists "contract_invoice_lines_insert_own" on public.contract_invoice_lines;
drop policy if exists "contract_invoice_lines_update_own" on public.contract_invoice_lines;
drop policy if exists "contract_invoice_lines_delete_own" on public.contract_invoice_lines;
create policy "contract_invoice_lines_select_own" on public.contract_invoice_lines for select to authenticated using ((select auth.uid()) = user_id);
create policy "contract_invoice_lines_insert_own" on public.contract_invoice_lines for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "contract_invoice_lines_update_own" on public.contract_invoice_lines for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "contract_invoice_lines_delete_own" on public.contract_invoice_lines for delete to authenticated using ((select auth.uid()) = user_id);

-- 発行済み請求書の契約明細も固定します。
create or replace function public.guard_issued_contract_invoice_lines()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_invoice_id uuid;
  issued_at timestamptz;
begin
  if tg_op = 'DELETE' then
    target_invoice_id := old.invoice_id;
  else
    target_invoice_id := new.invoice_id;
  end if;
  select issued_snapshot_at into issued_at from public.project_invoices where id = target_invoice_id;
  if issued_at is not null then
    raise exception '発行済み請求書の明細は変更できません。';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists guard_issued_contract_invoice_lines_trigger on public.contract_invoice_lines;
create trigger guard_issued_contract_invoice_lines_trigger
before insert or update or delete on public.contract_invoice_lines
for each row execute function public.guard_issued_contract_invoice_lines();

-- source_type も発行後は固定するよう、既存の不変性ガードを更新します。
create or replace function public.prevent_issued_invoice_document_changes()
returns trigger
language plpgsql
as $$
begin
  if old.issued_snapshot_at is not null then
    if new.user_id is distinct from old.user_id
      or new.project_id is distinct from old.project_id
      or new.company_id is distinct from old.company_id
      or new.source_type is distinct from old.source_type
      or new.title is distinct from old.title
      or new.amount is distinct from old.amount
      or new.unit_quantity is distinct from old.unit_quantity
      or new.unit_price is distinct from old.unit_price
      or new.scheduled_invoice_date is distinct from old.scheduled_invoice_date
      or new.invoice_date is distinct from old.invoice_date
      or new.due_date is distinct from old.due_date
      or new.reference_no is distinct from old.reference_no
      or new.line_description is distinct from old.line_description
      or new.tax_rate is distinct from old.tax_rate
      or new.billing_name is distinct from old.billing_name
      or new.billing_postal_code is distinct from old.billing_postal_code
      or new.billing_address is distinct from old.billing_address
      or new.issuer_snapshot is distinct from old.issuer_snapshot
      or new.customer_snapshot is distinct from old.customer_snapshot
      or new.issued_snapshot_at is distinct from old.issued_snapshot_at
      or new.memo is distinct from old.memo
    then
      raise exception '発行済み請求書の帳票内容は変更できません。取消して新しい請求書を作成してください。';
    end if;
  end if;
  return new;
end;
$$;
