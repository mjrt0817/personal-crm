import SubmitButton from "@/components/SubmitButton";
import { createTask } from "@/lib/actions";
import { getProjectOptions } from "@/lib/data";

export default async function Page() {
  const projects = await getProjectOptions();
  return <>
    <div className="page-head"><div><h1>タスク追加</h1><p className="muted">案件に紐づけない単独タスクも登録できます。</p></div></div>
    <form action={createTask} className="form-card">
      <div className="form-section">
        <label className="field"><span>タスク名 *</span><input name="title" required/></label>
        <label className="field"><span>案件</span><select name="project_id"><option value="">単独タスク</option>{projects.map(p=><option key={p.id} value={p.id}>{p.companyName} / {p.name}</option>)}</select></label>
        <div className="form-grid two">
          <label className="field"><span>状態</span><select name="status"><option value="todo">未着手</option><option value="doing">対応中</option><option value="waiting">待ち</option></select></label>
          <label className="field"><span>優先度</span><select name="priority" defaultValue="medium"><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
          <label className="field"><span>期限</span><input type="datetime-local" name="due_at"/></label>
          <label className="field"><span>フォロー予定</span><input type="datetime-local" name="follow_up_at"/><small className="muted">「待ち」の場合。未設定なら3日後からフォロー候補に表示します。</small></label>
        </div>
        <label className="field"><span>内容</span><textarea name="description" rows={4}/></label>
      </div>
      <div className="form-actions"><a className="button" href="/tasks">キャンセル</a><SubmitButton pendingLabel="追加中…">追加</SubmitButton></div>
    </form>
  </>;
}
