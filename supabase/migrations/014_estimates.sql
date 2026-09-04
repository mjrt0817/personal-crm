-- Ver.2.9: 見積書作成・案件/請求への引継ぎ
-- 既存データは削除しません。

alter table public.invoice_settings
  add column if not exists estimate_prefix text not null default 'EST',
  add column if not exists next_estimate_number integer not null default 1 check (next_estimate_number >= 1),
  add column if not exists default_estimate_valid_days integer not null default 30 check (default_estimate_valid_days between 1 and 365),
  add column if not exists estimate_note text;

create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict,
  contact_id uuid references public.contacts(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  estimate_no text not null,
  title text not null,
  status text not null default 'draft' check (status in ('draft','sent','accepted','rejected','expired')),
  issue_date date not null default current_date,
  valid_until date,
  accepted_date date,
  billing_name text,
  billing_postal_code text,
  billing_address text,
  subtotal numeric(12,0) not null default 0 check (subtotal >= 0),
  tax_amount numeric(12,0) not null default 0 check (tax_amount >= 0),
  total_amount numeric(12,0) not null default 0 check (total_amount >= 0),
  issuer_snapshot jsonb,
  customer_snapshot jsonb,
  issued_snapshot_at timestamptz,
  memo text,
  terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, estimate_no)
);

create table if not exists public.estimate_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  sort_order integer not null default 0,
  description text not null,
  quantity numeric(10,2) not null default 1 check (quantity >= 0),
  unit text,
  unit_price numeric(12,0) not null default 0 check (unit_price >= 0),
  tax_rate numeric(5,2) not null default 10 check (tax_rate >= 0 and tax_rate <= 100),
  line_subtotal numeric(12,0) not null default 0 check (line_subtotal >= 0),
  tax_amount numeric(12,0) not null default 0 check (tax_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_invoices
  add column if not exists estimate_id uuid references public.estimates(id) on delete set null;

create index if not exists estimates_user_status_date_idx on public.estimates(user_id, status, issue_date desc);
create index if not exists estimates_project_idx on public.estimates(project_id, created_at desc);
create index if not exists estimates_company_idx on public.estimates(company_id, created_at desc);
create index if not exists estimate_items_estimate_sort_idx on public.estimate_items(estimate_id, sort_order);
create index if not exists project_invoices_estimate_idx on public.project_invoices(estimate_id);

alter table public.estimates enable row level security;
alter table public.estimate_items enable row level security;
revoke all on public.estimates from anon;
revoke all on public.estimate_items from anon;
grant select, insert, update, delete on public.estimates to authenticated;
grant select, insert, update, delete on public.estimate_items to authenticated;

-- authenticated本人の行のみアクセス可
drop policy if exists "estimates_select_own" on public.estimates;
drop policy if exists "estimates_insert_own" on public.estimates;
drop policy if exists "estimates_update_own" on public.estimates;
drop policy if exists "estimates_delete_own" on public.estimates;
create policy "estimates_select_own" on public.estimates for select to authenticated using ((select auth.uid()) = user_id);
create policy "estimates_insert_own" on public.estimates for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "estimates_update_own" on public.estimates for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "estimates_delete_own" on public.estimates for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "estimate_items_select_own" on public.estimate_items;
drop policy if exists "estimate_items_insert_own" on public.estimate_items;
drop policy if exists "estimate_items_update_own" on public.estimate_items;
drop policy if exists "estimate_items_delete_own" on public.estimate_items;
create policy "estimate_items_select_own" on public.estimate_items for select to authenticated using ((select auth.uid()) = user_id);
create policy "estimate_items_insert_own" on public.estimate_items for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (select 1 from public.estimates e where e.id = estimate_id and e.user_id = (select auth.uid()))
);
create policy "estimate_items_update_own" on public.estimate_items for update to authenticated using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id and exists (select 1 from public.estimates e where e.id = estimate_id and e.user_id = (select auth.uid()))
);
create policy "estimate_items_delete_own" on public.estimate_items for delete to authenticated using ((select auth.uid()) = user_id);

drop trigger if exists set_estimates_updated_at on public.estimates;
create trigger set_estimates_updated_at before update on public.estimates for each row execute function public.set_updated_at();
drop trigger if exists set_estimate_items_updated_at on public.estimate_items;
create trigger set_estimate_items_updated_at before update on public.estimate_items for each row execute function public.set_updated_at();

-- 見積の担当者は見積の取引先に所属する担当者だけを許可
create or replace function public.validate_estimate_contact_company()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.contact_id is not null and not exists (
    select 1 from public.contacts c
    where c.id = new.contact_id and c.company_id = new.company_id and c.user_id = new.user_id
  ) then
    raise exception '見積担当者は選択した取引先の担当者から選択してください。';
  end if;
  if new.project_id is not null and not exists (
    select 1 from public.projects p
    where p.id = new.project_id and p.company_id = new.company_id and p.user_id = new.user_id
  ) then
    raise exception '見積に紐付ける案件は同じ取引先の案件を選択してください。';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_estimate_contact_company on public.estimates;
create trigger validate_estimate_contact_company
before insert or update of company_id, contact_id, project_id on public.estimates
for each row execute function public.validate_estimate_contact_company();
