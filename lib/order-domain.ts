export type OrderItem = { description:string; quantity:number; unit:string|null; unit_price:number; tax_rate:number; line_subtotal?:number; tax_amount?:number };
export function todayJst(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function totalItems(items:OrderItem[]){return items.reduce((sum,i)=>{const sub=Math.round(i.quantity*i.unit_price);return sum+sub+Math.round(sub*i.tax_rate/100);},0);}
export function parseOrderItems(form:FormData):OrderItem[]{
 const names=form.getAll('item_description'), qty=form.getAll('item_quantity'), prices=form.getAll('item_price'), rates=form.getAll('item_rate'), units=form.getAll('item_unit');
 const items=names.map((n,i)=>({description:String(n).trim(),quantity:Number(qty[i]),unit:String(units[i]||'式'),unit_price:Number(prices[i]),tax_rate:Number(rates[i])})).filter(i=>i.quantity!==0);
 if(!items.length||items.some(i=>!i.description||i.description.length>450||!Number.isFinite(i.quantity)||i.quantity<=0||!Number.isInteger(i.unit_price)||i.unit_price<0||![0,8,10].includes(i.tax_rate)))throw new Error('明細・数量・単価・税率を確認してください。');
 return items;
}
export function mfPayload(plan:{id:string;title:string;billing_date:string;sales_date:string;due_date:string;mf_department_id:string;items:OrderItem[]},orderNo:string){
 const tax:Record<number,string>={0:'untaxable',8:'eight_percent_as_reduced_tax_rate',10:'ten_percent'};
 if(plan.items.some(i=>!tax[i.tax_rate])) throw new Error('MFに対応していない税率です。');
 return {department_id:plan.mf_department_id,title:plan.title,billing_date:plan.billing_date,sales_date:plan.sales_date,due_date:plan.due_date,
 memo:`PersonalCRM:${plan.id}`,note:`注文書番号：${orderNo}`,items:plan.items.map(i=>({name:i.description,quantity:i.quantity,price:i.unit_price,unit:i.unit||'式',excise:tax[i.tax_rate],is_deduct_withholding_tax:false}))};
}
export function validMfId(id:string){return /^[A-Za-z0-9_-]{1,100}$/.test(id);}
