import SubmitButton from "@/components/SubmitButton";
import type { CompanyDetail, ContractInvoiceLine, ProjectInvoice } from "@/lib/types";
import { updateContractInvoice } from "@/lib/actions";

function yen(v:number){return `${Math.round(v).toLocaleString("ja-JP")}円`;}
export default function ContractInvoiceEditForm({invoice,company,lines}:{invoice:ProjectInvoice;company:CompanyDetail;lines:ContractInvoiceLine[]}){
 const issued=Boolean(invoice.issuedSnapshotAt);
 return <form action={updateContractInvoice} className="form-card invoice-form"><input type="hidden" name="id" value={invoice.id}/>
  {issued&&<div className="notice"><strong>発行済みの請求書です。</strong><br/>明細・宛先・発行者情報は発行時点で固定されています。入金状況のみ更新できます。</div>}
  <div className="form-section"><h2>契約明細</h2><div className="table-wrap"><table><thead><tr><th>契約</th><th>対象期間</th><th>金額</th></tr></thead><tbody>{lines.map((l,i)=><tr key={l.id??i}><td>{l.contractName??l.description}</td><td>{l.servicePeriodStart??"—"} 〜 {l.servicePeriodEnd??"—"}</td><td><strong>{yen(l.amount)}</strong></td></tr>)}</tbody></table></div><div className="billing-suggestion"><div><span>合計</span><strong>{yen(invoice.amount)}</strong></div></div></div>
  <div className="form-section"><h2>請求情報</h2><div className="form-grid two"><label className="field"><span>請求名 *</span><input name="title" required disabled={issued} defaultValue={invoice.title}/></label><label className="field"><span>状態</span><select name="status" defaultValue={invoice.status}><option value="planned">未請求（予定）</option><option value="invoiced">請求済</option><option value="paid">入金済</option><option value="cancelled">取消</option></select></label></div>
  <div className="form-grid two"><label className="field"><span>請求書番号</span><input name="reference_no" disabled={issued} defaultValue={invoice.referenceNo}/></label><label className="field"><span>支払期限</span><input type="date" name="due_date" disabled={issued} defaultValue={invoice.dueDate}/></label></div>
  <div className="form-grid three"><label className="field"><span>請求予定日</span><input type="date" name="scheduled_invoice_date" disabled={issued} defaultValue={invoice.scheduledInvoiceDate}/></label><label className="field"><span>請求日</span><input type="date" name="invoice_date" disabled={issued} defaultValue={invoice.invoiceDate}/></label><label className="field"><span>入金日</span><input type="date" name="paid_date" defaultValue={invoice.paidDate}/></label></div></div>
  <div className="form-section"><h2>請求先</h2><div className="form-grid two"><label className="field"><span>宛名</span><input name="billing_name" disabled={issued} defaultValue={invoice.billingName??company.name}/></label><label className="field"><span>郵便番号</span><input name="billing_postal_code" disabled={issued} defaultValue={invoice.billingPostalCode??company.postalCode}/></label></div><label className="field"><span>住所</span><input name="billing_address" disabled={issued} defaultValue={invoice.billingAddress??company.address}/></label></div>
  <div className="form-section"><h2>管理情報</h2><label className="field"><span>メモ</span><textarea name="memo" rows={4} disabled={issued} defaultValue={invoice.memo}/></label></div>
  <div className="form-actions"><a className="button" href="/billing">キャンセル</a><SubmitButton>{issued?"入金状況を更新":"保存"}</SubmitButton></div>
 </form>
}
