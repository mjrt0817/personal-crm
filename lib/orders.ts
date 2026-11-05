import 'server-only';
import { demoOrders } from './order-demo';
import { createClient } from '@/lib/supabase/server';
const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
import type { InvoicePartySnapshot } from '@/lib/types';
import type { OrderItem } from './order-domain';
export type SalesOrder = {
 id:string;user_id:string;estimate_id:string;company_id:string;project_id:string|null;order_no:string;status:'created'|'signing'|'confirmed'|'cancelled';
 snapshot:{estimate:{title:string;estimate_no:string;total_amount:number;subtotal:number;tax_amount:number;terms?:string};issuer:InvoicePartySnapshot;customer:InvoicePartySnapshot;items:OrderItem[]};
 delivery_date:string;delivery_place:string;payment_terms:string;inspection_terms:string;signed_path:string|null;signed_at:string|null;signed_sha256:string|null;signature_reference:string|null;created_at:string;
};
export type BillingPlan={id:string;order_id:string;title:string;billing_date:string;sales_date:string;due_date:string;items:OrderItem[];expected_total:number;status:string;mf_department_id:string;mf_billing_id:string|null;mf_billing_number:string|null;mf_total:number|null;sync_error:string|null;sync_started_at:string|null;can_reset?:boolean};
export async function orderSession(){
 if(demoMode) throw new Error('デモでは保存できません。Supabaseを設定してください。');
 const db=await createClient();const {data,error}=await db.auth.getUser();if(error||!data.user)throw new Error('ログインが必要です。');return {db,userId:data.user.id};
}
export async function getOrders():Promise<SalesOrder[]>{
 if(demoMode)return demoOrders;const {db}=await orderSession();const {data,error}=await db.from('sales_orders').select('*').order('created_at',{ascending:false});
 if(error){if(['42P01','PGRST205'].includes(error.code))return [];throw new Error(error.message);}return data as SalesOrder[];
}
export async function getOrder(id:string):Promise<SalesOrder|null>{if(demoMode)return demoOrders.find(o=>o.id===id)??null;const {db}=await orderSession();const {data,error}=await db.from('sales_orders').select('*').eq('id',id).maybeSingle();if(error)throw new Error(error.message);return data as SalesOrder|null;}
export async function getPlans(id:string):Promise<BillingPlan[]>{if(demoMode)return [];const {db}=await orderSession();const {data,error}=await db.from('order_billing_plans').select('*').eq('order_id',id).order('billing_date');if(error)throw new Error(error.message);const now=Date.now();return (data as BillingPlan[]).map(p=>({...p,can_reset:Boolean(p.sync_started_at&&now-new Date(p.sync_started_at).getTime()>300000)}));}
export async function getEstimateOrders(id:string){if(demoMode)return [];const {db}=await orderSession();const {data,error}=await db.from('sales_orders').select('id,order_no,status').eq('estimate_id',id).order('created_at',{ascending:false});if(error){if(['42P01','PGRST205'].includes(error.code))return [];throw new Error(error.message);}return data as {id:string;order_no:string;status:string}[];}
export const orderLabels={created:'注文書作成済み',signing:'署名依頼済み',confirmed:'受注確定',cancelled:'取消'};
export async function getAllOrderPlans(projectId?:string){
 const orders=(await getOrders()).filter(o=>!projectId||o.project_id===projectId);if(!orders.length||demoMode)return {orders,plans:[] as BillingPlan[]};const {db}=await orderSession();const {data,error}=await db.from('order_billing_plans').select('*').in('order_id',orders.map(o=>o.id)).order('billing_date');if(error)throw new Error(error.message);return {orders,plans:data as BillingPlan[]};
}
