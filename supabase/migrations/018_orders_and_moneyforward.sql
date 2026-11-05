-- Ver.3.4: 注文書・締結ぱっと手動署名・受注確定・MF請求連携
-- 001〜017適用済み環境に追加。既存帳票は削除しません。
begin;
create table public.sales_orders (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 estimate_id uuid not null references public.estimates(id) on delete restrict,
 company_id uuid not null references public.companies(id) on delete restrict,
 project_id uuid references public.projects(id) on delete restrict,
 order_no text not null, status text not null default 'created' check(status in ('created','signing','confirmed','cancelled')),
 snapshot jsonb not null, delivery_date date not null, delivery_place text not null,
 payment_terms text not null, inspection_terms text not null,
 signed_path text, signed_sha256 text, signed_at date, signature_reference text,
 confirmed_at timestamptz, created_at timestamptz not null default now(),
 unique(user_id,order_no), check(status <> 'confirmed' or (signed_path is not null and signed_sha256 is not null and signed_at is not null))
);
create unique index one_active_order_per_estimate on public.sales_orders(estimate_id) where status <> 'cancelled';
create table public.order_billing_plans (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 order_id uuid not null references public.sales_orders(id) on delete restrict,
 title text not null, billing_date date not null, sales_date date not null, due_date date not null,
 items jsonb not null, expected_total numeric(12,0) not null check(expected_total>0),
 status text not null default 'planned' check(status in ('planned','sending','review','created','cancelled')),
 mf_department_id text not null, mf_billing_id text, mf_billing_number text, mf_total numeric,
 sync_error text, sync_started_at timestamptz, synced_at timestamptz, created_at timestamptz not null default now(),
 check(due_date >= billing_date), unique(user_id,mf_billing_id)
);
create table public.mf_connections (
 user_id uuid primary key references auth.users(id), token_encrypted text not null,
 connected_at timestamptz not null default now(), refresh_lock timestamptz
);
alter table public.sales_orders enable row level security;
alter table public.order_billing_plans enable row level security;
alter table public.mf_connections enable row level security;
revoke all on public.sales_orders, public.order_billing_plans, public.mf_connections from anon, authenticated;
grant select on public.sales_orders, public.order_billing_plans to authenticated;
grant select,insert,update,delete on public.mf_connections to authenticated;
create policy orders_read on public.sales_orders for select to authenticated using(user_id=(select auth.uid()));
create policy plans_read on public.order_billing_plans for select to authenticated using(user_id=(select auth.uid()));
create policy mf_own on public.mf_connections for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
-- 注文書を作成した見積・明細は固定。変更時は見積をコピーし、注文書を再作成します。
-- INSERT時にも、既存見積への明細追加を防ぐ
create or replace function public.guard_order_estimate() returns trigger language plpgsql security definer set search_path=public as $$
declare eid uuid;
begin
 if tg_table_name='estimates' then eid=old.id;
 elsif tg_op='INSERT' then eid=new.estimate_id;
 else eid=old.estimate_id; end if;
 perform 1 from public.estimates where id=eid for update;
 if exists(select 1 from public.sales_orders where estimate_id=eid)
 then
 raise exception '注文書作成済みの見積は変更・削除できません。見積をコピーしてください。'; end if;
 if tg_table_name='estimate_items' and tg_op='UPDATE' then
 if exists(select 1 from public.sales_orders where estimate_id=new.estimate_id) then raise exception '注文書作成済みの明細は変更できません'; end if; end if;
 if tg_op='DELETE' then return old; end if; return new;
