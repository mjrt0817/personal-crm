import Link from "next/link";
import TaskStatusToggle from "@/components/TaskStatusToggle";
import { deleteTask, markTaskFollowedUp } from "@/lib/actions";
import { getTasks } from "@/lib/data";

const statusName = { todo:"未着手", doing:"対応中", waiting:"待ち", completed:"完了" } as const;
const priorityName = { high:"高", medium:"中", low:"低" } as const;

function fmt(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ja-JP", { timeZone:"Asia/Tokyo", month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit" });
}

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const query = await searchParams;
  const filter = ["all","open","overdue","waiting","followup","completed"].includes(query.filter ?? "") ? query.filter! : "open";
  const tasks = await getTasks();
  const now = Date.now();
  const filtered = tasks.filter((t) => {
    if (filter === "all") return true;
    if (filter === "completed") return t.status === "completed";
    if (filter === "waiting") return t.status === "waiting";
    if (filter === "followup") return Boolean(t.followUpCandidate);
    if (filter === "overdue") return t.status !== "completed" && Boolean(t.dueAt) && new Date(t.dueAt!).getTime() < now;
    return t.status !== "completed";
  });
  const followupCount = tasks.filter((t) => t.followUpCandidate).length;

  const filters = [
    ["open","未完了"], ["followup",`フォロー候補 ${followupCount}`], ["waiting","待ち"], ["overdue","期限超過"], ["completed","完了"], ["all","すべて"]
  ] as const;

  return <>
    <div className="page-head">
      <div><h1>タスク</h1><p className="muted">案件に紐づく作業と、先方待ちのフォローアップをまとめて確認します。</p></div>
      <Link href="/tasks/new" className="button primary">＋ タスク</Link>
    </div>
    <div className="filter-chips">{filters.map(([key,label]) => <Link key={key} href={`/tasks?filter=${key}`} className={`filter-chip ${filter===key?"active":""}`}>{label}</Link>)}</div>
    <section className="card">
      <div className="list">
        {filtered.length ? filtered.map((t) => (
          <div className={`list-row task-row ${t.followUpCandidate ? "followup-row" : ""}`} key={t.id}>
            <TaskStatusToggle id={t.id} status={t.status} projectId={t.projectId}/>
            <div className="grow">
              <div className="list-title">{t.title}</div>
              <div className="small muted">{t.projectId ? <Link href={`/projects/${t.projectId}`}>{t.companyName} / {t.projectName}</Link> : "単独タスク"}</div>
              {t.status === "waiting" && <div className="task-wait-meta">
                <span className={`badge ${t.followUpCandidate ? "red" : "orange"}`}>待ち {t.waitingDays ?? 0}日</span>
                {t.followUpAt && <span className="small muted">フォロー予定：{fmt(t.followUpAt)}</span>}
                {!t.followUpAt && <span className="small muted">3日経過でフォロー候補</span>}
              </div>}
            </div>
            <span className={`badge ${t.status === "waiting" ? "orange" : t.status === "completed" ? "green" : ""}`}>{statusName[t.status]}</span>
            <span className="badge">{priorityName[t.priority]}</span>
            <span className="small muted">期限 {t.due}</span>
            {t.followUpCandidate && <form action={markTaskFollowedUp}>
              <input type="hidden" name="id" value={t.id}/>{t.projectId && <input type="hidden" name="project_id" value={t.projectId}/>}<input type="hidden" name="return_to" value={`/tasks?filter=${filter}`}/>
              <button className="button followup-button">フォロー済み</button>
            </form>}
            <Link className="icon-button edit" title="編集" href={`/tasks/${t.id}/edit?return_to=${encodeURIComponent(`/tasks?filter=${filter}`)}`}>✎</Link>
            <form action={deleteTask}><input type="hidden" name="id" value={t.id}/>{t.projectId && <input type="hidden" name="project_id" value={t.projectId}/>}<button className="icon-button">×</button></form>
          </div>
        )) : <div className="empty">該当するタスクはありません。</div>}
      </div>
    </section>
  </>;
}
