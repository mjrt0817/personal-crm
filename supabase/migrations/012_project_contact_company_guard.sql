-- Ver.2.7: 案件の主担当者は同じ取引先に属する担当者だけを許可する。
-- 既存データに不整合がある場合は、安全のため主担当者を未設定へ戻す。

update public.projects p
set primary_contact_id = null
where p.primary_contact_id is not null
  and not exists (
    select 1
    from public.contacts c
    where c.id = p.primary_contact_id
      and c.company_id = p.company_id
  );

create unique index if not exists contacts_id_company_id_uidx
  on public.contacts (id, company_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_primary_contact_company_fk'
  ) then
    alter table public.projects
      add constraint projects_primary_contact_company_fk
      foreign key (primary_contact_id, company_id)
      references public.contacts (id, company_id)
      on update cascade;
  end if;
end $$;
