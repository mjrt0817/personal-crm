import Link from "next/link";
import { getEstimates } from "@/lib/data";

const labels:Record<string,string>={draft:"下書き",sent:"送付済",accepted:"採用",rejected:"不採用",expired:"期限切れ"};
function yen(v:number){return `${Math.round(v).toLocaleString("ja-JP")}円`;}

export default async function EstimatesPage({searchParams}:{searchParams:Promise<{filter?:string}>}){
  const {filter="active"}=await searchParams;
  const estimates=await getEstimates();
  const rows=estimates.filter((x)=>filter==="all"?true:filter==="active"?!["rejected","expired"].includes(x.status):x.status===filter);
  const accepted=estimates.filter((x)=>x.status==="accepted");
  const active=estimates.filter((x)=>!["rejected","expired"].includes(x.status));
  return <>
    <div className="page-head"><div><h1>見積</h1><p className="muted">見積書の作成から採用、案件・請求への引継ぎまで管理します。</p></div><Link className="button primary" href="/estimates/new">＋ 見積作成</Link></div>
    <div className="grid-4 estimate-kpis"><div className="metric-card"><div className="metric-label">進行中</div><div className="metric-value">{active.length}</div></div><div className="metric-card"><div className="metric-label">進行中総額</div><div className="metric-value money-value">{yen(active.reduce((s,x)=>s+x.totalAmount,0))}</div></div><div className="metric-card"><div className="metric-label">採用</div><div className="metric-value">{accepted.length}</div></div><div className="metric-card"><div className="metric-label">採用総額</div><div className="metric-value money-value">{yen(accepted.reduce((s,x)=>s+x.totalAmount,0))}</div></div></div>
    <div className="filter-chips estimate-filter-chips">{[["active","進行中"],["draft","下書き"],["sent","送付済"],["accepted","採用"],["rejected","不採用"],["all","すべて"]].map(([v,l])=><Link key={v} href={`/estimates?filter=${v}`} className={`filter-chip ${filter===v?"active":""}`}>{l}</Link>)}</div>
    <section className="card"><div className="card-head"><h2>見積一覧</h2><span className="badge">{rows.length}件</span></div><div className="table-wrap"><table className="estimate-table"><thead><tr><th>見積番号 / 見積名</th><th>取引先</th><th>状態</th><th>金額</th><th>見積日</th><th>有効期限</th><th>案件</th><th>操作</th></tr></thead><tbody>{rows.map((e)=><tr key={e.id}><td><Link href={`/estimates/${e.id}`}><strong>{e.estimateNo}</strong></Link><div className="small muted">{e.title}</div></td><td>{e.companyName??"—"}<div className="small muted">{e.contactName??""}</div></td><td><span className={`badge estimate-status-${e.status}`}>{labels[e.status]??e.status}</span></td><td className="money-value"><strong>{yen(e.totalAmount)}</strong></td><td>{e.issueDate}</td><td>{e.validUntil??"—"}</td><td>{e.projectId?<Link href={`/projects/${e.projectId}`}>{e.projectName??"案件"}</Link>:<span className="muted">未案件化</span>}</td><td><div className="row-actions"><Link className="button soft" href={`/estimate-documents/${e.id}`} target="_blank">見積書</Link><Link className="icon-button edit" href={`/estimates/${e.id}/edit`}>✎</Link></div></td></tr>)}</tbody></table>{!rows.length&&<div className="empty">該当する見積はありません。</div>}</div></section>
  </>;
}
