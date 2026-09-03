import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProjectDriveFolder, syncProjectDriveFolderNow } from "@/lib/actions";
import { getProjectDriveSummary, getProjectHeader } from "@/lib/data";

function p(params: Record<string, string | string[] | undefined>, key: string) {
  const v = params[key];
  return typeof v === "string" ? v : "";
}

function formatDate(value?: string) {
  if (!value) return "未同期";
  return new Date(value).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

export default async function ProjectDrivePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const [project, drive] = await Promise.all([getProjectHeader(id), getProjectDriveSummary(id, 500)]);
  if (!project) notFound();
  const state = p(query, "drive");
  const count = p(query, "count");

  return (
    <>
      <div className="page-head">
        <div><Link href={`/projects/${id}`} className="small muted">← 案件詳細</Link><h1>Google Drive</h1><p className="muted">{project.companyName} / {project.name}</p></div>
        <Link className="button primary" href={`/projects/${id}/drive/new`}>＋ フォルダを紐付け</Link>
      </div>

      {state === "added" && <div className="notice success-notice">Driveフォルダを紐付け、{count || "0"}件を同期しました。</div>}
      {state === "synced" && <div className="notice success-notice">Google Driveを同期しました。{count || "0"}件を確認しました。{p(query,"truncated") === "1" ? "（上限500件まで）" : ""}</div>}
      {state === "removed" && <div className="notice">Driveフォルダの紐付けを解除しました。Google Drive上のファイルは削除していません。</div>}
      {state === "error" && <div className="notice error-notice">Google Drive同期に失敗しました：{p(query,"message") || "Google連携と権限を確認してください。"}</div>}

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="card-head"><h2>連携フォルダ</h2><span className="badge">{drive.folders.length}件</span></div>
        <div className="list">
          {drive.folders.length ? drive.folders.map((folder) => (
            <div className="list-row drive-folder-row" key={folder.id}>
              <div className="grow">
                <div className="list-title">📁 {folder.name}</div>
                <div className="small muted">最終同期：{formatDate(folder.lastSyncAt)}</div>
                {folder.lastSyncError && <div className="small" style={{ color: "var(--danger)", marginTop: 4 }}>{folder.lastSyncError}</div>}
              </div>
              <div className="row-action-group">
                <a className="button" href={folder.url} target="_blank" rel="noreferrer">Driveで開く ↗</a>
                <form action={syncProjectDriveFolderNow}><input type="hidden" name="project_id" value={id}/><input type="hidden" name="drive_folder_id" value={folder.id}/><button className="button soft" type="submit">↻ 同期</button></form>
                <form action={deleteProjectDriveFolder}><input type="hidden" name="project_id" value={id}/><input type="hidden" name="drive_folder_id" value={folder.id}/><button className="button danger" type="submit">解除</button></form>
              </div>
            </div>
          )) : <div className="empty">まだGoogle Driveフォルダが紐付いていません。</div>}
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2>同期済みファイル</h2><span className="badge">{drive.files.length}件</span></div>
        <div className="list drive-file-list">
          {drive.files.length ? drive.files.map((file) => (
            <div className="list-row" key={file.id}>
              <div className="drive-file-icon">{file.fileType === "PDF" ? "PDF" : "▤"}</div>
              <div className="grow">
                <div className="list-title">{file.name}</div>
                <div className="small muted">{file.relativePath || file.name}</div>
                <div className="small muted">{file.fileType || "ファイル"}{file.modifiedAt ? ` ・ 更新 ${formatDate(file.modifiedAt)}` : ""}</div>
              </div>
              <a className="button" href={file.url} target="_blank" rel="noreferrer">開く ↗</a>
            </div>
          )) : <div className="empty">同期済みファイルはありません。フォルダを紐付けるか「同期」を実行してください。</div>}
        </div>
      </section>
    </>
  );
}
