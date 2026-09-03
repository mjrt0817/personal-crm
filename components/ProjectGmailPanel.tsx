import Link from "next/link";
import { createActivityFromGmail, syncProjectGmailNow } from "@/lib/actions";
import type { ProjectGmailSummary } from "@/lib/types";

function formatDateTime(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function ProjectGmailPanel({ projectId, summary, showAllLink = true }: { projectId: string; summary: ProjectGmailSummary; showAllLink?: boolean }) {
  return (
    <div className="gmail-panel">
      <div className="gmail-panel-head">
        <div>
          <div className="list-title">Gmail 関連メール</div>
          <div className="small muted">取引先・担当者のメールアドレスから過去1年の関連メールを検索します。</div>
        </div>
        <div className="row-actions">{showAllLink ? <Link className="button" href={`/projects/${projectId}/mail`}>すべて表示</Link> : null}<form action={syncProjectGmailNow}><input type="hidden" name="project_id" value={projectId}/><button className="button soft" type="submit">↻ Gmailを同期</button></form></div>
      </div>

      <div className="gmail-sync-meta small muted">
        最終同期：{formatDateTime(summary.lastSyncAt)}
        {summary.lastSyncError ? <span className="gmail-error">　エラー：{summary.lastSyncError}</span> : null}
      </div>

      <div className="gmail-list">
        {summary.messages.length ? summary.messages.map((mail) => (
          <div className="gmail-row" key={mail.id}>
            <div className="gmail-row-main">
              <div className="gmail-row-top">
                <span className={`badge ${mail.outgoing ? "" : "green"}`}>{mail.outgoing ? "送信" : "受信"}</span>
                <span className="small muted">{formatDateTime(mail.sentAt)}</span>
              </div>
              <div className="list-title gmail-subject">{mail.subject}</div>
              <div className="small muted gmail-address">{mail.outgoing ? `宛先: ${mail.toText || "—"}` : `差出人: ${mail.fromText || "—"}`}</div>
              {mail.snippet ? <div className="gmail-snippet">{mail.snippet}</div> : null}
            </div>
            <div className="gmail-row-actions">
              <a className="button" href={mail.gmailUrl} target="_blank" rel="noreferrer">Gmail ↗</a>
              {mail.activityId ? (
                <span className="badge green">活動登録済</span>
              ) : (
                <form action={createActivityFromGmail}>
                  <input type="hidden" name="project_id" value={projectId}/>
                  <input type="hidden" name="gmail_row_id" value={mail.id}/>
                  <button className="button soft" type="submit">活動履歴に追加</button>
                </form>
              )}
              {mail.taskId ? (
                <Link className="button soft" href={`/tasks/${mail.taskId}/edit?return_to=${encodeURIComponent(`/projects/${projectId}?tab=activities`)}`}>タスク編集</Link>
              ) : (
                <Link className="button task-from-mail" href={`/projects/${projectId}/mail/${mail.id}/task?mode=${mail.outgoing ? "waiting" : "reply"}`}>{mail.outgoing ? "回答待ちにする" : "返信タスクにする"}</Link>
              )}
            </div>
          </div>
        )) : (
          <div className="empty gmail-empty">まだ同期されていません。「Gmailを同期」を押すと関連メールを検索します。</div>
        )}
      </div>
    </div>
  );
}
