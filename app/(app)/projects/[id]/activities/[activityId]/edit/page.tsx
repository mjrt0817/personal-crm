import { notFound } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";
import { updateActivity } from "@/lib/actions";
import { getActivityDetail, getProjectHeader } from "@/lib/data";

export default async function ActivityEditPage({ params }: { params: Promise<{ id: string; activityId: string }> }) {
  const { id, activityId } = await params;
  const [project, activity] = await Promise.all([getProjectHeader(id), getActivityDetail(activityId)]);
  if (!project || !activity || activity.projectId !== id) notFound();
  return <>
    <div className="page-head"><div><h1>活動履歴編集</h1><p className="muted">{project.companyName} / {project.name}</p></div></div>
    <form action={updateActivity} className="form-card">
      <input type="hidden" name="id" value={activity.id}/><input type="hidden" name="project_id" value={id}/><input type="hidden" name="old_project_id" value={id}/><input type="hidden" name="company_id" value={project.companyId}/><input type="hidden" name="return_to" value={`/projects/${id}#activities`}/>
      <div className="form-grid two">
        <label className="field"><span>種別</span><select name="activity_type" defaultValue={activity.activityType}><option value="visit">訪問</option><option value="phone">電話</option><option value="email">メール</option><option value="online_meeting">オンライン会議</option><option value="proposal">提案</option><option value="quotation">見積</option><option value="other">その他</option></select></label>
        <label className="field"><span>日時</span><input type="datetime-local" name="activity_at" defaultValue={activity.activityAt}/></label>
      </div>
      <label className="field"><span>件名</span><input name="title" defaultValue={activity.title ?? ""}/></label>
      <label className="field"><span>活動内容 *</span><textarea name="content" rows={6} required defaultValue={activity.content}/></label>
      <div className="form-grid two"><label className="field"><span>次回アクション</span><input name="next_action" defaultValue={activity.nextAction ?? ""}/></label><label className="field"><span>次回期限（案件へ反映する場合）</span><input type="datetime-local" name="next_action_due"/></label></div>
      <label className="check-field"><input type="checkbox" name="update_project_next_action"/><span>編集した「次回アクション」を案件にも反映する</span></label>
      <div className="form-actions"><a className="button" href={`/projects/${id}#activities`}>キャンセル</a><SubmitButton pendingLabel="保存中…">変更を保存</SubmitButton></div>
    </form>
  </>;
}
