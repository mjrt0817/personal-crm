import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { restoreCompany, restoreProject } from "@/lib/actions";
import { getArchivedItems } from "@/lib/data";

function fmt(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

export default async function ArchivePage({ searchParams }: { searchParams: Promise<{ restored?: string }> }) {
  const params = await searchParams;
  const { projects, companies } = await getArchivedItems();
  return <>
    <div className="page-head">
      <div><h1>アーカイブ</h1><p className="muted">非表示にした案件・取引先を確認し、必要なら復元できます。</p></div>
      <Link className="button" href="/settings">設定へ戻る</Link>
    </div>
    {params.restored && <div className="notice success-notice">アーカイブから復元しました。</div>}

    <section className="card" style={{marginBottom:18}}>
      <div className="card-head"><h2>案件 <span className="badge">{projects.length}</span></h2></div>
      {projects.length ? <div className="list">{projects.map((p) => <div className="list-row" key={p.id}>
        <div className="grow"><div className="list-title">{p.name}</div><div className="small muted">{p.companyName} / アーカイブ更新 {fmt(p.archivedAt)}</div></div>
        <StatusBadge status={p.status}/>
        <form action={restoreProject}><input type="hidden" name="id" value={p.id}/><button className="button">復元</button></form>
      </div>)}</div> : <div className="empty">アーカイブ済み案件はありません。</div>}
    </section>

    <section className="card">
      <div className="card-head"><h2>取引先 <span className="badge">{companies.length}</span></h2></div>
      {companies.length ? <div className="list">{companies.map((c) => <div className="list-row" key={c.id}>
        <div className="grow"><div className="list-title">{c.name}</div><div className="small muted">{c.industry} / アーカイブ更新 {fmt(c.archivedAt)}</div></div>
        <form action={restoreCompany}><input type="hidden" name="id" value={c.id}/><button className="button">復元</button></form>
      </div>)}</div> : <div className="empty">アーカイブ済み取引先はありません。</div>}
    </section>
  </>;
}
