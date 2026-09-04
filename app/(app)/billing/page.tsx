import Link from "next/link";
import BillingStatusBadge from "@/components/BillingStatusBadge";
import MetricCard from "@/components/MetricCard";
import { advanceInvoiceStatus } from "@/lib/actions";
import { getBillingSnapshot } from "@/lib/data";

function yen(v:number){return `${Math.round(v).toLocaleString("ja-JP")}円`;}
function todayJst(){return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
function addDays(dateKey:string, days:number){const d=new Date(`${dateKey}T00:00:00+09:00`);d.setDate(d.getDate()+days);return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);}

export default async function BillingPage({searchParams}:{searchParams:Promise<{filter?:string}>}) {
  const {filter="open"}=await searchParams;
  const snapshot=await getBillingSnapshot();
  const today=todayJst();
  const monthKey=today.slice(0,7);
  const dueSoonKey=addDays(today,7);
  const rows=snapshot.invoices.filter((inv)=>{
    if(filter==="ready") return false;
    if(filter==="this_month") return inv.status==="planned" && Boolean(inv.scheduledInvoiceDate?.startsWith(monthKey));
    if(filter==="due_soon") return inv.status==="invoiced" && Boolean(inv.dueDate) && inv.dueDate! >= today && inv.dueDate! <= dueSoonKey;
    if(filter==="overdue") return inv.overdue;
    if(filter==="planned") return inv.status==="planned";
    if(filter==="invoiced") return inv.status==="invoiced";
    if(filter==="paid") return inv.status==="paid";
    if(filter==="all") return true;
    return inv.status==="planned" || inv.status==="invoiced";
  });
  const filters=[
    ["open","未請求・未入金"],
    ["ready","請求対象未登録"],
    ["this_month","今月請求予定"],
    ["due_soon","期限7日以内"],
    ["overdue","期限超過"],
    ["planned","未請求（予定済）"],
    ["invoiced","請求済"],
    ["paid","入金済"],
    ["all","すべて"]
  ];
  const showReady=filter==="open" || filter==="ready" || filter==="planned";
  return <>
    <div className="page-head"><div><h1>請求・入金</h1><p className="muted">案件の売上を、請求対象・請求予定・請求済・入金済まで追跡します。</p></div></div>
    <div className="grid-4 billing-kpis">
      <MetricCard label="未請求" value={yen(snapshot.unbilledAmount)} note={`対象未登録 ${yen(snapshot.unbilledReadyAmount)} / 予定登録 ${yen(snapshot.plannedAmount)}`}/>
      <MetricCard label="未入金" value={yen(snapshot.outstandingAmount)} note={`${snapshot.dueSoonCount}件が7日以内期限`}/>
      <MetricCard label="期限超過" value={yen(snapshot.overdueAmount)} note={`${snapshot.overdueCount}件`}/>
      <MetricCard label="入金済" value={yen(snapshot.paidAmount)} note={`請求済累計 ${yen(snapshot.issuedAmount)}`}/>
    </div>

    <div className="filter-chips billing-filter-chips">{filters.map(([v,l])=><Link className={`filter-chip ${filter===v?"active":""}`} href={`/billing?filter=${v}`} key={v}>{l}</Link>)}</div>

    {showReady && snapshot.unbilledProjects.length > 0 && <section className="card billing-ready-card">
      <div className="card-head"><div><h2>請求対象（まだ請求予定を作っていない案件）</h2><div className="small muted">実施済み・受注済み売上から自動抽出</div></div><span className="badge orange">{snapshot.unbilledReadyCount}件 / {yen(snapshot.unbilledReadyAmount)}</span></div>
      <div className="list compact-list">{snapshot.unbilledProjects.map((p)=><div className="list-row" key={p.projectId}><div className="grow"><div className="list-title">{p.projectName}</div><div className="small muted">{p.companyName}{p.units != null ? ` ・ ${p.units}${p.unitLabel ?? "回"} が請求対象` : ""}</div></div><strong className="money-value">{yen(p.amount)}</strong><Link className="button primary" href={`/projects/${p.projectId}/billing/new`}>請求予定を作る</Link></div>)}</div>
    </section>}
    {filter==="ready" && snapshot.unbilledProjects.length===0 && <section className="card"><div className="empty">請求対象未登録の案件はありません。</div></section>}

    {filter!=="ready" && <section className="card">
      <div className="card-head"><div><h2>請求一覧</h2><div className="small muted">請求予定日・支払期限で絞り込みできます。</div></div><span className="badge">{rows.length}件</span></div>
      <div className="table-wrap"><table className="billing-table"><thead><tr><th>案件</th><th>請求名</th><th>状態</th><th>金額</th><th>請求予定/請求日</th><th>支払期限</th><th>入金日</th><th>操作</th></tr></thead><tbody>
        {rows.map(inv=><tr key={inv.id} className={inv.overdue?"billing-overdue-row":inv.status==="cancelled"?"billing-cancelled-row":""}>
          <td><Link href={`/projects/${inv.projectId}`}><strong>{inv.projectName ?? "案件"}</strong></Link><div className="small muted">{inv.companyName ?? "—"}</div></td>
          <td>{inv.title}{inv.referenceNo&&<div className="small muted">{inv.referenceNo}</div>}{inv.memo&&<div className="small muted billing-memo-preview">{inv.memo}</div>}</td>
          <td><BillingStatusBadge status={inv.status} overdue={inv.overdue}/>{inv.overdue&&inv.daysOverdue&&<div className="small danger-text">{inv.daysOverdue}日超過</div>}</td>
          <td className="money-value"><strong>{yen(inv.amount)}</strong></td><td>{inv.invoiceDate??inv.scheduledInvoiceDate??"—"}</td><td>{inv.dueDate??"—"}</td><td>{inv.paidDate??"—"}</td>
          <td><div className="row-actions billing-actions">{inv.status==="planned"&&<form action={advanceInvoiceStatus}><input type="hidden" name="id" value={inv.id}/><input type="hidden" name="project_id" value={inv.projectId}/><input type="hidden" name="return_to" value={`/billing?filter=${filter}`}/><button className="button soft">請求済</button></form>}{inv.status==="invoiced"&&<form action={advanceInvoiceStatus}><input type="hidden" name="id" value={inv.id}/><input type="hidden" name="project_id" value={inv.projectId}/><input type="hidden" name="return_to" value={`/billing?filter=${filter}`}/><button className="button primary">入金済</button></form>}<Link className="icon-button edit" href={`/billing/${inv.id}/edit`} title="編集">✎</Link></div></td>
        </tr>)}
      </tbody></table>{!rows.length&&<div className="empty">該当する請求はありません。</div>}</div>
    </section>}
  </>;
}
