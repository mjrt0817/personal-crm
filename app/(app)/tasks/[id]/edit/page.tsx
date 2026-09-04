import { notFound } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";
import { updateTask } from "@/lib/actions";
import { getProjectOptions, getTaskDetail } from "@/lib/data";

export default async function TaskEditPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ return_to?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const [task, projects] = await Promise.all([getTaskDetail(id), getProjectOptions()]);
  if (!task) notFound();
  const fallback = task.projectId ? `/projects/${task.projectId}?tab=tasks` : "/tasks";
  const returnTo = query.return_to?.startsWith("/") && !query.return_to.startsWith("//") ? query.return_to : fallback;

  return <>
    <div className="page-head"><div><h1>タスク編集</h1><p className="muted">登録済みタスクの内容・期限・状態を修正します。</p></div></div>
    <form action={updateTask} className="form-card form-padded">
      <input type="hidden" name="id" value={task.id}/>
      <input type="hidden" name="old_project_id" value={task.projectId ?? ""}/><input type="hidden" name="company_id" value={task.companyId ?? ""}/>
      <input type="hidden" name="return_to" value={returnTo}/>
      <label className="field"><span>タスク名 *</span><input name="title" required defaultValue={task.title}/></label>
      <label className="field"><span>案件</span><select name="project_id" defaultValue={task.projectId ?? ""}><option value="">単独タスク</option>{projects.map(p=><option key={p.id} value={p.id}>{p.companyName} / {p.name}</option>)}</select></label>
      <div className="form-grid two">
        <label className="field"><span>状態</span><select name="status" defaultValue={task.status}><option value="todo">未着手</option><option value="doing">対応中</option><option value="waiting">待ち</option><option value="completed">完了</option></select></label>
        <label className="field"><span>優先度</span><select name="priority" defaultValue={task.priority}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
        <label className="field"><span>開始日</span><input type="date" name="start_date" defaultValue={task.startDate ?? ""}/></label>
        <label className="field"><span>期限</span><input type="datetime-local" name="due_at" defaultValue={task.dueAt ?? ""}/></label>
        <label className="field"><span>待ち開始</span><input type="datetime-local" name="waiting_since" defaultValue={task.waitingSince ?? ""}/><small className="muted">状態が「待ち」の時に使用します。</small></label>
        <label className="field"><span>フォロー予定</span><input type="datetime-local" name="follow_up_at" defaultValue={task.followUpAt ?? ""}/><small className="muted">未設定の場合は待ち開始から設定した日数でフォロー候補になります。</small></label>
      </div>
      <label className="field"><span>内容</span><textarea name="description" rows={5} defaultValue={task.description ?? ""}/></label>
      <label className="field"><span>メモ</span><textarea name="memo" rows={3} defaultValue={task.memo ?? ""}/></label>
      <div className="form-actions"><a className="button" href={returnTo}>キャンセル</a><SubmitButton pendingLabel="保存中…">変更を保存</SubmitButton></div>
    </form>
  </>;
}
