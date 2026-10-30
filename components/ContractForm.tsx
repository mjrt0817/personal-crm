"use client";

import { useMemo, useState } from "react";
import SubmitButton from "@/components/SubmitButton";
import type { Contract } from "@/lib/types";

type Options = {
  companies: Array<{id:string;name:string}>;
  projects: Array<{id:string;companyId:string;name:string}>;
};

function todayJst(){return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}

export default function ContractForm({options,contract,companyId,action}:{options:Options;contract?:Contract;companyId?:string;action:(formData:FormData)=>void|Promise<void>}){
  const initialCompany=contract?.companyId ?? companyId ?? options.companies[0]?.id ?? "";
  const [selectedCompany,setSelectedCompany]=useState(initialCompany);
  const projects=useMemo(()=>options.projects.filter(p=>p.companyId===selectedCompany),[options.projects,selectedCompany]);
  const start=contract?.startDate ?? todayJst();
  return <form action={action} className="form-card contract-form">
    {contract&&<input type="hidden" name="id" value={contract.id}/>} 
    <div className="form-section"><h2>契約基本情報</h2>
      <div className="form-grid two">
        <label className="field"><span>取引先 *</span><select name="company_id" required value={selectedCompany} onChange={(e:any)=>setSelectedCompany(e.target.value)}>{options.companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="field"><span>関連案件</span><select name="project_id" defaultValue={contract?.projectId ?? ""}><option value="">案件に紐付けない</option>{projects.map((p:{id:string;companyId:string;name:string})=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      </div>
      <label className="field"><span>契約名 *</span><input name="name" required defaultValue={contract?.name ?? "Webサイト保守・運用"} placeholder="例：コーポレートサイト保守・運用"/></label>
      <div className="form-grid three">
        <label className="field"><span>契約周期</span><select name="cycle" defaultValue={contract?.cycle ?? "monthly"}><option value="monthly">月契約</option><option value="annual">年間契約</option></select></label>
        <label className="field"><span>1期間あたり金額（税込）*</span><input type="number" min="0" step="1" name="amount" required defaultValue={contract?.amount ?? 0}/></label>
        <label className="field"><span>消費税率</span><select name="tax_rate" defaultValue={String(contract?.taxRate ?? 10)}><option value="0">0% / 対象外</option><option value="8">8%</option><option value="10">10%</option></select></label>
      </div>
      <div className="form-grid two">
        <label className="field"><span>状態</span><select name="status" defaultValue={contract?.status ?? "active"}><option value="draft">準備中</option><option value="active">契約中</option><option value="paused">一時停止</option><option value="ended">終了</option></select></label>
        <label className="field"><span>支払タイミング</span><select name="billing_timing" defaultValue={contract?.billingTiming ?? "prepaid"}><option value="prepaid">前払い（基本）</option><option value="postpaid">後払い</option></select><small>前払いでは請求書の支払期限をサービス期間開始日に初期設定します。</small></label>
      </div>
    </div>
    <div className="form-section"><h2>契約期間・次回請求</h2>
      <div className="form-grid two">
        <label className="field"><span>契約開始日 *</span><input type="date" name="start_date" required defaultValue={start}/></label>
        <label className="field"><span>契約終了日</span><input type="date" name="end_date" defaultValue={contract?.endDate}/><small>自動更新の場合は空欄で構いません。</small></label>
      </div>
      <div className="form-grid two">
        <label className="field"><span>次回サービス期間開始日 *</span><input type="date" name="next_period_start" required defaultValue={contract?.nextPeriodStart ?? start}/></label>
        <label className="field"><span>次回請求予定日 *</span><input type="date" name="next_billing_date" required defaultValue={contract?.nextBillingDate ?? start}/></label>
      </div>
      <label className="check-row"><input type="checkbox" name="auto_renew" defaultChecked={contract?.autoRenew ?? true}/><span>自動更新として管理する</span></label>
    </div>
    <div className="form-section"><h2>メモ</h2><label className="field"><textarea name="memo" rows={4} defaultValue={contract?.memo}/></label></div>
    <div className="form-actions"><a href="/contracts" className="button">キャンセル</a><SubmitButton>{contract?"更新":"契約を登録"}</SubmitButton></div>
  </form>;
}
