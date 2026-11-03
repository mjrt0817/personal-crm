begin;
create table public.expenses (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 expense_date date not null,
 vendor text not null check(length(trim(vendor)) between 1 and 200),
 category text not null check(category in ('GWS','ChatGPT','ドメイン','サーバー','その他')),
 amount bigint not null check(amount between 1 and 999999999),
 settlement text not null check(settlement in ('cash','payable','owner')),
 memo text not null default '' check(length(memo)<=2000),
 created_at timestamptz not null default now(),
 unique(id,user_id)
);
-- Append-only records: corrections are additional reversing entries, not deletion.
create table public.finance_entries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 entry_date date not null,
 debit text not null check(debit in ('cash','receivable','payable','capital','revenue','expense')),
 credit text not null check(credit in ('cash','receivable','payable','capital','revenue','expense')),
 amount bigint not null check(amount between 1 and 999999999),
 memo text not null check(length(trim(memo)) between 1 and 2000),
 created_at timestamptz not null default now(),
 check(debit<>credit)
);
create table public.expense_receipts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 expense_id uuid not null,
 drive_file_id text not null check(drive_file_id ~ '^[A-Za-z0-9_-]+$'),
 original_name text not null,
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 source text not null check(source in ('electronic','paper_scan')),
 created_at timestamptz not null default now(),
 foreign key(expense_id,user_id) references public.expenses(id,user_id),
 unique(user_id,drive_file_id)
);
alter table public.expenses enable row level security;
alter table public.finance_entries enable row level security;
alter table public.expense_receipts enable row level security;
revoke all on public.expenses, public.finance_entries, public.expense_receipts from anon, authenticated;
grant select,insert on public.expenses, public.finance_entries, public.expense_receipts to authenticated;
create policy expenses_read on public.expenses for select to authenticated using(user_id=(select auth.uid()));
create policy expenses_add on public.expenses for insert to authenticated with check(user_id=(select auth.uid()));
create policy finance_read on public.finance_entries for select to authenticated using(user_id=(select auth.uid()));
create policy finance_add on public.finance_entries for insert to authenticated with check(user_id=(select auth.uid()));
create policy receipts_read on public.expense_receipts for select to authenticated using(user_id=(select auth.uid()));
create policy receipts_add on public.expense_receipts for insert to authenticated with check(user_id=(select auth.uid()));
create index on public.expenses(user_id,expense_date,id);
create index on public.finance_entries(user_id,entry_date,id);
create index on public.expense_receipts(user_id,expense_id);
commit;
