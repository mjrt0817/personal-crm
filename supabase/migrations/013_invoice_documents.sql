-- Ver.2.8 請求書発行・PDF保存（印刷）
-- 発行者情報、請求先スナップショット、税率・明細情報を追加します。

create table if not exists public.invoice_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  issuer_name text not null default '',
  issuer_postal_code text,
  issuer_address text,
  issuer_phone text,
  issuer_email text,
  registration_number text,
  bank_name text,
  bank_branch text,
  bank_account_type text,
  bank_account_number text,
  bank_account_name text,
  invoice_prefix text not null default 'INV',
  next_invoice_number integer not null default 1 check (next_invoice_number >= 1),
  default_tax_rate numeric(5,2) not null default 10 check (default_tax_rate >= 0 and default_tax_rate <= 100),
  payment_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.invoice_settings enable row level security;
revoke all on public.invoice_settings from anon;
grant select, insert, update, delete on public.invoice_settings to authenticated;

drop policy if exists "invoice_settings_select_own" on public.invoice_settings;
drop policy if exists "invoice_settings_insert_own" on public.invoice_settings;
drop policy if exists "invoice_settings_update_own" on public.invoice_settings;
drop policy if exists "invoice_settings_delete_own" on public.invoice_settings;
create policy "invoice_settings_select_own" on public.invoice_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "invoice_settings_insert_own" on public.invoice_settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "invoice_settings_update_own" on public.invoice_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "invoice_settings_delete_own" on public.invoice_settings for delete to authenticated using ((select auth.uid()) = user_id);

drop trigger if exists set_invoice_settings_updated_at on public.invoice_settings;
create trigger set_invoice_settings_updated_at
before update on public.invoice_settings
for each row execute function public.set_updated_at();

alter table public.project_invoices
  add column if not exists line_description text,
  add column if not exists tax_rate numeric(5,2) not null default 0 check (tax_rate >= 0 and tax_rate <= 100),
  add column if not exists billing_name text,
  add column if not exists billing_postal_code text,
  add column if not exists billing_address text,
  add column if not exists issuer_snapshot jsonb,
  add column if not exists customer_snapshot jsonb,
  add column if not exists issued_snapshot_at timestamptz;

create index if not exists project_invoices_reference_no_idx
  on public.project_invoices(user_id, reference_no)
  where reference_no is not null;
