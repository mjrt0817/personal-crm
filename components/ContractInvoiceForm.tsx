import SubmitButton from "@/components/SubmitButton";
import type { CompanyDetail, Contract } from "@/lib/types";
import { createContractInvoice } from "@/lib/actions";

function yen(v:number){return `${Math.round(v).toLocaleString("ja-JP")}円`;}
function todayJst(){return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}

export default function ContractInvoiceForm({company,contracts}:{company:CompanyDetail;contracts:Contract[]}){
  const today=todayJst();
  const dueIds=new Set(contracts.filter(c=>c.nextBillingDate<=today).map(c=>c.id));
  const firstBilling=[...contracts.map(c=>c.nextBillingDate)].sort()[0]??today;
  const defaultTitle=`${firstBilling.slice(0,7).replace("-","年")}月 保守・運用費`;
  return <form action={createContractInvoice} className="form-card">
    <input type="hidden" name="company_id" value={company.id}/>
    <div className="form-section"><h2>請求する契約</h2><p className="muted">同じ取引先の契約を複数選択すると、1枚の請求書に明細行としてまとめます。</p>
      <div className="contract-check-list">{contracts.map(c=><label className="contract-check-row" key={c.id}><input type="checkbox" name="contract_id" value={c.id} defaultChecked={dueIds.has(c.id)}/><div className="grow"><strong>{c.name}</strong><div className="small muted">{c.cycle==="annual"?"年間契約":"月契約"} ・ 次回期間 {c.nextPeriodStart} ・ 次回請求 {c.nextBillingDate}</div></div><strong>{yen(c.amount)}</strong></label>)}</div>
    </div>
    <div className="form-section"><h2>請求書情報</h2>
      <label className="field"><span>請求名</span><input name="title" defaultValue={defaultTitle}/></label>
      <div className="form-grid two"><label className="field"><span>宛名</span><input name="billing_name" defaultValue={company.name}/></label><label className="field"><span>郵便番号</span><input name="billing_postal_code" defaultValue={company.postalCode}/></label></div>
      <label className="field"><span>住所</span><input name="billing_address" defaultValue={company.address}/></label>
      <label className="field"><span>メモ</span><textarea name="memo" rows={3}/></label>
    </div>
    <div className="notice">契約ごとのサービス期間と金額を明細として保存します。前払い契約の支払期限はサービス期間開始日を基準に初期設定します。</div>
    <div className="form-actions"><a className="button" href="/contracts">キャンセル</a><SubmitButton>まとめて請求予定を作る</SubmitButton></div>
  </form>;
}
