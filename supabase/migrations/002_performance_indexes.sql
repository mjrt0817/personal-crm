-- Personal CRM Ver.1.2 performance indexes
-- 既存DBに一度だけ実行してください。すべて IF NOT EXISTS なので再実行しても安全です。

create index if not exists companies_user_archived_name_idx
  on public.companies(user_id, is_archived, name);

create index if not exists contacts_user_company_name_idx
  on public.contacts(user_id, company_id, name);

create index if not exists project_categories_user_active_sort_idx
  on public.project_categories(user_id, is_active, sort_order);

create index if not exists projects_user_archived_updated_idx
  on public.projects(user_id, is_archived, updated_at desc);

create index if not exists projects_user_status_idx
  on public.projects(user_id, status);

create index if not exists projects_user_next_action_due_idx
  on public.projects(user_id, next_action_due);

create index if not exists project_links_project_sort_idx
  on public.project_links(project_id, sort_order);

create index if not exists project_links_project_pinned_idx
  on public.project_links(project_id, is_pinned, pin_order);

create index if not exists tasks_project_due_idx
  on public.tasks(project_id, due_at);

create index if not exists tasks_user_status_due_idx
  on public.tasks(user_id, status, due_at);

create index if not exists schedules_project_start_idx
  on public.schedules(project_id, start_at);

create index if not exists schedules_user_start_idx
  on public.schedules(user_id, start_at);

create index if not exists activities_project_at_idx
  on public.activities(project_id, activity_at desc);

create index if not exists activities_company_at_idx
  on public.activities(company_id, activity_at desc);
