import Link from "next/link";
import { notFound } from "next/navigation";
import QuickLinks from "@/components/QuickLinks";
import StatusBadge from "@/components/StatusBadge";
import ProjectDetailTabs from "@/components/ProjectDetailTabs";
import AutoDriveSync from "@/components/AutoDriveSync";
import ProjectGmailPanel from "@/components/ProjectGmailPanel";
import { priorityLabel } from "@/lib/mock-data";
import { getProject, getProjectDriveSummary, getProjectGmailSummary } from "@/lib/data";
import { archiveProject, deleteActivity, deleteProjectLink, deleteTask, markTaskFollowedUp, syncProjectDriveFolderNow } from "@/lib/actions";
import TaskStatusToggle from "@/components/TaskStatusToggle";

const VALID_TABS = new Set(["overview", "activities", "tasks", "schedule", "links", "drive", "memo"]);

export default async function ProjectDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; gmail?: string; count?: string; message?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const initialTab = query.tab && VALID_TABS.has(query.tab) ? query.tab : "overview";
  const [project, drive, gmail] = await Promise.all([getProject(id), getProjectDriveSummary(id, 8), getProjectGmailSummary(id, 8)]);
  if (!project) notFound();

  const overview = (
    <section className="card">
      <div className="card-head"><h2>概要</h2><Link className="small muted" href={`/projects/${id}/edit`}>編集</Link></div>
      <div className="card-body">
        <div className="kv"><div className="k">取引先</div><div>{project.companyName}</div></div>
        <div className="kv"><div className="k">主担当</div><div>{project.contactName ?? "—"}</div></div>
        <div className="kv"><div className="k">開始日</div><div>{project.startDate ?? "—"}</div></div>
        <div className="kv"><div className="k">納期</div><div>{project.dueDate ?? "—"}</div></div>
        <div className="kv"><div className="k">見込金額</div><div>{project.expectedAmount != null ? `${project.expectedAmount.toLocaleString()}円` : "—"}</div></div>
        <div className="kv"><div className="k">受注金額</div><div>{project.orderAmount != null ? `${project.orderAmount.toLocaleString()}円` : "—"}</div></div>
        <div style={{ marginTop: 16 }}><div className="small muted">案件概要</div><p style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{project.description || "—"}</p></div>
      </div>
    </section>
  );

  const activities = (
    <section className="card">
      <div className="card-head"><h2>活動履歴</h2><Link className="button soft" href={`/projects/${id}/activities/new`}>＋ 活動</Link></div>
      <div className="card-body">
        {query.gmail === "synced" && <div className="notice success-notice" style={{ marginBottom: 14 }}>Gmailを同期しました。{query.count ? ` ${query.count}件を確認しました。` : ""}</div>}
        {query.gmail === "added" && <div className="notice success-notice" style={{ marginBottom: 14 }}>メールを活動履歴へ追加しました。</div>}
        {query.gmail === "already_added" && <div className="notice" style={{ marginBottom: 14 }}>このメールはすでに活動履歴へ追加されています。</div>}
        {query.gmail === "task_added" && <div className="notice success-notice" style={{ marginBottom: 14 }}>メールからタスクを作成しました。</div>}
        {query.gmail === "task_already_added" && <div className="notice" style={{ marginBottom: 14 }}>このメールはすでにタスク化されています。</div>}
        {query.gmail === "error" && <div className="notice error-notice" style={{ marginBottom: 14 }}>Gmail同期に失敗しました。{query.message ? ` ${query.message}` : ""}</div>}
        <ProjectGmailPanel projectId={id} summary={gmail}/>
        <div className="timeline">
          {project.activities.length ? project.activities.map((a) => (
            <div className="timeline-item" key={a.id}>
              <div className="row-actions">
                <div className="grow"><div className="small muted">{a.date}　{a.type}</div><div className="list-title">{a.title}</div><div style={{ whiteSpace: "pre-wrap" }}>{a.content}</div></div>
                <Link className="icon-button edit" title="編集" href={`/projects/${id}/activities/${a.id}/edit`}>✎</Link>
                <form action={deleteActivity}><input type="hidden" name="id" value={a.id}/><input type="hidden" name="project_id" value={id}/><button className="icon-button" title="削除">×</button></form>
              </div>
            </div>
          )) : <div className="empty">活動履歴はまだありません。</div>}
        </div>
      </div>
    </section>
  );

  const tasks = (
    <section className="card">
      <div className="card-head"><h2>タスク</h2><Link className="button soft" href={`/projects/${id}/tasks/new`}>＋ タスク</Link></div>
      <div className="list">
        {project.tasks.length ? project.tasks.map((t) => (
          <div className={`list-row task-row ${t.followUpCandidate ? "followup-row" : ""}`} key={t.id}>
            <TaskStatusToggle id={t.id} status={t.status} projectId={id}/>
            <div className="grow">
              <div className="list-title">{t.title}</div>
              <div className="small muted">期限：{t.due}</div>
              {t.status === "waiting" && <div className="task-wait-meta"><span className={`badge ${t.followUpCandidate ? "red" : "orange"}`}>待ち {t.waitingDays ?? 0}日</span>{t.followUpAt ? <span className="small muted">フォロー予定：{new Date(t.followUpAt).toLocaleString("ja-JP", { timeZone:"Asia/Tokyo", month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit" })}</span> : <span className="small muted">3日経過でフォロー候補</span>}</div>}
            </div>
            <span className="badge">{t.priority === "high" ? "高" : t.priority === "medium" ? "中" : "低"}</span>
            {t.followUpCandidate && <form action={markTaskFollowedUp}><input type="hidden" name="id" value={t.id}/><input type="hidden" name="project_id" value={id}/><input type="hidden" name="return_to" value={`/projects/${id}?tab=tasks`}/><button className="button followup-button">フォロー済み</button></form>}
            <Link className="icon-button edit" title="編集" href={`/tasks/${t.id}/edit?return_to=${encodeURIComponent(`/projects/${id}?tab=tasks`)}`}>✎</Link>
            <form action={deleteTask}><input type="hidden" name="id" value={t.id}/><input type="hidden" name="project_id" value={id}/><button className="icon-button" title="削除">×</button></form>
          </div>
        )) : <div className="empty">タスクはまだありません。</div>}
      </div>
    </section>
  );

  const schedule = (
    <section className="card">
      <div className="card-head"><h2>予定</h2><Link className="button soft" href={`/projects/${id}/schedule/new`}>＋ 予定</Link></div>
      <div className="card-body"><div className="action-box"><div className="label">次回予定</div><div className="value">{project.nextSchedule ?? "未設定"}</div></div></div>
    </section>
  );

  const links = (
    <section className="card">
      <div className="card-head"><h2>関連リンク</h2><Link className="button soft" href={`/projects/${id}/links/new`}>＋ URL</Link></div>
      <div className="list">
        {project.links.length ? project.links.map((link) => (
          <div className="list-row" key={link.id}>
            <div className="grow"><div className="list-title">{link.pinned ? "📌 " : ""}{link.name}</div><div className="small muted">{link.linkType}</div></div>
            <a className="button" href={link.url} target="_blank" rel="noreferrer">開く ↗</a>
            <Link className="icon-button edit" title="編集" href={`/projects/${id}/links/${link.id}/edit`}>✎</Link>
            <form action={deleteProjectLink}><input type="hidden" name="id" value={link.id}/><input type="hidden" name="project_id" value={id}/><button className="icon-button" title="削除">×</button></form>
          </div>
        )) : <div className="empty">関連リンクはまだありません。</div>}
      </div>
    </section>
  );

  const drivePanel = (
    <section className="card">
      <div className="card-head"><h2>Google Drive</h2><div className="row-actions"><span className="badge">{drive.folders.length}フォルダ</span><Link className="button soft" href={`/projects/${id}/drive`}>{drive.folders.length ? "ファイル一覧" : "＋ フォルダを紐付け"}</Link></div></div>
      <div className="card-body">
        {drive.folders.length ? (
          <>
            <div className="drive-auto-note small muted">案件を開いた時と画面へ戻った時に、一定時間以上経過していればDriveを自動同期します。</div>
            <div className="drive-folder-chips">
              {drive.folders.map((folder) => (
                <div className={`drive-folder-chip ${folder.lastSyncError ? "has-error" : ""}`} key={folder.id}>
                  <div className="drive-folder-chip-main">
                    <a href={folder.url} target="_blank" rel="noreferrer">📁 {folder.name} ↗</a>
                    <span className={`small ${folder.lastSyncError ? "drive-sync-error" : "muted"}`}>{folder.lastSyncError ? "同期エラー" : folder.lastSyncAt ? `同期 ${new Date(folder.lastSyncAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : "未同期"}</span>
                  </div>
                  <form action={syncProjectDriveFolderNow}><input type="hidden" name="project_id" value={id}/><input type="hidden" name="drive_folder_id" value={folder.id}/><button className="small-link-button" type="submit">↻ 今すぐ同期</button></form>
                </div>
              ))}
            </div>
            <div className="drive-recent-head"><div className="small muted">最近更新されたファイル</div><Link className="small link-text" href={`/projects/${id}/drive`}>すべて表示 →</Link></div>
            <div className="list compact-list">
              {drive.files.length ? drive.files.map((file) => (
                <a className="list-row drive-file-link" href={file.url} target="_blank" rel="noreferrer" key={file.id}>
                  <div className="grow"><div className="list-title">{file.name}</div><div className="small muted">{file.relativePath || file.name}{file.modifiedAt ? ` ・ ${new Date(file.modifiedAt).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}` : ""}</div></div>
                  <span className="badge">{file.fileType || "ファイル"}</span><span>↗</span>
                </a>
              )) : <div className="empty">ファイルはまだ同期されていません。</div>}
            </div>
          </>
        ) : <div className="empty"><p>案件フォルダを紐付けると、Drive内のファイルをここからすぐ開けます。</p><Link className="button primary" style={{ marginTop: 12 }} href={`/projects/${id}/drive/new`}>Google Driveフォルダを紐付け</Link></div>}
      </div>
    </section>
  );

  const memo = (
    <section className="card">
      <div className="card-head"><h2>メモ</h2><Link className="small muted" href={`/projects/${id}/edit`}>編集</Link></div>
      <div className="card-body" style={{ whiteSpace: "pre-wrap" }}>{project.memo ?? "メモはありません。"}</div>
    </section>
  );

  return (
    <>
      <AutoDriveSync projectId={id} enabled={drive.folders.length > 0}/>

      <div className="page-head">
        <Link href="/projects" className="small muted">← 案件一覧</Link>
        <div className="top-actions">
          <Link href={`/projects/${id}/edit`} className="button">編集</Link>
          <form action={archiveProject}><input type="hidden" name="id" value={id}/><button className="button danger">アーカイブ</button></form>
        </div>
      </div>

      <section className="project-hero">
        <div className="project-top"><div><div className="small muted">{project.companyName}</div><h1 className="project-title">{project.name}</h1><div className="project-meta"><StatusBadge status={project.status}/><span className="badge">優先度：{priorityLabel[project.priority]}</span><span className="badge">{project.category}</span></div></div></div>
        <div className="next-action"><div className="action-box"><div className="label">次回予定</div><div className="value">{project.nextSchedule ?? "未設定"}</div><Link className="small link-text" href={`/projects/${id}/schedule/new`}>＋ 予定を追加</Link></div><div className="action-box"><div className="label">次にやること</div><div className="value">{project.nextAction ?? "未設定"}</div><div className="small muted">期限：{project.nextActionDue ? project.nextActionDue.replace("T", " ") : "—"}</div></div></div>
        <QuickLinks links={project.links}/>
      </section>

      <ProjectDetailTabs
        initialTab={initialTab}
        overview={overview}
        activities={activities}
        tasks={tasks}
        schedule={schedule}
        links={links}
        drive={drivePanel}
        memo={memo}
        counts={{ activities: project.activities.length, tasks: project.tasks.length, links: project.links.length, drive: drive.files.length }}
      />

      <div className="project-mobile-quick mobile-only">
        <Link className="button primary" href={`/projects/${id}/activities/new`}>＋ 活動</Link>
        <Link className="button" href={`/projects/${id}/tasks/new`}>＋ タスク</Link>
        <Link className="button" href={`/projects/${id}/schedule/new`}>＋ 予定</Link>
      </div>
    </>
  );
}
