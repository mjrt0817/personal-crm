import Link from "next/link";
import { notFound } from "next/navigation";
import BillingStatusBadge from "@/components/BillingStatusBadge";
import MetricCard from "@/components/MetricCard";
import { advanceInvoiceStatus, cancelProjectInvoice } from "@/lib/actions";
import { getProjectBase, getProjectBillingSummary } from "@/lib/data";

function yen(v:number){ return `${Math.round(v).toLocaleString("ja-JP")}円`; }

export default async function ProjectBillingPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const [project, billing] = await Promise.all([getProjectBase(id), getProjectBillingSummary(id)]);
  if(!project) notFound();

  return <>
    <div className="page-head">
      <div><div className="small muted"><Link href={`/projects/${id}`}>← {project.name}</Link></div><h1>請求・入金</h1><p className="muted">{project.companyName} / 案件売上から請求・入金まで管理します。</p></div>
      <Link href={`/projects/${id}/billing/new`} className="button primary">＋ 請求予定を追加</Link>
    </div>

    <div className="grid-4 billing-kpis">
      <MetricCard label="案件予定売上" value={yen(billing.projectRevenue)} note="受注・予定額"/>
      <MetricCard label="請求前" value={yen(billing.plannedAmount + billing.suggestedAmount)} note={`予定登録 ${yen(billing.plannedAmount)} / 未割当 ${yen(billing.suggestedAmount)}`}/>
      <MetricCard label="請求済累計" value={yen(billing.issuedAmount)} note={`未入金 ${yen(billing.outstandingAmount)}${billing.overdueCount ? ` / 超過 ${yen(billing.overdueAmount)}` : ""}`}/>
      <MetricCard label="入金済" value={yen(billing.paidAmount)} note={`入金率 ${billing.issuedAmount > 0 ? Math.round((billing.paidAmount / billing.issuedAmount) * 100) : 0}%`}/>
    </div>

    {billing.suggestedAmount > 0 && <section className="card billing-suggest-card">
      <div className="card-body billing-suggest-body">
        <div><div className="small muted">現在、請求予定へ未割当の実施・売上があります</div><div className="billing-suggest-value">{project.pricingModel === "unit" && billing.suggestedUnits != null ? `${billing.suggestedUnits}${project.unitLabel ?? "回"} / ` : ""}<strong>{yen(billing.suggestedAmount)}</strong></div></div>
        <Link href={`/projects/${id}/billing/new`} className="button primary">この内容で請求予定を作る</Link>
      </div>
    </section>}

    <section className="card">
      <div className="card-head"><h2>請求履歴</h2><span className="badge">{billing.invoices.length}件</span></div>
      <div className="table-wrap">
        <table className="billing-table">
          <thead><tr><th>請求名</th><th>状態</th><th>金額</th><th>請求予定/請求日</th><th>支払期限</th><th>入金日</th><th>操作</th></tr></thead>
          <tbody>
            {billing.invoices.map((inv)=><tr key={inv.id} className={inv.overdue ? "billing-overdue-row" : inv.status === "cancelled" ? "billing-cancelled-row" : ""}>
              <td><strong>{inv.title}</strong>{inv.referenceNo && <div className="small muted">{inv.referenceNo}</div>}{project.pricingModel === "unit" && inv.unitQuantity != null && <div className="small muted">{inv.unitQuantity}{project.unitLabel ?? "回"} × {yen(inv.unitPrice ?? 0)}</div>}</td>
              <td><BillingStatusBadge status={inv.status} overdue={inv.overdue}/>{inv.overdue && inv.daysOverdue && <div className="small danger-text">{inv.daysOverdue}日超過</div>}</td>
              <td className="money-value"><strong>{yen(inv.amount)}</strong></td>
              <td>{inv.invoiceDate ?? inv.scheduledInvoiceDate ?? "—"}</td>
              <td>{inv.dueDate ?? "—"}</td>
              <td>{inv.paidDate ?? "—"}</td>
              <td><div className="row-actions billing-actions">
                {inv.status === "planned" && <form action={advanceInvoiceStatus}><input type="hidden" name="id" value={inv.id}/><input type="hidden" name="project_id" value={id}/><input type="hidden" name="return_to" value={`/projects/${id}/billing`}/><button className="button soft">請求済みにする</button></form>}
                {inv.status === "invoiced" && <form action={advanceInvoiceStatus}><input type="hidden" name="id" value={inv.id}/><input type="hidden" name="project_id" value={id}/><input type="hidden" name="return_to" value={`/projects/${id}/billing`}/><button className="button primary">入金済みにする</button></form>}
                <Link className="button soft" href={`/invoices/${inv.id}`} target="_blank">請求書</Link><Link className="icon-button edit" title="編集" href={`/billing/${inv.id}/edit`}>✎</Link>
                {inv.status !== "cancelled" && inv.status !== "paid" && <form action={cancelProjectInvoice}><input type="hidden" name="id" value={inv.id}/><input type="hidden" name="project_id" value={id}/><input type="hidden" name="return_to" value={`/projects/${id}/billing`}/><button className="icon-button" title="取消">×</button></form>}
              </div></td>
            </tr>)}
          </tbody>
        </table>
        {!billing.invoices.length && <div className="empty">請求予定・請求履歴はまだありません。</div>}
      </div>
    </section>
  </>;
}
