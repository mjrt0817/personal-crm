-- Ver.3.5: 注文条件テンプレートと納品・検収チェックリスト（018適用済み環境用）
begin;
alter table public.sales_orders
 add column template_id text not null default '',
 add column target_environments text not null default '',
 add column change_terms text not null default '',
 add column support_terms text not null default '',
 add column outcome_terms text not null default '',
 add column checklist_template jsonb not null default '[]'::jsonb;
create table public.order_acceptances (
 order_id uuid primary key references public.sales_orders(id) on delete restrict,
 user_id uuid not null references auth.users(id),
 items jsonb not null, requested_date date, published_date date,
 completed_date date, approved_by text, approval_evidence text,
 notes text not null default '', revision integer not null default 1,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.order_acceptances enable row level security;
revoke all on public.order_acceptances from anon,authenticated;
grant select on public.order_acceptances to authenticated;
create policy acceptance_read on public.order_acceptances for select to authenticated using(user_id=(select auth.uid()));
create function public.validate_acceptance_items(p_items jsonb) returns void language plpgsql set search_path=public as $$
declare x jsonb;
begin
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'チェック項目の形式が不正です'; end if;
 if jsonb_array_length(p_items) not between 1 and 80 then raise exception 'チェック項目は1〜80件にしてください'; end if;
 for x in select * from jsonb_array_elements(p_items) loop
 if jsonb_typeof(x)<>'object' or jsonb_typeof(x->'id')<>'string' or jsonb_typeof(x->'label')<>'string' or jsonb_typeof(x->'note')<>'string'
 or coalesce(x->>'id','') !~ '^[A-Za-z0-9_-]{1,80}$'
 or coalesce(x->>'stage','') not in ('pre','post','handover')
 or length(trim(coalesce(x->>'label',''))) not between 1 and 600
 or coalesce(x->>'status','') not in ('pending','ok','issue','na')
 or x->>'note' is null or length(x->>'note')>2000 then raise exception 'チェック項目の内容を確認してください'; end if;
 end loop;
 if (select count(distinct c.value->>'id') from jsonb_array_elements(p_items) c(value))<>jsonb_array_length(p_items) then raise exception 'チェック項目IDが重複しています'; end if;
end $$;
create function public.create_sales_order_with_conditions(p_estimate uuid,p_delivery date,p_place text,p_payment text,p_inspection text,p_conditions jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare oid uuid; k text; items jsonb;
begin
 if p_conditions is null or jsonb_typeof(p_conditions)<>'object' then raise exception '注文条件を確認してください'; end if;
 if coalesce(p_conditions->>'template_id','') not in ('','website-v1') then raise exception 'テンプレートが不正です'; end if;
 if p_inspection is null or length(trim(p_inspection)) not between 1 and 5000 then raise exception '検収条件は1〜5000文字です'; end if;
 foreach k in array array['target_environments','change_terms','support_terms','outcome_terms'] loop
 if length(coalesce(p_conditions->>k,''))>5000 or (p_conditions->>'template_id'='website-v1' and length(trim(coalesce(p_conditions->>k,'')))=0) then raise exception 'Webサイト構築の条件を確認してください'; end if;
 end loop;
 items=p_conditions->'checklist';perform public.validate_acceptance_items(items);
 -- 作成時の確認項目は未確認に固定。チェック結果は後日の別レコードで扱う。
 select jsonb_agg(jsonb_build_object('id',x->>'id','stage',x->>'stage','label',trim(x->>'label'),'status','pending','note','') order by n) into items from jsonb_array_elements(items) with ordinality a(x,n);
 oid=public.create_sales_order(p_estimate,p_delivery,p_place,p_payment,p_inspection);
 update public.sales_orders set template_id=coalesce(p_conditions->>'template_id',''),target_environments=coalesce(p_conditions->>'target_environments',''),change_terms=coalesce(p_conditions->>'change_terms',''),support_terms=coalesce(p_conditions->>'support_terms',''),outcome_terms=coalesce(p_conditions->>'outcome_terms',''),checklist_template=items where id=oid and user_id=auth.uid();
 return oid;
end $$;
create function public.start_order_acceptance(p_order uuid,p_items jsonb default null)
returns void language plpgsql security definer set search_path=public as $$
declare o public.sales_orders; items jsonb;
begin
 select * into o from public.sales_orders where id=p_order and user_id=auth.uid() for update;
 if not found or o.status<>'confirmed' then raise exception '受注確定後にチェック結果を記録できます'; end if;
 if jsonb_array_length(o.checklist_template)>0 then items=o.checklist_template; else items=p_items; end if;
 perform public.validate_acceptance_items(items);
 select jsonb_agg(jsonb_build_object('id',x->>'id','stage',x->>'stage','label',trim(x->>'label'),'status','pending','note','') order by n) into items from jsonb_array_elements(items) with ordinality a(x,n);
 insert into public.order_acceptances(order_id,user_id,items) values(o.id,auth.uid(),items);
end $$;
create function public.save_order_acceptance(p_order uuid,p_revision integer,p_items jsonb,p_requested date,p_published date,p_complete boolean,p_date date,p_approver text,p_evidence text,p_notes text)
returns void language plpgsql security definer set search_path=public as $$
declare a public.order_acceptances; original jsonb; submitted jsonb; signed_date date; today date:=(now() at time zone 'Asia/Tokyo')::date;
begin
 select * into a from public.order_acceptances where order_id=p_order and user_id=auth.uid() for update;
 if not found then raise exception '検収記録が見つかりません'; end if;
 if a.completed_date is not null then raise exception '検収完了後の記録は変更できません'; end if;
 if p_revision is null or p_revision<>a.revision then raise exception '別の画面で更新されています。再読み込みしてください'; end if;
 if not exists(select 1 from public.sales_orders where id=p_order and status='confirmed' and user_id=auth.uid()) then raise exception '受注確定が必要です'; end if;
 perform public.validate_acceptance_items(p_items);
 select jsonb_agg(jsonb_build_object('id',x->>'id','stage',x->>'stage','label',x->>'label') order by n) into original from jsonb_array_elements(a.items) with ordinality t(x,n);
 select jsonb_agg(jsonb_build_object('id',x->>'id','stage',x->>'stage','label',x->>'label') order by n) into submitted from jsonb_array_elements(p_items) with ordinality t(x,n);
 if original is distinct from submitted then raise exception '注文時の確認項目は変更できません。結果とメモだけ更新してください'; end if;
 if p_requested>today or p_published>today or p_date>today or length(coalesce(p_notes,''))>5000 or length(coalesce(p_approver,''))>200 or length(coalesce(p_evidence,''))>5000 then raise exception '日付・入力文字数を確認してください'; end if;
 select signed_at into signed_date from public.sales_orders where id=p_order and user_id=auth.uid();
 if coalesce(p_complete,false) then
 if signed_date is not null and p_date<signed_date then raise exception '検収完了日は注文書の締結日以降にしてください'; end if;
 if p_date is null or p_requested is null or p_date<p_requested or (p_published is not null and p_date<p_published) or length(trim(coalesce(p_approver,'')))=0 or length(trim(coalesce(p_evidence,'')))=0 then raise exception '確認依頼日・検収完了日・承認者・顧客の承認記録を入力してください'; end if;
 if exists(select 1 from jsonb_array_elements(p_items) x where x->>'status' in ('pending','issue') or (x->>'status'='na' and length(trim(x->>'note'))=0)) then raise exception '未確認・要修正を解消し、対象外には理由を記録してください'; end if;
 end if;
 update public.order_acceptances set items=p_items,requested_date=p_requested,published_date=p_published,completed_date=case when p_complete then p_date else null end,approved_by=nullif(trim(p_approver),''),approval_evidence=nullif(trim(p_evidence),''),notes=coalesce(p_notes,''),revision=revision+1,updated_at=now() where order_id=a.order_id;
end $$;
revoke all on function public.validate_acceptance_items,public.create_sales_order_with_conditions,public.start_order_acceptance,public.save_order_acceptance from public,anon;
grant execute on function public.create_sales_order_with_conditions,public.start_order_acceptance,public.save_order_acceptance to authenticated;
commit;
