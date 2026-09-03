import Link from "next/link";
import { deleteSchedule, importGoogleCalendar, syncScheduleNow } from "@/lib/actions";
import { getGoogleCalendarConnectionStatus, getSchedules } from "@/lib/data";
import { googleCalendarEventUrl } from "@/lib/google-calendar";

function p(params: Record<string, string | string[] | undefined>, key: string) {
  return typeof params[key] === "string" ? params[key] as string : "";
}

export default async function SchedulePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const [schedules, calendar] = await Promise.all([getSchedules(), getGoogleCalendarConnectionStatus()]);
  const sync = p(params, "sync");

  return <>
    <div className="page-head">
      <div><h1>スケジュール</h1><p className="muted">予定を案件とGoogle Calendarの両方で管理します。</p></div>
      <div className="row-action-group">
        {calendar.connected
          ? <form action={importGoogleCalendar}><button className="button soft" type="submit">↻ Googleから同期</button></form>
          : <Link href="/settings" className="button soft">Google Calendarを接続</Link>}
        <Link href="/schedule/new" className="button primary">＋ 予定</Link>
      </div>
    </div>

    {sync === "ok" && <div className="notice success-notice">Google Calendarを同期しました。連携予定の更新 {p(params,"updated")}件 / 旧方式の予定と紐付け {p(params,"linked")}件 / Google側の削除反映 {p(params,"deleted")}件 / CRM対象外 {p(params,"skipped")}件</div>}
    {sync === "error" && <div className="notice error-notice">Google Calendar同期に失敗しました：{p(params,"message") || "設定を確認してください。"}</div>}
    {calendar.connected && <div className="sync-strip"><span className={`badge ${calendar.lastSyncError ? "red" : "green"}`}>{calendar.lastSyncError ? "Google同期エラー" : "自動同期 ON"}</span><span className="small muted">アプリ側の追加・編集・削除は即時反映。Google側の変更もアプリ利用中は約5分間隔で自動取得します。「Googleから同期」は今すぐ反映したい時の手動同期です。</span>{calendar.lastSyncAt && <span className="small muted">最終：{new Date(calendar.lastSyncAt).toLocaleString("ja-JP",{timeZone:"Asia/Tokyo"})}</span>}</div>}

    <section className="card">
      {schedules.length === 0 ? <div className="empty">予定はまだありません。</div> : <div className="list">{schedules.map(s => <div className="list-row" key={s.id}>
        <div style={{minWidth:100}}><strong>{s.date}</strong><div className="small muted">{s.time}</div></div>
        <div className="grow">
          <div className="list-title">{s.title}</div>
          <div className="small muted">{s.company}</div>
          <div className="sync-meta">
            {s.googleSyncStatus === "synced" && <span className="badge green">Google同期済み</span>}
            {s.googleSyncStatus === "error" && <span className="badge red" title={s.googleSyncError}>同期エラー</span>}
            {s.googleSyncStatus === "not_synced" && <span className="badge">Google未同期</span>}
          </div>
        </div>
        <div className="row-action-group">
          {s.googleHtmlLink
            ? <a className="button soft" href={s.googleHtmlLink} target="_blank" rel="noreferrer">Googleで開く ↗</a>
            : !calendar.connected && <a className="button soft" href={googleCalendarEventUrl({title:s.title,startAt:s.startAt,endAt:s.endAt,allDay:s.allDay,location:s.location,description:s.description})} target="_blank" rel="noreferrer">Google登録画面 ↗</a>}
          {calendar.connected && s.googleSyncStatus !== "synced" && <form action={syncScheduleNow}><input type="hidden" name="id" value={s.id}/>{s.projectId&&<input type="hidden" name="project_id" value={s.projectId}/>}<button className="button" type="submit">再同期</button></form>}
          {s.projectId&&<Link className="button" href={`/projects/${s.projectId}`}>案件へ</Link>}
          <Link className="icon-button edit" title="編集" href={`/schedule/${s.id}/edit`}>✎</Link>
          <form action={deleteSchedule}><input type="hidden" name="id" value={s.id}/>{s.projectId&&<input type="hidden" name="project_id" value={s.projectId}/>}<button className="icon-button" title="削除">×</button></form>
        </div>
      </div>)}</div>}
    </section>
  </>;
}
