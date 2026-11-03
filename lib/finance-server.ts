import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
export async function financeClient() {
 const db=await createClient();
 const {data,error}=await db.auth.getClaims();
 if(error||!data?.claims?.sub) redirect('/login');
 const allowed=(process.env.ALLOWED_EMAILS??'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 const email=typeof data.claims.email==='string'?data.claims.email.toLowerCase():'';
 if(allowed.length&&!allowed.includes(email)) redirect('/login');
 return {db,userId:data.claims.sub};
}
export async function financeRows(table:'expenses'|'finance_entries'|'expense_receipts') {
 const {db,userId}=await financeClient();
 const rows=[];
 for(let offset=0;offset<100000;offset+=500){
  const {data,error}=await db.from(table).select('*').eq('user_id',userId).order('id').range(offset,offset+499);
  if(error) throw new Error('経理データを取得できません。SQL 018の適用と接続を確認してください。');
  rows.push(...(data??[])); if((data??[]).length<500)return rows;
 }
 throw new Error('件数上限を超えています。');
}
