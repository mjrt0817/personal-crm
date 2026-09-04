import Link from "next/link";
import { notFound } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";
import { createTaskFromGmail } from "@/lib/actions";
import { getProjectGmailMessage, getProjectHeader } from "@/lib/data";

function jstToday() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

export default async function GmailTaskPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string; gmailRowId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { id: projectId, gmailRowId } = await params;
  const query = await searchParams;
  const [project, mail] = await Promise.all([
    getProjectHeader(projectId),
    getProjectGmailMessage(projectId, gmailRowId)
  ]);
  if (!project || !mail) notFound();

  if (mail.taskId) {
    return (
      <>
        <div className="page-head"><div><h1>Gmailからタスク化</h1><p className="muted">{project.companyName} / {project.name}</p></div></div>
        <section className="card"><div className="card-body">
          <div className="notice success-notice">このメールはすでにタスク化されています。</div>
          <div className="form-actions" style={{ marginTop: 16 }}>
            <Link className="button" href={`/projects/${projectId}?tab=activities`}>案件へ戻る</Link>
            <Link className="button primary" href={`/tasks/${mail.taskId}/edit?return_to=${encodeURIComponent(`/projects/${projectId}?tab=activities`)}`}>タスクを編集</Link>
          </div>
        </div></section>
      </>
    );
  }

  const mode = query.mode === "reply" || query.mode === "waiting" ? query.mode : (mail.outgoing ? "waiting" : "reply");
  const suggestedTitle = `${mode === "waiting" ? "回答待ち" : "返信"}：${mail.subject}`;
  const suggestedStatus = mode === "waiting" ? "waiting" : "todo";
  const description = [
    `Gmailから作成（${mail.outgoing ? "送信メール" : "受信メール"}）`,
    mail.fromText ? `差出人: ${mail.fromText}` : null,
    mail.toText ? `宛先: ${mail.toText}` : null,
    "",
    mail.snippet || "（本文プレビューなし）",
    "",
    `Gmail: ${mail.gmailUrl}`
  ].filter((v): v is string => Boolean(v)).join("\n");

  return (
    <>
      <div className="page-head">
        <div>
          <Link className="small muted" href={`/projects/${projectId}?tab=activities`}>← 案件へ戻る</Link>
          <h1 style={{ marginTop: 8 }}>Gmailからタスク化</h1>
          <p className="muted">{project.companyName} / {project.name}</p>
        </div>
      </div>

      <section className="card gmail-task-source">
        <div className="card-body">
          <div className="small muted">元メール</div>
          <div className="list-title" style={{ marginTop: 4 }}>{mail.subject}</div>
          <div className="small muted" style={{ marginTop: 4 }}>{mail.outgoing ? `宛先: ${mail.toText || "—"}` : `差出人: ${mail.fromText || "—"}`}</div>
          {mail.snippet ? <div className="gmail-snippet" style={{ WebkitLineClamp: 3 }}>{mail.snippet}</div> : null}
          <a className="small link-text" href={mail.gmailUrl} target="_blank" rel="noreferrer">Gmailで確認 ↗</a>
        </div>
      </section>

      <form action={createTaskFromGmail} className="form-card" style={{ marginTop: 16 }}>
        <input type="hidden" name="project_id" value={projectId}/>
        <input type="hidden" name="gmail_row_id" value={mail.id}/>
        <input type="hidden" name="company_id" value={project.companyId}/>

        <label className="field"><span>タスク名 *</span><input name="title" required defaultValue={suggestedTitle}/></label>
        <div className="form-grid two">
          <label className="field"><span>状態</span><select name="status" defaultValue={suggestedStatus}><option value="todo">未着手</option><option value="doing">対応中</option><option value="waiting">待ち</option></select></label>
          <label className="field"><span>優先度</span><select name="priority" defaultValue="medium"><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label>
          <label className="field"><span>開始日</span><input type="date" name="start_date" defaultValue={jstToday()}/></label>
          <label className="field"><span>期限</span><input type="datetime-local" name="due_at"/></label>
          <label className="field"><span>フォロー予定</span><input type="datetime-local" name="follow_up_at"/><small className="muted">回答待ちの場合。未設定なら設定した日数経過後にフォロー候補になります。</small></label>
        </div>
        <label className="field"><span>内容</span><textarea name="description" rows={7} defaultValue={description}/></label>
        <label className="field"><span>メモ</span><textarea name="memo" rows={3}/></label>
        <div className="form-actions">
          <Link className="button" href={`/projects/${projectId}?tab=activities`}>キャンセル</Link>
          <SubmitButton pendingLabel="タスク化中…">タスクを作成</SubmitButton>
        </div>
      </form>
    </>
  );
}
