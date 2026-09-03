import Link from "next/link";
import TaskStatusToggle from "@/components/TaskStatusToggle";
import { deleteTask } from "@/lib/actions";
import { getTasks } from "@/lib/data";

const statusName = { todo:"未着手", doing:"対応中", waiting:"待ち", completed:"完了" } as const;
const priorityName = { high:"高", medium:"中", low:"低" } as const;

export default async function TasksPage() {
  const tasks = await getTasks();
  return (
    <>
      <div className="page-head">
        <div><h1>タスク</h1><p className="muted">案件に紐づく作業と、単独タスクをまとめて確認します。</p></div>
        <Link href="/tasks/new" className="button primary">＋ タスク</Link>
      </div>
      <section className="card">
        <div className="list">
          {tasks.map((t) => (
            <div className="list-row" key={t.id}>
              <TaskStatusToggle id={t.id} status={t.status} projectId={t.projectId}/>
              <div className="grow">
                <div className="list-title">{t.title}</div>
                <div className="small muted">{t.projectId ? <Link href={`/projects/${t.projectId}`}>{t.companyName} / {t.projectName}</Link> : "単独タスク"}</div>
              </div>
              <span className={`badge ${t.status === "waiting" ? "orange" : t.status === "completed" ? "green" : ""}`}>{statusName[t.status]}</span>
              <span className="badge">{priorityName[t.priority]}</span>
              <span className="small muted">{t.due}</span>
              <Link className="icon-button edit" title="編集" href={`/tasks/${t.id}/edit`}>✎</Link>
              <form action={deleteTask}><input type="hidden" name="id" value={t.id}/>{t.projectId && <input type="hidden" name="project_id" value={t.projectId}/>}<button className="icon-button">×</button></form>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
