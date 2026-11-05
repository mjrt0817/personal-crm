import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {mfPayload,parseOrderItems,totalItems} from '../lib/order-domain';

test('MF payload preserves quantities/tax and correlation; rejects invalid form',()=>{
 const items=[{description:'制作費',quantity:1,unit:'式',unit_price:100000,tax_rate:10}];
 assert.equal(totalItems(items),110000);const p=mfPayload({id:'plan1',title:'着手金',items,billing_date:'2026-11-04',sales_date:'2027-01-01',due_date:'2026-11-30',mf_department_id:'dept'},'ORD-1');
 assert.equal(p.items[0].price,100000);assert.equal(p.items[0].excise,'ten_percent');assert.equal(p.memo,'PersonalCRM:plan1');assert.equal(p.sales_date,'2027-01-01');
 const f=new FormData();f.set('item_description','制作');f.set('item_quantity','NaN');f.set('item_price','10');f.set('item_rate','10');assert.throws(()=>parseOrderItems(f));
});

test('PostgreSQL: frozen orders, signature gate, split cap, isolation, duplicate-send guard',async()=>{
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.user_id',true),'')::uuid $$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name,'/') $$;
 grant usage on schema public,auth,storage to authenticated;
 grant select,insert on storage.objects to authenticated;`);
 const schema=readFileSync('supabase/schema.sql','utf8').replace('create extension if not exists pgcrypto;','');
 await db.exec(schema);
 await db.exec(readFileSync('supabase/migrations/018_orders_and_moneyforward.sql','utf8'));
 const u='11111111-1111-1111-1111-111111111111',other='22222222-2222-2222-2222-222222222222',c='33333333-3333-3333-3333-333333333333',e='44444444-4444-4444-4444-444444444444';
 await db.exec(`insert into auth.users values('${u}'),('${other}'); insert into companies(id,user_id,name) values('${c}','${u}','顧客');
 insert into invoice_settings(user_id,issuer_name,issuer_trade_name) values('${u}','アカンパニー','アカンパニー');
 insert into estimates(id,user_id,company_id,estimate_no,title,status,subtotal,tax_amount,total_amount) values('${e}','${u}','${c}','EST-1','制作','sent',100000,10000,110000);
 insert into estimate_items(user_id,estimate_id,description,quantity,unit_price,tax_rate,line_subtotal,tax_amount) values('${u}','${e}','制作',1,100000,10,100000,10000);
 set role authenticated; set app.user_id='${u}';`);
 async function scalar(sql:string,params:unknown[]=[]){return (await db.query<Record<string,unknown>>(sql,params)).rows[0]?.id as string;}
 const oid=await scalar(`select create_sales_order($1,current_date,'サーバー','翌月末払い','納品7日以内') id`,[e]);assert.ok(oid);
 await assert.rejects(db.query(`select create_sales_order($1,current_date,'場所','条件','条件')`,[e]),/unique|duplicate/);
 await assert.rejects(db.query('update estimates set total_amount=1 where id=$1',[e]),/注文書/);
 await assert.rejects(db.query('update estimate_items set quantity=2 where estimate_id=$1',[e]),/注文書/);
 await assert.rejects(db.query('insert into estimate_items(user_id,estimate_id,description) values($1,$2,\'追加\')',[u,e]),/注文書/);
 const item=JSON.stringify([{description:'着手金',quantity:1,unit:'式',unit_price:50000,tax_rate:10}]);
 async function plan(items=item){return scalar(`select create_order_plan($1,'請求',current_date,current_date,current_date,$2::jsonb,'dept') id`,[oid,items]);}
 await assert.rejects(plan(),/受注確定/);
 await assert.rejects(db.query(`select transition_sales_order($1,'confirm')`,[oid]),/状態/);
 await db.query(`select transition_sales_order($1,'signing')`,[oid]);
 await assert.rejects(db.query(`select transition_sales_order($1,'confirm',null,null,current_date)`,[oid]),/PDF/);
 const path=`${u}/${oid}/signed.pdf`;
 await db.query(`insert into storage.objects(bucket_id,name) values('signed-orders',$1)`,[path]);
 await db.query(`select transition_sales_order($1,'confirm',$2,$3,current_date,'締結1')`,[oid,path,'a'.repeat(64)]);
 const confirmed=(await db.query<{project_id:string;status:string}>('select project_id,status from sales_orders where id=$1',[oid])).rows[0];assert.equal(confirmed.status,'confirmed');assert.ok(confirmed.project_id);
 await assert.rejects(db.query(`select transition_sales_order($1,'cancel')`,[oid]),/状態/);
 const p1=await plan(),p2=await plan();assert.ok(p1&&p2);await assert.rejects(plan(),/超える/);
 await db.query(`select update_order_plan($1,'claim')`,[p1]);await assert.rejects(db.query(`select update_order_plan($1,'claim')`,[p1]),/送信済み/);
 await db.query(`select update_order_plan($1,'review',null,null,null,'通信結果不明')`,[p1]);await assert.rejects(db.query(`select update_order_plan($1,'claim')`,[p1]),/送信済み/);
 await assert.rejects(db.query(`select update_order_plan($1,'complete','mf1','INV-1',1)`,[p1]),/送信済み/);
 await db.query(`select update_order_plan($1,'complete','mf1','INV-1',55000)`,[p1]);
 await assert.rejects(db.query(`select update_order_plan($1,'reset')`,[p1]),/送信済み/);
 await db.query(`select update_order_plan($1,'cancel')`,[p2]);assert.ok(await plan());
 await db.exec(`set app.user_id='${other}'`);assert.equal((await db.query('select * from sales_orders')).rows.length,0);assert.equal((await db.query('select * from order_billing_plans')).rows.length,0);assert.equal((await db.query('select * from storage.objects')).rows.length,0);
 await assert.rejects(db.query(`select transition_sales_order($1,'cancel')`,[oid]),/見つかりません/);
 await assert.rejects(db.query(`select update_order_plan($1,'claim')`,[p1]),/見つかりません/);
 await assert.rejects(db.query(`update sales_orders set status='confirmed' where id=$1`,[oid]),/permission/);
 await db.close();
});