end $$;
create trigger freeze_order_estimate before update or delete on public.estimates for each row execute function public.guard_order_estimate();
create trigger freeze_order_items before insert or update or delete on public.estimate_items for each row execute function public.guard_order_estimate();
create function public.create_sales_order(p_estimate uuid,p_delivery date,p_place text,p_payment text,p_inspection text)
returns uuid language plpgsql security definer set search_path=public as $$
declare e public.estimates; oid uuid:=gen_random_uuid(); snap jsonb; issuer jsonb; customer jsonb;
begin
 select * into e from public.estimates where id=p_estimate and user_id=auth.uid() for update;
 if not found then raise exception '見積が見つかりません'; end if;
 if e.status not in ('sent','accepted') or (e.valid_until is not null and e.valid_until < (now() at time zone 'Asia/Tokyo')::date) then
 raise exception '有効期限内の送付済み見積を選んでください'; end if;
 if e.project_id is not null and not exists(select 1 from public.projects where id=e.project_id and user_id=auth.uid() and company_id=e.company_id) then raise exception '案件と取引先の関連を確認してください'; end if;
 if exists(select 1 from public.project_invoices where estimate_id=e.id and status<>'cancelled') then raise exception 'この見積には従来の請求データがあります。二重請求を防ぐため、新規の注文書は作成できません'; end if;
 if (select coalesce(sum(line_subtotal),0) from public.estimate_items where estimate_id=e.id)<>e.subtotal or (select coalesce(sum(tax_amount),0) from public.estimate_items where estimate_id=e.id)<>e.tax_amount or e.subtotal+e.tax_amount<>e.total_amount then raise exception '見積の明細合計と総額が一致しません。見積を確認してください'; end if;
 if p_delivery is null or length(trim(p_place))=0 or length(trim(p_payment))=0 or length(trim(p_inspection))=0 then raise exception '納期・納品場所・支払条件・検収条件を入力してください'; end if;
 select coalesce(e.issuer_snapshot,jsonb_build_object('name',s.issuer_name,'tradeName',s.issuer_trade_name,'personName',s.issuer_person_name,'address',s.issuer_address,'postalCode',s.issuer_postal_code,'email',s.issuer_email,'phone',s.issuer_phone,'registrationNumber',s.registration_number)) into issuer from public.invoice_settings s where s.user_id=auth.uid();
 select coalesce(e.customer_snapshot,jsonb_build_object('name',coalesce(e.billing_name,c.name),'postalCode',coalesce(e.billing_postal_code,c.postal_code),'address',coalesce(e.billing_address,c.address))) into customer from public.companies c where c.id=e.company_id and c.user_id=auth.uid();
 if coalesce(issuer->>'name',issuer->>'tradeName',issuer->>'personName','')='' or coalesce(customer->>'name','')='' then raise exception '帳票設定の発行者・宛先を確認してください'; end if;
 select jsonb_build_object('estimate',to_jsonb(e),'issuer',issuer,'customer',customer,'items',jsonb_agg(to_jsonb(i) order by i.sort_order)) into snap from public.estimate_items i where i.estimate_id=e.id;
 if snap->'items' is null or snap->'items'='null'::jsonb or e.total_amount<=0 then raise exception '明細・金額を確認してください'; end if;
 insert into public.sales_orders(id,user_id,estimate_id,company_id,project_id,order_no,snapshot,delivery_date,delivery_place,payment_terms,inspection_terms)
 values(oid,auth.uid(),e.id,e.company_id,e.project_id,'ORD-'||upper(substr(oid::text,1,8)),snap,p_delivery,p_place,p_payment,p_inspection);
 return oid;
end $$;
create function public.transition_sales_order(p_id uuid,p_action text,p_path text default null,p_hash text default null,p_date date default null,p_reference text default null)
returns void language plpgsql security definer set search_path=public as $$
declare o public.sales_orders; pid uuid;
begin
 select * into o from public.sales_orders where id=p_id and user_id=auth.uid() for update;
 if not found then raise exception '注文書が見つかりません'; end if;
 if p_action='signing' and o.status='created' then update public.sales_orders set status='signing' where id=o.id;
 elsif p_action='confirm' and o.status='signing' then
 if p_date is null or p_date>(now() at time zone 'Asia/Tokyo')::date or p_date<(o.created_at at time zone 'Asia/Tokyo')::date or p_hash is null or p_path is null or p_hash !~ '^[a-f0-9]{64}$' or p_path not like auth.uid()::text||'/'||o.id::text||'/%' or not exists(select 1 from storage.objects where bucket_id='signed-orders' and name=p_path) then raise exception '署名済みPDFと正しい締結日を登録してください'; end if;
 pid=o.project_id;
 if pid is null then
 insert into public.projects(user_id,company_id,name,status,expected_amount,order_amount,description,order_date,due_date)
 values(auth.uid(),o.company_id,o.snapshot->'estimate'->>'title','ordered',(o.snapshot->'estimate'->>'total_amount')::numeric,(o.snapshot->'estimate'->>'total_amount')::numeric,'注文書 '||o.order_no||' より受注確定',p_date,o.delivery_date) returning id into pid;
 else
 perform 1 from public.projects where id=pid and user_id=auth.uid() for update;
 update public.projects set status='ordered',order_date=(now() at time zone 'Asia/Tokyo')::date,order_amount=(o.snapshot->'estimate'->>'total_amount')::numeric + coalesce((select sum((so.snapshot->'estimate'->>'total_amount')::numeric) from public.sales_orders so where so.project_id=pid and so.status='confirmed' and so.id<>o.id),0) where id=pid and user_id=auth.uid();
 end if;
 update public.sales_orders set status='confirmed',project_id=pid,signed_path=p_path,signed_sha256=p_hash,signed_at=p_date,signature_reference=nullif(trim(p_reference),''),confirmed_at=now() where id=o.id;
 elsif p_action='cancel' and o.status in ('created','signing') then update public.sales_orders set status='cancelled' where id=o.id;
 else raise exception 'この状態では操作できません'; end if;
