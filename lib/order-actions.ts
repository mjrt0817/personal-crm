'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createHash,randomUUID } from 'node:crypto';
import { getOrder,orderSession } from './orders';
import { parseOrderItems,mfPayload,validMfId,todayJst } from './order-domain';
import { readConditions,validateChecks } from './order-templates';
import { mfAccess,mfRequest,mfDepartments } from './moneyforward';
function value(f:FormData,k:string){return String(f.get(k)||'').trim();}
function changed(id:string){revalidatePath('/orders');revalidatePath(`/orders/${id}`);revalidatePath('/projects');revalidatePath('/pipeline');revalidatePath('/billing');}
async function runRpc(name:string,args:Record<string,unknown>){const {db}=await orderSession();const {data,error}=await db.rpc(name,args);if(error)throw new Error(error.message);return data;}
export async function createSalesOrder(f:FormData){
 if(f.get('conditions_checked')!=='on')throw new Error('注文条件と確認項目を確認してください。');
 const id=await runRpc('create_sales_order_with_conditions',{p_estimate:value(f,'estimate_id'),p_delivery:value(f,'delivery_date'),p_place:value(f,'delivery_place'),p_payment:value(f,'payment_terms'),p_inspection:value(f,'inspection_terms'),p_conditions:readConditions(f)});changed(id);revalidatePath(`/estimates/${value(f,'estimate_id')}`);redirect(`/orders/${id}`);
}
export async function startSigning(f:FormData){const id=value(f,'id');if(f.get('sent_confirmed')!=='on')throw new Error('締結ぱっとで署名依頼を送付したことを確認してください。');await runRpc('transition_sales_order',{p_id:id,p_action:'signing'});changed(id);}
export async function cancelSalesOrder(f:FormData){const id=value(f,'id');await runRpc('transition_sales_order',{p_id:id,p_action:'cancel'});changed(id);}
export async function confirmSalesOrder(f:FormData){
 const id=value(f,'id'),date=value(f,'signed_at');if(f.get('signature_checked')!=='on')throw new Error('署名内容の確認が必要です。');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>todayJst())throw new Error('締結日を確認してください。');
 const order=await getOrder(id);if(!order||order.status!=='signing')throw new Error('署名依頼済みの注文書を選んでください。');
 const file=f.get('signed_pdf');if(!(file instanceof File)||file.size<5||file.size>4*1024*1024)throw new Error('署名済みPDF（4MB以下）を選択してください。');const bytes=Buffer.from(await file.arrayBuffer());if(bytes.subarray(0,5).toString()!=='%PDF-')throw new Error('PDF形式のファイルを選択してください。');
 const {db,userId}=await orderSession();const path=`${userId}/${id}/${randomUUID()}.pdf`;const {error}=await db.storage.from('signed-orders').upload(path,bytes,{contentType:'application/pdf',upsert:false});if(error)throw new Error('署名済みPDFを保存できませんでした。');
 await runRpc('transition_sales_order',{p_id:id,p_action:'confirm',p_path:path,p_hash:createHash('sha256').update(bytes).digest('hex'),p_date:date,p_reference:value(f,'signature_reference')});changed(id);
}
export async function createOrderPlan(f:FormData){
 const id=value(f,'order_id'),dept=value(f,'mf_department_id');if(!validMfId(dept))throw new Error('MF取引先を選択してください。');
 // MFに実在する部署を明示選択し、同名顧客の誤結合を防ぐ。
 if(!(await mfDepartments()).some(d=>d.id===dept))throw new Error('MF取引先を再選択してください。');
 await runRpc('create_order_plan',{p_order:id,p_title:value(f,'title'),p_billing:value(f,'billing_date'),p_sales:value(f,'sales_date'),p_due:value(f,'due_date'),p_items:parseOrderItems(f),p_department:dept});changed(id);
}
export async function cancelOrderPlan(f:FormData){await runRpc('update_order_plan',{p_id:value(f,'plan_id'),p_action:'cancel'});changed(value(f,'order_id'));}
export async function sendOrderPlan(f:FormData){
 const {db}=await orderSession(),id=value(f,'plan_id');const {data:check,error:ce}=await db.from('order_billing_plans').select('*').eq('id',id).single();if(ce)throw new Error(ce.message);const order=await getOrder(check.order_id);if(!order||order.status!=='confirmed')throw new Error('受注確定が必要です。');if(f.get('create_confirmed')!=='on')throw new Error('MFへの請求書作成を確認してください。');
 const token=await mfAccess(); // 認証失敗時は送信ロックを取得しない
 const payload=mfPayload(check,order.order_no);
 const plan=await runRpc('update_order_plan',{p_id:id,p_action:'claim'});
 let result:{id?:string;billing_number?:string;total_price?:string|number}|undefined;
 try{
 result=await mfRequest('/invoice_template_billings','POST',payload,token);
 if(!result?.id)throw new Error('MFの作成結果を取得できませんでした。');
 const total=Number(result.total_price);
 if(!Number.isFinite(total)||total!==Number(plan.expected_total))throw new Error('MFの計算額と受注由来の請求額が一致しません。MFで丸め・源泉徴収・税設定を確認してください。');
 await runRpc('update_order_plan',{p_id:id,p_action:'complete',p_mf_id:result.id,p_number:result.billing_number||null,p_total:total});
 }catch(e){
 // タイムアウト時にもPOSTを再実行しない。MF側に作成されている可能性がある。
 const msg=e instanceof Error?e.message:'MF連携に失敗しました。';
 await runRpc('update_order_plan',{p_id:id,p_action:'review',p_mf_id:result?.id||null,p_number:result?.billing_number||null,p_total:result?.total_price!==undefined?Number(result.total_price):null,p_error:msg});
 }
 changed(check.order_id);
}
export async function reconcileOrderPlan(f:FormData){
 const id=value(f,'plan_id'),mfId=value(f,'mf_billing_id');if(!validMfId(mfId))throw new Error('MF請求書IDを確認してください。');const {db}=await orderSession();const {data:p,error}=await db.from('order_billing_plans').select('*').eq('id',id).single();if(error)throw new Error(error.message);
 const bill=await mfRequest(`/billings/${mfId}`);
 if(bill.memo!==`PersonalCRM:${id}`||bill.department_id!==p.mf_department_id||bill.billing_date!==p.billing_date||bill.due_date!==p.due_date||Number(bill.total_price)!==Number(p.expected_total))throw new Error('照合条件が一致しません。MFのメモ・取引先・日付・金額を確認してください。');
 await runRpc('update_order_plan',{p_id:id,p_action:'complete',p_mf_id:mfId,p_number:bill.billing_number||null,p_total:Number(bill.total_price)});changed(p.order_id);
}
export async function resetOrderPlan(f:FormData){if(f.get('absence_confirmed')!=='on')throw new Error('MFに請求書が作成されていないことを確認してください。');await runRpc('update_order_plan',{p_id:value(f,'plan_id'),p_action:'reset'});changed(value(f,'order_id'));}
export async function disconnectMf(){const {db,userId}=await orderSession();const {error}=await db.from('mf_connections').delete().eq('user_id',userId);if(error)throw new Error(error.message);revalidatePath('/settings');}

