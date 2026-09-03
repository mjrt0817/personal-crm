-- Personal CRM Ver.1 / Supabase PostgreSQL
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  company_type text,
  industry text,
  postal_code text,
  address text,
  phone text,
  email text,
  website_url text,
  memo text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  department text,
  position text,
  email text,
  phone text,
  mobile text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete restrict,
  primary_contact_id uuid references public.contacts(id) on delete set null,
  category_id uuid references public.project_categories(id) on delete set null,
  name text not null,
  status text not null default 'consultation' check (status in ('consultation','hearing','preparing','proposed','considering','ordered','in_progress','on_hold','completed','lost')),
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  description text,
  inquiry_date date,
  proposal_date date,
  order_date date,
  start_date date,
  due_date date,
  completed_date date,
  expected_amount numeric(12,0),
  order_amount numeric(12,0),
  next_action text,
  next_action_due timestamptz,
  memo text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  url text not null check (url ~ '^https?://'),
  link_type text not null default 'other' check (link_type in ('teams','google_drive','google_docs','google_sheets','google_slides','website','management_system','other')),
  memo text,
  is_pinned boolean not null default false,
  pin_order smallint,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (is_pinned = false and pin_order is null) or
    (is_pinned = true and pin_order between 1 and 4)
  )
);
create unique index if not exists project_links_pin_unique on public.project_links(project_id, pin_order) where is_pinned = true;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo','doing','waiting','completed')),
  priority text not null default 'medium' check (priority in ('high','medium','low')),
  start_date date,
  due_at timestamptz,
  completed_at timestamptz,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  schedule_type text not null default 'other' check (schedule_type in ('visit','online','phone','work','deadline','other')),
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean not null default false,
  location text,
  description text,
  google_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  activity_type text not null default 'other' check (activity_type in ('visit','phone','email','online_meeting','proposal','quotation','other')),
  activity_at timestamptz not null default now(),
  title text,
  content text not null,
  next_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  file_type text,
  url text not null check (url ~ '^https?://'),
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists companies_user_id_idx on public.companies(user_id);
create index if not exists contacts_user_id_idx on public.contacts(user_id);
create index if not exists contacts_company_id_idx on public.contacts(company_id);
create index if not exists project_categories_user_id_idx on public.project_categories(user_id);
create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists projects_company_id_idx on public.projects(company_id);
create index if not exists projects_status_idx on public.projects(status);
create index if not exists project_links_user_id_idx on public.project_links(user_id);
create index if not exists project_links_project_id_idx on public.project_links(project_id);
create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_project_id_idx on public.tasks(project_id);
create index if not exists tasks_due_at_idx on public.tasks(due_at);
create index if not exists schedules_user_id_idx on public.schedules(user_id);
create index if not exists schedules_start_at_idx on public.schedules(start_at);
create index if not exists activities_user_id_idx on public.activities(user_id);
create index if not exists activities_project_id_idx on public.activities(project_id);
create index if not exists activities_activity_at_idx on public.activities(activity_at desc);
create index if not exists files_user_id_idx on public.files(user_id);
create index if not exists files_project_id_idx on public.files(project_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','companies','contacts','projects','project_links','tasks','schedules','activities','files']
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- RLS
alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.project_categories enable row level security;
alter table public.projects enable row level security;
alter table public.project_links enable row level security;
alter table public.tasks enable row level security;
alter table public.schedules enable row level security;
alter table public.activities enable row level security;
alter table public.files enable row level security;

-- revoke anonymous access
revoke all on public.profiles, public.companies, public.contacts, public.project_categories, public.projects, public.project_links, public.tasks, public.schedules, public.activities, public.files from anon;
grant select, insert, update, delete on public.profiles, public.companies, public.contacts, public.project_categories, public.projects, public.project_links, public.tasks, public.schedules, public.activities, public.files to authenticated;

-- Helper macro-like block: explicit policies per table and operation
do $$
declare t text;
begin
  foreach t in array array['companies','contacts','project_categories','projects','project_links','tasks','schedules','activities','files']
  loop
    execute format('drop policy if exists "%s_select_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_insert_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_update_own" on public.%I', t, t);
    execute format('drop policy if exists "%s_delete_own" on public.%I', t, t);

    execute format('create policy "%s_select_own" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t, t);
    execute format('create policy "%s_insert_own" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t, t);
    execute format('create policy "%s_update_own" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t, t);
    execute format('create policy "%s_delete_own" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t, t);
  end loop;
end $$;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles_delete_own" on public.profiles for delete to authenticated using ((select auth.uid()) = id);

-- Ver.1.2: frequently used compound indexes
create index if not exists companies_user_archived_name_idx on public.companies(user_id, is_archived, name);
create index if not exists contacts_user_company_name_idx on public.contacts(user_id, company_id, name);
create index if not exists project_categories_user_active_sort_idx on public.project_categories(user_id, is_active, sort_order);
create index if not exists projects_user_archived_updated_idx on public.projects(user_id, is_archived, updated_at desc);
create index if not exists projects_user_status_idx on public.projects(user_id, status);
create index if not exists projects_user_next_action_due_idx on public.projects(user_id, next_action_due);
create index if not exists project_links_project_sort_idx on public.project_links(project_id, sort_order);
create index if not exists project_links_project_pinned_idx on public.project_links(project_id, is_pinned, pin_order);
create index if not exists tasks_project_due_idx on public.tasks(project_id, due_at);
create index if not exists tasks_user_status_due_idx on public.tasks(user_id, status, due_at);
create index if not exists schedules_project_start_idx on public.schedules(project_id, start_at);
create index if not exists schedules_user_start_idx on public.schedules(user_id, start_at);
create index if not exists activities_project_at_idx on public.activities(project_id, activity_at desc);
create index if not exists activities_company_at_idx on public.activities(company_id, activity_at desc);

-- Ver.1.4: Google Calendar sync
alter table public.schedules add column if not exists google_calendar_id text;
alter table public.schedules add column if not exists google_sync_status text not null default 'not_synced';
alter table public.schedules add column if not exists google_sync_error text;
alter table public.schedules add column if not exists google_updated_at timestamptz;
alter table public.schedules add column if not exists google_html_link text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'schedules_google_sync_status_check') then
    alter table public.schedules add constraint schedules_google_sync_status_check
      check (google_sync_status in ('not_synced','synced','error'));
  end if;
end $$;

create unique index if not exists schedules_user_google_event_uidx
  on public.schedules(user_id, google_event_id)
  where google_event_id is not null;

create table if not exists public.google_calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token_encrypted text not null,
  google_email text,
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz,
  last_sync_error text,
  updated_at timestamptz not null default now()
);

alter table public.google_calendar_connections enable row level security;
revoke all on public.google_calendar_connections from anon;
grant select, insert, update, delete on public.google_calendar_connections to authenticated;
drop policy if exists "google_calendar_connections_select_own" on public.google_calendar_connections;
drop policy if exists "google_calendar_connections_insert_own" on public.google_calendar_connections;
drop policy if exists "google_calendar_connections_update_own" on public.google_calendar_connections;
drop policy if exists "google_calendar_connections_delete_own" on public.google_calendar_connections;
create policy "google_calendar_connections_select_own" on public.google_calendar_connections for select to authenticated using ((select auth.uid()) = user_id);
create policy "google_calendar_connections_insert_own" on public.google_calendar_connections for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "google_calendar_connections_update_own" on public.google_calendar_connections for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "google_calendar_connections_delete_own" on public.google_calendar_connections for delete to authenticated using ((select auth.uid()) = user_id);
drop trigger if exists set_google_calendar_connections_updated_at on public.google_calendar_connections;
create trigger set_google_calendar_connections_updated_at before update on public.google_calendar_connections for each row execute function public.set_updated_at();