end $$;
create function public.create_order_plan(p_order uuid,p_title text,p_billing date,p_sales date,p_due date,p_items jsonb,p_department text)
returns uuid language plpgsql security definer set search_path=public as $$
declare o public.sales_orders; item jsonb; rate numeric; subtotal numeric:=0; tax numeric:=0; total numeric; pid uuid;
begin
 select * into o from public.sales_orders where id=p_order and user_id=auth.uid() for update;
 if not found or o.status<>'confirmed' then raise exception '署名完了・受注確定が必要です'; end if;
 if p_title is null or length(trim(p_title)) not between 1 and 200 or p_department is null or length(trim(p_department))=0 or p_due<p_billing or p_due is null or p_sales is null or p_billing is null then raise exception '請求名・請求日・売上計上日・期限・MF取引先を確認してください'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception '明細が必要です'; end if;
 for item in select * from jsonb_array_elements(p_items) loop
 rate=(item->>'tax_rate')::numeric;
 if rate not in (0,8,10) or not exists(select 1 from jsonb_array_elements(o.snapshot->'items') x where (x->>'tax_rate')::numeric=rate) or length(trim(item->>'description')) not between 1 and 450 or (item->>'quantity')::numeric<=0 or (item->>'unit_price')::numeric<0 then raise exception '請求明細を確認してください'; end if;
 subtotal=subtotal+round((item->>'quantity')::numeric*(item->>'unit_price')::numeric);
 tax=tax+round(round((item->>'quantity')::numeric*(item->>'unit_price')::numeric)*rate/100);
 end loop;
 total=subtotal+tax;
 if total<=0 or total+coalesce((select sum(expected_total) from public.order_billing_plans where order_id=o.id and status<>'cancelled'),0)>(o.snapshot->'estimate'->>'total_amount')::numeric then raise exception '請求予定の合計が受注額を超えるか、金額が0円です'; end if;
 insert into public.order_billing_plans(user_id,order_id,title,billing_date,sales_date,due_date,items,expected_total,mf_department_id)
 values(auth.uid(),o.id,p_title,p_billing,p_sales,p_due,p_items,total,p_department) returning id into pid; return pid;
end $$;
-- ロック取得後の不明な通信結果は自動再送せずreviewへ。sendingも手動照合で復旧。
create function public.update_order_plan(p_id uuid,p_action text,p_mf_id text default null,p_number text default null,p_total numeric default null,p_error text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.order_billing_plans;
begin
 select * into p from public.order_billing_plans where id=p_id and user_id=auth.uid() for update;
 if not found then raise exception '請求予定が見つかりません'; end if;
 if p_action='claim' and p.status='planned' then update public.order_billing_plans set status='sending',sync_error=null,sync_started_at=now() where id=p.id; return to_jsonb(p);
 elsif p_action='review' and p.status='sending' then update public.order_billing_plans set status='review',sync_error=p_error,mf_billing_id=p_mf_id,mf_billing_number=p_number,mf_total=p_total where id=p.id;
 elsif p_action='complete' and p.status in ('sending','review') and length(p_mf_id)>0 and p_total=p.expected_total then update public.order_billing_plans set status='created',mf_billing_id=p_mf_id,mf_billing_number=p_number,mf_total=p_total,sync_error=null,synced_at=now() where id=p.id;
 elsif p_action='reset' and p.status in ('sending','review') and p.mf_billing_id is null and p.sync_started_at < now()-interval '5 minutes' then update public.order_billing_plans set status='planned',sync_error=null where id=p.id;
 elsif p_action='cancel' and p.status='planned' then update public.order_billing_plans set status='cancelled' where id=p.id;
 else raise exception '送信済み・処理中です。MFでの作成状況を確認してください'; end if;
 return null;
end $$;
revoke all on function public.create_sales_order, public.transition_sales_order, public.create_order_plan, public.update_order_plan from public,anon;
grant execute on function public.create_sales_order, public.transition_sales_order, public.create_order_plan, public.update_order_plan to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('signed-orders','signed-orders',false,10485760,array['application/pdf']) on conflict(id) do nothing;
create policy signed_orders_read on storage.objects for select to authenticated using(bucket_id='signed-orders' and (storage.foldername(name))[1]=auth.uid()::text);
create policy signed_orders_insert on storage.objects for insert to authenticated with check(bucket_id='signed-orders' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.sales_orders o where o.id::text=(storage.foldername(name))[2] and o.user_id=auth.uid() and o.status='signing'));
commit;
