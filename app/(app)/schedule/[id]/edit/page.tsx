import { notFound } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";
import { updateSchedule } from "@/lib/actions";
import { getProjectOptions, getScheduleDetail } from "@/lib/data";

export default async function ScheduleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [schedule, projects] = await Promise.all([getScheduleDetail(id), getProjectOptions()]);
  if (!schedule) notFound();
  return <>
    <div className="page-head"><div><h1>予定編集</h1><p className="muted">登録済み予定を修正します。</p></div></div>
    <form action={updateSchedule} className="form-card form-padded">
      <input type="hidden" name="id" value={schedule.id}/><input type="hidden" name="old_project_id" value={schedule.projectId ?? ""}/><input type="hidden" name="return_to" value="/schedule"/>
      <label className="field"><span>件名 *</span><input name="title" required defaultValue={schedule.title}/></label>
      <label className="field"><span>案件</span><select name="project_id" defaultValue={schedule.projectId ?? ""}><option value="">案件なし</option>{projects.map(p=><option key={p.id} value={p.id}>{p.companyName} / {p.name}</option>)}</select></label>
      <div className="form-grid two">
        <label className="field"><span>種別</span><select name="schedule_type" defaultValue={schedule.scheduleType}><option value="visit">訪問</option><option value="online">オンライン</option><option value="phone">電話</option><option value="work">作業</option><option value="deadline">締切</option><option value="other">その他</option></select></label>
        <label className="field"><span>場所</span><input name="location" defaultValue={schedule.location ?? ""}/></label>
        <label className="field"><span>開始 *</span><input type="datetime-local" name="start_at" required defaultValue={schedule.startAt}/></label>
        <label className="field"><span>終了</span><input type="datetime-local" name="end_at" defaultValue={schedule.endAt ?? ""}/></label>
      </div>
      <label className="check-field"><input type="checkbox" name="all_day" defaultChecked={schedule.allDay}/><span>終日予定</span></label>
      <label className="field"><span>内容</span><textarea name="description" rows={4} defaultValue={schedule.description ?? ""}/></label>
      <div className="form-actions"><a className="button" href="/schedule">キャンセル</a><SubmitButton pendingLabel="保存中…">変更を保存</SubmitButton></div>
    </form>
  </>;
}
