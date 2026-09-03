import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { priorityLabel } from "@/lib/mock-data";
import { getProjects } from "@/lib/data";

export default async function ProjectsPage() {
  const projects = await getProjects();
  return (
    <>
      <div className="page-head">
        <div><h1>案件</h1><p className="muted">相談から完了まで、1つの案件として追跡します。</p></div>
        <Link href="/projects/new" className="button primary">＋ 案件登録</Link>
      </div>

      <div className="filters">
        <button className="filter active">対応中</button>
        <button className="filter">今週期限</button>
        <button className="filter">次回アクションなし</button>
        <button className="filter">放置案件</button>
        <button className="filter">すべて</button>
      </div>

      <section className="card table-wrap">
        <table>
          <thead><tr><th>案件</th><th>取引先</th><th>状態</th><th>優先度</th><th>次回アクション</th><th>期限</th></tr></thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/projects/${p.id}`}><strong>{p.name}</strong></Link><div className="small muted">{p.category}</div></td>
                <td>{p.companyName}</td>
                <td><StatusBadge status={p.status}/></td>
                <td>{priorityLabel[p.priority]}</td>
                <td>{p.nextAction ?? "未設定"}</td>
                <td>{p.nextActionDue ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