export async function startAcceptance(f:FormData){
 const id=value(f,'order_id');let checks=null;
 if(value(f,'checklist_json')){if(f.get('legacy_confirmed')!=='on')throw new Error('既存注文書の条件を変更しないことを確認してください。');checks=validateChecks(JSON.parse(value(f,'checklist_json')),true);}
 await runRpc('start_order_acceptance',{p_order:id,p_items:checks});changed(id);revalidatePath(`/orders/${id}/acceptance`);redirect(`/orders/${id}/acceptance`);
}
export async function saveAcceptance(f:FormData){
 const id=value(f,'order_id');const complete=f.get('complete')==='yes';if(complete&&f.get('approval_checked')!=='on')throw new Error('顧客の明示的な承認を確認してください。');
 let raw:unknown;try{raw=JSON.parse(value(f,'items_json'));}catch{throw new Error('チェック結果を確認してください。');}
 await runRpc('save_order_acceptance',{p_order:id,p_revision:Number(value(f,'revision')),p_items:validateChecks(raw),p_requested:value(f,'requested_date')||null,p_published:value(f,'published_date')||null,p_complete:complete,p_date:value(f,'completed_date')||null,p_approver:value(f,'approved_by'),p_evidence:value(f,'approval_evidence'),p_notes:value(f,'notes')});changed(id);revalidatePath(`/orders/${id}/acceptance`);revalidatePath(`/acceptance-documents/${id}`);redirect(`/orders/${id}/acceptance?saved=1`);
}
