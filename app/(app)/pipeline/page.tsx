import Link from "next/link";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";
import { getSalesPipelineSnapshot } from "@/lib/data";
import { priorityLabel, statusLabel } from "@/lib/mock-data";

function yen(value: number) {
  return `${Math.round(value).toLocaleString("ja-JP")}円`;
}

export default async function PipelinePage() {
  const pipeline = await getSalesPipelineSnapshot();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>売上・見込</h1>
          <p className="muted">商談見込と、受注・進行中案件の予定売上／実施済み売上をまとめて把握します。</p>
        </div>
        <Link href="/projects/new" className="button primary">＋ 案件登録</Link>
      </div>

      <div className="grid-4 pipeline-kpis">
        <MetricCard label="商談中案件" value={pipeline.openCount} note="保留を含む"/>
        <MetricCard label="見込総額" value={yen(pipeline.openExpectedAmount)} note="未受注案件"/>
        <MetricCard label="加重見込" value={yen(pipeline.weightedExpectedAmount)} note="見込額 × 受注確度"/>
        <MetricCard label="受注・進行中見込" value={yen(pipeline.wonAmount)} note={`実施済み ${yen(pipeline.realizedAmount)}`}/>
      </div>

      <section className="card billing-pipeline-card">
        <div className="card-head"><h2>請求・入金状況</h2><Link href="/billing" className="small muted">請求・入金を見る →</Link></div>
        <div className="card-body pipeline-dashboard-body">
          <div className="pipeline-mini"><div className="label">未請求</div><div className="value">{yen(pipeline.unbilledAmount)}</div></div>
          <div className="pipeline-mini"><div className="label">未入金</div><div className="value">{yen(pipeline.outstandingAmount)}</div></div>
          <div className={`pipeline-mini ${pipeline.overdueAmount > 0 ? "is-danger" : ""}`}><div className="label">期限超過</div><div className="value">{yen(pipeline.overdueAmount)}</div></div>
          <div className="pipeline-mini"><div className="label">入金済</div><div className="value">{yen(pipeline.paidAmount)}</div></div>
        </div>
      </section>

      <div className="two-col">
        <section className="card">
          <div className="card-head"><h2>ステータス別パイプライン</h2><span className="small muted">未受注案件</span></div>
          <div className="card-body">
            <div className="pipeline-stage-grid">
              {pipeline.stages.map((stage) => (
                <div className="pipeline-stage" key={stage.status}>
                  <div className="pipeline-stage-top"><strong>{statusLabel[stage.status]}</strong><span className="badge">{stage.count}件</span></div>
                  <div className="pipeline-stage-amount money-value">{yen(stage.expectedAmount)}</div>
                  <div className="pipeline-stage-weighted">加重見込 {yen(stage.weightedAmount)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h2>月別見込</h2><span className="small muted">今月から6か月</span></div>
          <div className="card-body">
            <div className="pipeline-month-grid">
              {pipeline.months.map((month) => (
                <div className="pipeline-month" key={month.key}>
                  <div className="pipeline-month-label">{month.label}</div>
                  <div className="pipeline-month-row"><span className="muted">見込</span><strong>{yen(month.expectedAmount)}</strong></div>
                  <div className="pipeline-month-row"><span className="muted">加重</span><strong>{yen(month.weightedAmount)}</strong></div>
                  <div className="pipeline-month-row"><span className="muted">受注</span><strong>{yen(month.orderedAmount)}</strong></div>
                </div>
              ))}
            </div>
            {!pipeline.opportunities.some((p) => p.expectedCloseDate) && <div className="pipeline-empty-note" style={{marginTop:12}}>受注見込日を案件へ設定すると、月別の見込が表示されます。</div>}
          </div>
        </section>
      </div>

      <section className="card" style={{marginTop:18}}>
        <div className="card-head"><h2>商談案件</h2><span className="badge">{pipeline.opportunities.length}件</span></div>
        <div className="table-wrap">
          <table className="pipeline-opportunity-table">
            <thead><tr><th>案件</th><th>状態</th><th>優先度</th><th>見込金額</th><th>確度</th><th>加重見込</th><th>受注見込日</th></tr></thead>
            <tbody>
              {pipeline.opportunities.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/projects/${p.id}`}><strong>{p.name}</strong></Link><div className="small muted">{p.companyName}</div></td>
                  <td><StatusBadge status={p.status}/></td>
                  <td>{priorityLabel[p.priority]}</td>
                  <td className="money-value">{yen(p.calculatedExpectedAmount)}</td>
                  <td><span className="badge blue pipeline-probability">{p.effectiveProbability}%</span>{p.winProbability == null && <div className="small muted">標準値</div>}</td>
                  <td className="money-value"><strong>{yen(p.weightedAmount)}</strong></td>
                  <td>{p.expectedCloseDate ?? "未設定"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!pipeline.opportunities.length && <div className="empty">商談中の案件はありません。</div>}
        </div>
      </section>

      <section className="card" style={{marginTop:18}}>
        <div className="card-head"><h2>受注・進行中案件</h2><span className="badge">{pipeline.wonProjects.length}件</span></div>
        <div className="table-wrap">
          <table className="pipeline-opportunity-table">
            <thead><tr><th>案件</th><th>状態</th><th>金額方式</th><th>予定・受注額</th><th>実施済み</th><th>残り</th></tr></thead>
            <tbody>
              {pipeline.wonProjects.map((p) => (
                <tr key={p.id}>
                  <td><Link href={`/projects/${p.id}`}><strong>{p.name}</strong></Link><div className="small muted">{p.companyName}</div></td>
                  <td><StatusBadge status={p.status}/></td>
                  <td>{p.pricingModel === "unit" ? <><strong>{(p.unitPrice ?? 0).toLocaleString()}円</strong> × {p.plannedUnits ?? 0}{p.unitLabel ?? "回"}<div className="small muted">実施 {p.completedUnits ?? 0}{p.unitLabel ?? "回"}</div></> : "固定金額"}</td>
                  <td className="money-value"><strong>{yen(p.calculatedWonAmount)}</strong></td>
                  <td className="money-value">{yen(p.realizedAmount)}</td>
                  <td className="money-value">{yen(p.remainingAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!pipeline.wonProjects.length && <div className="empty">受注・進行中の案件はありません。</div>}
        </div>
      </section>
    </>
  );
}
