import { notFound } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";
import { updateProjectLink } from "@/lib/actions";
import { getProjectHeader, getProjectLinkDetail } from "@/lib/data";

export default async function LinkEditPage({ params }: { params: Promise<{ id: string; linkId: string }> }) {
  const { id, linkId } = await params;
  const [project, link] = await Promise.all([getProjectHeader(id), getProjectLinkDetail(linkId)]);
  if (!project || !link || link.projectId !== id) notFound();
  return <>
    <div className="page-head"><div><h1>関連URL編集</h1><p className="muted">{project.companyName} / {project.name}</p></div></div>
    <form action={updateProjectLink} className="form-card">
      <input type="hidden" name="id" value={link.id}/><input type="hidden" name="project_id" value={id}/><input type="hidden" name="return_to" value={`/projects/${id}?tab=links`}/>
      <div className="form-grid two">
        <label className="field"><span>表示名 *</span><input name="name" required defaultValue={link.name}/></label>
        <label className="field"><span>種類</span><select name="link_type" defaultValue={link.linkType}><option value="teams">Teams</option><option value="google_drive">Google Drive</option><option value="google_docs">Google Docs</option><option value="google_sheets">Google Sheets</option><option value="google_slides">Google Slides</option><option value="website">Webサイト</option><option value="management_system">管理システム</option><option value="other">その他</option></select></label>
      </div>
      <label className="field"><span>URL *</span><input type="url" name="url" required defaultValue={link.url}/></label>
      <label className="field"><span>メモ</span><textarea name="memo" rows={3} defaultValue={link.memo ?? ""}/></label>
      <label className="check-field"><input type="checkbox" name="is_pinned" defaultChecked={link.pinned}/><span>案件上部のクイックリンクに表示する（最大4件）</span></label>
      <div className="form-actions"><a className="button" href={`/projects/${id}?tab=links`}>キャンセル</a><SubmitButton pendingLabel="保存中…">変更を保存</SubmitButton></div>
    </form>
  </>;
}
