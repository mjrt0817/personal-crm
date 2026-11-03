import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('SQL applies; owner isolation, foreign key ownership, constraints and append-only access',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth,public to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
 await db.exec(await readFile(new URL('../supabase/migrations/018_expenses.sql',import.meta.url),'utf8'));
 const a='11111111-1111-1111-1111-111111111111',b='22222222-2222-2222-2222-222222222222';
 await db.query('insert into auth.users values ($1),($2)',[a,b]);
 const user=async(id)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');};
 await user(a);
 const {rows:[row]}=await db.query(`insert into public.expenses(user_id,expense_date,vendor,category,amount,settlement) values ($1,'2026-01-01','Google','GWS',1000,'cash') returning id`,[a]);
 await assert.rejects(db.query(`insert into public.expenses(user_id,expense_date,vendor,category,amount,settlement) values ($1,'2026-01-01','Google','GWS',1000,'cash')`,[b]));
 await assert.rejects(db.exec('update public.expenses set amount=2000'));
 await assert.rejects(db.exec('delete from public.expenses'));
 await assert.rejects(db.query(`insert into public.finance_entries(user_id,entry_date,debit,credit,amount,memo) values ($1,'2026-01-01','cash','cash',100,'bad')`,[a]));
 await user(b);
 assert.equal((await db.exec('select * from public.expenses'))[0].rows.length,0);
 await assert.rejects(db.query(`insert into public.expense_receipts(user_id,expense_id,drive_file_id,original_name,sha256,source) values ($1,$2,'abc','receipt.pdf',$3,'electronic')`,[b,row.id,'a'.repeat(64)]));
 await user(a);
 await db.query(`insert into public.expense_receipts(user_id,expense_id,drive_file_id,original_name,sha256,source) values ($1,$2,'abc','receipt.pdf',$3,'electronic')`,[a,row.id,'a'.repeat(64)]);
 await user(b); assert.equal((await db.exec('select * from public.expense_receipts'))[0].rows.length,0);
 await db.exec('reset role; set role anon'); await assert.rejects(db.exec('select * from public.expenses'));
 }finally{await db.close();}
});
