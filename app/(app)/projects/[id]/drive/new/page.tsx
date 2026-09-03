import Link from "next/link";
import { notFound } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";
import { createProjectDriveFolder } from "@/lib/actions";
import { getProjectHeader } from "@/lib/data";

export default async function NewDriveFolderPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const project = await getProjectHeader(id);
  if (!project) notFound();
  const error = typeof query.error === "string" ? query.error : "";

  return (
    <>
      <div className="page-head">
        <div><Link href={`/projects/${id}/drive`} className="small muted">← Google Drive</Link><h1>Driveフォルダを紐付け</h1><p className="muted">{project.companyName} / {project.name}</p></div>
      </div>
      {error && <div className="notice error-notice">{error}</div>}
      <form action={createProjectDriveFolder} className="form-card">
        <input type="hidden" name="project_id" value={id} />
        <section className="form-section">
          <h2>Google Driveフォルダ</h2>
          <label className="field">
            <span>フォルダURL *</span>
            <input name="folder_url" type="url" required placeholder="https://drive.google.com/drive/folders/..." autoFocus />
          </label>
          <p className="small muted">案件で利用しているフォルダのURLを貼り付けてください。登録時にフォルダ内を同期します。サブフォルダも対象です。</p>
        </section>
        <div className="form-actions"><Link href={`/projects/${id}/drive`} className="button">キャンセル</Link><SubmitButton pendingLabel="Driveを確認中…">紐付けて同期</SubmitButton></div>
      </form>
    </>
  );
}
