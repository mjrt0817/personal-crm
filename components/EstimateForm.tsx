"use client";

import { useMemo, useState } from "react";
import SubmitButton from "@/components/SubmitButton";
import EstimatePartyFields from "@/components/EstimatePartyFields";
import type { Estimate, EstimateFormOptions, EstimateSettings } from "@/lib/types";

const statuses = [
  ["draft","下書き"],["sent","送付済"],["accepted","採用"],["rejected","不採用"],["expired","期限切れ"]
] as const;

type EditableItem = { key:string; description:string; quantity:number; unit:string; unitPrice:number; taxRate:number };

function todayJst() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone:"Asia/Tokyo", year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date());
}
function addDays(date:string, days:number) {
  const d = new Date(`${date}T00:00:00+09:00`);
  d.setUTCDate(d.getUTCDate()+days);
  return new Intl.DateTimeFormat("sv-SE", { timeZone:"Asia/Tokyo", year:"numeric", month:"2-digit", day:"2-digit" }).format(d);
}
function makeKey(){ return Math.random().toString(36).slice(2); }

export default function EstimateForm({
  estimate,
  options,
  settings,
  action,
  defaultProjectId
}: {
  estimate?: Estimate;
  options: EstimateFormOptions;
  settings: EstimateSettings;
  action: (formData: FormData) => void | Promise<void>;
  defaultProjectId?: string;
}) {
  const initialDate = estimate?.issueDate ?? todayJst();
  const defaultProject = !estimate && defaultProjectId ? options.projects.find((x)=>x.id===defaultProjectId) : undefined;
  const initialCompanyId = estimate?.companyId ?? defaultProject?.companyId ?? "";
  const initialCompany = options.companies.find((x)=>x.id===initialCompanyId);
  const [issueDate, setIssueDate] = useState(initialDate);
  const [validUntil, setValidUntil] = useState(estimate?.validUntil ?? addDays(initialDate, settings.defaultEstimateValidDays));
  const [billingName, setBillingName] = useState(estimate?.billingName ?? initialCompany?.name ?? "");
  const [billingPostalCode, setBillingPostalCode] = useState(estimate?.billingPostalCode ?? initialCompany?.postalCode ?? "");
  const [billingAddress, setBillingAddress] = useState(estimate?.billingAddress ?? initialCompany?.address ?? "");
  const [items, setItems] = useState<EditableItem[]>(() => estimate?.items.length ? estimate.items.map((x) => ({key:x.id ?? makeKey(),description:x.description,quantity:x.quantity,unit:x.unit ?? "式",unitPrice:x.unitPrice,taxRate:x.taxRate})) : [{key:makeKey(),description:"",quantity:1,unit:"式",unitPrice:0,taxRate:10}]);

  const totals = useMemo(() => items.reduce((acc,item) => {
    const line = Math.round(Math.max(0,item.quantity) * Math.max(0,item.unitPrice));
    const tax = Math.round(line * Math.max(0,item.taxRate) / 100);
    acc.subtotal += line; acc.tax += tax; return acc;
  }, {subtotal:0,tax:0}), [items]);

  function updateItem(key:string, patch:Partial<EditableItem>) { setItems((prev)=>prev.map((x)=>x.key===key?{...x,...patch}:x)); }
  function removeItem(key:string) { setItems((prev)=>prev.length<=1?prev:prev.filter((x)=>x.key!==key)); }
  function onCompanyChange(companyId:string) {
    const company=options.companies.find((x)=>x.id===companyId);
    if (!company) return;
    if (!estimate || estimate.companyId !== companyId) {
      setBillingName(company.name);
      setBillingPostalCode(company.postalCode ?? "");
      setBillingAddress(company.address ?? "");
    }
  }

  return <form action={action} className="form-card form-padded estimate-form">
    {estimate && <input type="hidden" name="id" value={estimate.id}/>} 
    <div className="form-section">
      <h2>見積基本情報</h2>
      {estimate && <div className="estimate-reference-box"><span>見積番号</span><strong>{estimate.estimateNo}</strong></div>}
      <div className="form-grid two">
        <label className="field"><span>見積名 *</span><input name="title" required defaultValue={estimate?.title}/><small>例：DXコンシェルジュ支援、Webサイト改修</small></label>
        <label className="field"><span>状態</span><select name="status" defaultValue={estimate?.status ?? "draft"}>{statuses.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
        <EstimatePartyFields options={options} companyId={initialCompanyId} contactId={estimate?.contactId} projectId={estimate?.projectId ?? defaultProjectId} onCompanyChange={onCompanyChange}/>
      </div>
      <div className="form-grid three">
        <label className="field"><span>見積日</span><input type="date" name="issue_date" value={issueDate} onChange={(e)=>{setIssueDate(e.target.value); if(!estimate) setValidUntil(addDays(e.target.value, settings.defaultEstimateValidDays));}}/></label>
        <label className="field"><span>有効期限</span><input type="date" name="valid_until" value={validUntil} onChange={(e)=>setValidUntil(e.target.value)}/></label>
        <label className="field"><span>採用日</span><input type="date" name="accepted_date" defaultValue={estimate?.acceptedDate}/><small>採用操作時は未入力なら当日</small></label>
      </div>
    </div>

    <div className="form-section">
      <div className="estimate-section-head"><div><h2>明細</h2><p className="small muted">数量 × 単価で計算します。DX支援なら 3回 × 41,000円 のように登録できます。</p></div><button type="button" className="button soft" onClick={()=>setItems((prev)=>[...prev,{key:makeKey(),description:"",quantity:1,unit:"式",unitPrice:0,taxRate:10}])}>＋ 明細追加</button></div>
      <div className="estimate-items">
        {items.map((item,index)=>{
          const line=Math.round(item.quantity*item.unitPrice); const tax=Math.round(line*item.taxRate/100);
          return <div className="estimate-item-row" key={item.key}>
            <div className="estimate-item-number">{index+1}</div>
            <label className="field estimate-item-desc"><span>品目・内容</span><input name="item_description" required value={item.description} onChange={(e)=>updateItem(item.key,{description:e.target.value})}/></label>
            <label className="field"><span>数量</span><input name="item_quantity" type="number" min="0" step="0.01" value={item.quantity} onChange={(e)=>updateItem(item.key,{quantity:Number(e.target.value||0)})}/></label>
            <label className="field"><span>単位</span><input name="item_unit" value={item.unit} onChange={(e)=>updateItem(item.key,{unit:e.target.value})} placeholder="回 / 式 / 時間"/></label>
            <label className="field"><span>単価</span><input name="item_unit_price" type="number" min="0" step="1" value={item.unitPrice} onChange={(e)=>updateItem(item.key,{unitPrice:Number(e.target.value||0)})}/></label>
            <label className="field"><span>税率</span><select name="item_tax_rate" value={String(item.taxRate)} onChange={(e)=>updateItem(item.key,{taxRate:Number(e.target.value)})}><option value="0">0%</option><option value="8">8%</option><option value="10">10%</option></select></label>
            <div className="estimate-item-amount"><span>金額</span><strong>{line.toLocaleString("ja-JP")}円</strong><small>税 {tax.toLocaleString("ja-JP")}円</small></div>
            <button type="button" className="icon-button" title="明細削除" disabled={items.length<=1} onClick={()=>removeItem(item.key)}>×</button>
          </div>;
        })}
      </div>
      <div className="estimate-form-totals"><div><span>小計</span><strong>{totals.subtotal.toLocaleString("ja-JP")}円</strong></div><div><span>消費税</span><strong>{totals.tax.toLocaleString("ja-JP")}円</strong></div><div className="grand"><span>合計</span><strong>{(totals.subtotal+totals.tax).toLocaleString("ja-JP")}円</strong></div></div>
    </div>

    <div className="form-section">
      <h2>見積先</h2>
      <div className="form-grid two"><label className="field"><span>宛名</span><input name="billing_name" value={billingName} onChange={(e)=>setBillingName(e.target.value)}/></label><label className="field"><span>郵便番号</span><input name="billing_postal_code" value={billingPostalCode} onChange={(e)=>setBillingPostalCode(e.target.value)}/></label></div>
      <label className="field"><span>住所</span><input name="billing_address" value={billingAddress} onChange={(e)=>setBillingAddress(e.target.value)}/></label>
    </div>

    <div className="form-section">
      <h2>条件・備考</h2>
      <label className="field"><span>見積条件</span><textarea name="terms" rows={4} defaultValue={estimate?.terms ?? settings.estimateNote} placeholder="納期、支払条件、見積範囲など"/></label>
      <label className="field"><span>社内メモ</span><textarea name="memo" rows={4} defaultValue={estimate?.memo}/><small>見積書には表示しません。</small></label>
    </div>
    <div className="form-actions"><a href={estimate?`/estimates/${estimate.id}`:"/estimates"} className="button">キャンセル</a><SubmitButton>保存</SubmitButton></div>
  </form>;
}
