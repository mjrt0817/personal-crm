import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { priorityLabel } from "@/lib/mock-data";
import { getActionPreferences } from "@/lib/preferences";
import { getProjectListWithActivity } from "@/lib/data";

const activeStatuses = new Set(["consultation","hearing","preparing","proposed","considering","ordered","in_progress","on_hold"]);

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const params = await searchParams;
  const filter = ["active","due_week","no_next_action","stale","all"].includes(params.filter ?? "") ? params.filter! : "active";
  const [projects, prefs] = await Promise.all([getProjectListWithActivity(), getActionPreferences()]);
  const now = Date.now();
  const end = now + 7 * 86400000;
  const staleBefore = now - prefs.staleProjectDays * 86400000;
  const filtered = projects.filter((p) => {
    if (filter === "all") return true;
    if (filter === "due_week") {
      const due = p.nextActionDue ? new Date(`${p.nextActionDue}:00+09:00`).getTime() : NaN;
      return Number.isFinite(due) && due >= now && due <= end;
    }
    if (filter === "no_next_action") return activeStatuses.has(p.status) && !p.nextAction;
    if (filter === "stale") return activeStatuses.has(p.status) && (!p.lastActivityAt || new Date(p.lastActivityAt).getTime() < staleBefore);
    return activeStatuses.has(p.status);
  });
  const filters = [
    ["active","対応中"], ["due_week","今週期限"], ["no_next_action","次回アクションなし"], ["stale",`活動なし ${prefs.staleProjectDays}日`], ["all","すべて"]
  ] as const;

  return <>
    <div className="page-head">
      <div><h1>案件</h1><p className="muted">相談から完了まで、1つの案件として追跡します。</p></div>
      <Link href="/projects/new" className="button primary">＋ 案件登録</Link>
    </div>
    <div className="filter-chips">{filters.map(([key,label]) => <Link key={key} href={`/projects?filter=${key}`} className={`filter-chip ${filter===key?"active":""}`}>{label}</Link>)}</div>
    <section className="card table-wrap">
      <table>
        <thead><tr><th>案件</th><th>取引先</th><th>状態</th><th>優先度</th><th>次回アクション</th><th>期限</th></tr></thead>
        <tbody>
          {filtered.map((p) => <tr key={p.id}>
            <td><Link href={`/projects/${p.id}`}><strong>{p.name}</strong></Link><div className="small muted">{p.category}</div></td>
            <td>{p.companyName}</td><td><StatusBadge status={p.status}/></td><td>{priorityLabel[p.priority]}</td><td>{p.nextAction ?? "未設定"}</td><td>{p.nextActionDue ?? "—"}</td>
          </tr>)}
        </tbody>
      </table>
      {!filtered.length && <div className="empty">この条件に該当する案件はありません。</div>}
    </section>
  </>;
}
