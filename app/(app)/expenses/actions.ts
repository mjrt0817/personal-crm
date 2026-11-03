'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createHash } from 'node:crypto';
import { financeClient } from '@/lib/finance-server';
import { accounts, validAmount, validDate } from '@/lib/finance';
import { getGoogleProviderAccessToken } from '@/lib/google-calendar-server';

function field(f:FormData,k:string){return String(f.get(k)??'').trim();}
async function execute(work:(context:Awaited<ReturnType<typeof financeClient>>)=>Promise<void>){
 const context=await financeClient();
 let error='';
 try{await work(context);}catch(e){error=e instanceof Error?e.message:'保存できませんでした';}
 revalidatePath('/expenses'); revalidatePath('/finance');
 redirect(`/expenses${error?'?error='+encodeURIComponent(error):'?saved=1'}`);
}
export async function addExpense(f:FormData){
 await execute(async({db,userId})=>{
  const expense_date=field(f,'date'), vendor=field(f,'vendor'),category=field(f,'category'),settlement=field(f,'settlement'),memo=field(f,'memo'),amount=Number(field(f,'amount'));
  if(!validDate(expense_date)||!validAmount(amount)||!vendor||vendor.length>200||memo.length>2000||!['GWS','ChatGPT','ドメイン','サーバー','その他'].includes(category)||!['cash','payable','owner'].includes(settlement))throw new Error('入力内容を確認してください。金額は円の正整数です。');
  const {error}=await db.from('expenses').insert({user_id:userId,expense_date,vendor,category,settlement,memo,amount});
  if(error)throw new Error('保存に失敗しました。SQL 018の適用と接続を確認してください。');
 });
}
export async function addEntry(f:FormData){
 await execute(async({db,userId})=>{
  const entry_date=field(f,'date'),debit=field(f,'debit'),credit=field(f,'credit'),amount=Number(field(f,'amount')),memo=field(f,'memo');
  if(!validDate(entry_date)||!validAmount(amount)||!Object.hasOwn(accounts,debit)||!Object.hasOwn(accounts,credit)||debit===credit||!memo||memo.length>2000)throw new Error('仕訳の入力内容を確認してください。');
  const {error}=await db.from('finance_entries').insert({user_id:userId,entry_date,debit,credit,amount,memo});
  if(error)throw new Error('仕訳を保存できませんでした。');
 });
}
export async function uploadReceipt(f:FormData){
 await execute(async({db,userId})=>{
  const id=field(f,'expense_id'),source=field(f,'source'),file=f.get('file');
  if(!['electronic','paper_scan'].includes(source)||!(file instanceof File)||file.size===0||file.size>3*1024*1024||!['application/pdf','image/jpeg','image/png'].includes(file.type))throw new Error('PDF/JPEG/PNG（3MB以下）を選択してください。');
  const {data:expense,error}=await db.from('expenses').select('id,expense_date,vendor,amount').eq('id',id).eq('user_id',userId).single();
  if(error||!expense)throw new Error('経費が見つかりません。');
  const bytes=Buffer.from(await file.arrayBuffer());
  const valid=file.type==='application/pdf'?bytes.subarray(0,5).toString()==='%PDF-':file.type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  if(!valid)throw new Error('ファイル形式と内容が一致しません。');
  const token=await getGoogleProviderAccessToken(db,userId);
  if(!token)throw new Error('設定からGoogle Workspaceを再接続してください。');
  const sha256=createHash('sha256').update(bytes).digest('hex');
  const name=`${expense.expense_date}_${expense.amount}_${expense.vendor}_${id}_${sha256.slice(0,12)}.${file.type==='application/pdf'?'pdf':file.type==='image/png'?'png':'jpg'}`;
  const boundary='crm-'+crypto.randomUUID();
  const body=Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({name,description:'Personal CRM receipt. Keep original data.'})}\r\n--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`),bytes,Buffer.from(`\r\n--${boundary}--\r\n`)]);
  const result=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':`multipart/related; boundary=${boundary}`},body,signal:AbortSignal.timeout(45000)});
  const json=await result.json();
  if(!result.ok||typeof json.id!=='string')throw new Error('Drive保存に失敗しました。drive.file権限でGoogleを再接続し、Driveの容量も確認してください。タイムアウト時は再送前にDriveを確認してください。');
  const {error:saveError}=await db.from('expense_receipts').insert({user_id:userId,expense_id:id,drive_file_id:json.id,original_name:file.name.slice(0,255),sha256,source});
  if(saveError)throw new Error(`Drive保存済みですがCRMとの関連付けに失敗しました。再送せずDriveファイルIDを控えてください: ${json.id}`);
 });
}
