import Link from "next/link";
import { notFound } from "next/navigation";
import QuickLinks from "@/components/QuickLinks";
import StatusBadge from "@/components/StatusBadge";
import { priorityLabel } from "@/lib/mock-data";
import { getProject, getProjectDriveSummary } from "@/lib/data";
import { archiveProject, deleteActivity, deleteProjectLink, deleteTask, syncProjectDriveFolderNow } from "@/lib/actions";
import TaskStatusToggle from "@/components/TaskStatusToggle";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, drive] = await Promise.all([getProject(id), getProjectDriveSummary(id, 8)]);
  if (!project) notFound();

  return (
    <>
      <div className="page-head">
        <Link href="/projects" className="small muted">← 案件一覧</Link>
        <div className="top-actions">
          <Link href={`/projects/${id}/edit`} className="button">編集</Link>
          <form action={archiveProject}><input type="hidden" name="id" value={id}/><button className="button danger">アーカイブ</button></form>
        </div>
      </div>

      <section className="project-hero">
        <div className="project-top"><div><div className="small muted">{project.companyName}</div><h1 className="project-title">{project.name}</h1><div className="project-meta"><StatusBadge status={project.status}/><span className="badge">優先度：{priorityLabel[project.priority]}</span><span className="badge">{project.category}</span></div></div></div>
        <div className="next-action"><div className="action-box"><div className="label">次回予定</div><div className="value">{project.nextSchedule ?? "未設定"}</div><Link className="small link-text" href={`/projects/${id}/schedule/new`}>＋ 予定を追加</Link></div><div className="action-box"><div className="label">次にやること</div><div className="value">{project.nextAction ?? "未設定"}</div><div className="small muted">期限：{project.nextActionDue ? project.nextActionDue.replace("T"," ") : "—"}</div></div></div>
        <QuickLinks links={project.links}/>
        <nav className="tabs"><a href="#overview">概要</a><a href="#activities">活動</a><a href="#tasks">タスク</a><a href="#schedule">予定</a><a href="#links">関連リンク</a><a href="#drive">Drive</a><a href="#memo">メモ</a></nav>
      </section>

      <div className="detail-grid">
        <section className="card" id="overview"><div className="card-head"><h2>概要</h2></div><div className="card-body"><div className="kv"><div className="k">取引先</div><div>{project.companyName}</div></div><div className="kv"><div className="k">主担当</div><div>{project.contactName ?? "—"}</div></div><div className="kv"><div className="k">開始日</div><div>{project.startDate ?? "—"}</div></div><div className="kv"><div className="k">納期</div><div>{project.dueDate ?? "—"}</div></div><div className="kv"><div className="k">見込金額</div><div>{project.expectedAmount != null ? `${project.expectedAmount.toLocaleString()}円` : "—"}</div></div><div className="kv"><div className="k">受注金額</div><div>{project.orderAmount != null ? `${project.orderAmount.toLocaleString()}円` : "—"}</div></div><div style={{marginTop:16}}><div className="small muted">案件概要</div><p style={{marginTop:6,whiteSpace:"pre-wrap"}}>{project.description || "—"}</p></div></div></section>
        <section className="card" id="activities"><div className="card-head"><h2>活動履歴</h2><Link className="button soft" href={`/projects/${id}/activities/new`}>＋ 活動</Link></div><div className="card-body timeline">{project.activities.length ? project.activities.map((a) => <div className="timeline-item" key={a.id}><div className="row-actions"><div className="grow"><div className="small muted">{a.date}　{a.type}</div><div className="list-title">{a.title}</div><div style={{whiteSpace:"pre-wrap"}}>{a.content}</div></div><Link className="icon-button edit" title="編集" href={`/projects/${id}/activities/${a.id}/edit`}>✎</Link><form action={deleteActivity}><input type="hidden" name="id" value={a.id}/><input type="hidden" name="project_id" value={id}/><button className="icon-button" title="削除">×</button></form></div></div>) : <div className="empty">活動履歴はまだありません。</div>}</div></section>
      </div>

      <div className="detail-grid">
        <section className="card" id="tasks"><div className="card-head"><h2>タスク</h2><Link className="button soft" href={`/projects/${id}/tasks/new`}>＋ タスク</Link></div><div className="list">{project.tasks.length ? project.tasks.map((t) => <div className="list-row" key={t.id}><TaskStatusToggle id={t.id} status={t.status} projectId={id}/><div className="grow"><div className="list-title">{t.title}</div><div className="small muted">期限：{t.due}</div></div><span className="badge">{t.priority === "high" ? "高" : t.priority === "medium" ? "中" : "低"}</span><Link className="icon-button edit" title="編集" href={`/tasks/${t.id}/edit?return_to=${encodeURIComponent(`/projects/${id}#tasks`)}`}>✎</Link><form action={deleteTask}><input type="hidden" name="id" value={t.id}/><input type="hidden" name="project_id" value={id}/><button className="icon-button" title="削除">×</button></form></div>) : <div className="empty">タスクはまだありません。</div>}</div></section>
        <section className="card" id="links"><div className="card-head"><h2>関連リンク</h2><Link className="button soft" href={`/projects/${id}/links/new`}>＋ URL</Link></div><div className="list">{project.links.length ? project.links.map((link) => <div className="list-row" key={link.id}><div className="grow"><div className="list-title">{link.pinned ? "📌 " : ""}{link.name}</div><div className="small muted">{link.linkType}</div></div><a className="button" href={link.url} target="_blank" rel="noreferrer">開く ↗</a><Link className="icon-button edit" title="編集" href={`/projects/${id}/links/${link.id}/edit`}>✎</Link><form action={deleteProjectLink}><input type="hidden" name="id" value={link.id}/><input type="hidden" name="project_id" value={id}/><button className="icon-button" title="削除">×</button></form></div>) : <div className="empty">関連リンクはまだありません。</div>}</div></section>
      </div>

      <section className="card" id="drive" style={{ marginTop: 18 }}>
        <div className="card-head"><h2>Google Drive</h2><div className="row-actions"><span className="badge">{drive.folders.length}フォルダ</span><Link className="button soft" href={`/projects/${id}/drive`}>{drive.folders.length ? "ファイル一覧" : "＋ フォルダを紐付け"}</Link></div></div>
        <div className="card-body">
          {drive.folders.length ? (
            <>
              <div className="drive-folder-chips">{drive.folders.map((folder) => <div className="drive-folder-chip" key={folder.id}><a href={folder.url} target="_blank" rel="noreferrer">📁 {folder.name} ↗</a><form action={syncProjectDriveFolderNow}><input type="hidden" name="project_id" value={id}/><input type="hidden" name="drive_folder_id" value={folder.id}/><button className="small-link-button" type="submit">↻ 同期</button></form></div>)}</div>
              <div className="drive-recent-head"><div className="small muted">最近更新されたファイル</div><Link className="small link-text" href={`/projects/${id}/drive`}>すべて表示 →</Link></div>
              <div className="list compact-list">{drive.files.length ? drive.files.map((file) => <a className="list-row drive-file-link" href={file.url} target="_blank" rel="noreferrer" key={file.id}><div className="grow"><div className="list-title">{file.name}</div><div className="small muted">{file.relativePath || file.name}{file.modifiedAt ? ` ・ ${new Date(file.modifiedAt).toLocaleDateString("ja-JP",{timeZone:"Asia/Tokyo"})}` : ""}</div></div><span className="badge">{file.fileType || "ファイル"}</span><span>↗</span></a>) : <div className="empty">ファイルはまだ同期されていません。</div>}</div>
            </>
          ) : <div className="empty"><p>案件フォルダを紐付けると、Drive内のファイルをここからすぐ開けます。</p><Link className="button primary" style={{marginTop:12}} href={`/projects/${id}/drive/new`}>Google Driveフォルダを紐付け</Link></div>}
        </div>
      </section>

      <div className="detail-grid">
        <section className="card" id="schedule"><div className="card-head"><h2>予定</h2><Link className="button soft" href={`/projects/${id}/schedule/new`}>＋ 予定</Link></div><div className="card-body"><div className="action-box"><div className="label">次回予定</div><div className="value">{project.nextSchedule ?? "未設定"}</div></div></div></section>
        <section className="card" id="memo"><div className="card-head"><h2>メモ</h2><Link className="small muted" href={`/projects/${id}/edit`}>編集</Link></div><div className="card-body" style={{whiteSpace:"pre-wrap"}}>{project.memo ?? "メモはありません。"}</div></section>
      </div>
    </>
  );
}
