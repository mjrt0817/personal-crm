import Link from "next/link";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";
import { getDashboardSnapshot, getGoogleCalendarConnectionStatus } from "@/lib/data";

function formatDateTime(value?: string) {
  if (!value) return "未同期";
  return new Date(value).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function dueLabel(value?: string | null) {
  if (!value) return "期限なし";
  return new Date(value).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function DashboardPage() {
  const [snapshot, calendar] = await Promise.all([getDashboardSnapshot(), getGoogleCalendarConnectionStatus()]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>ホーム</h1>
          <p className="muted">今日やること、止まっている案件、最近の資料をここから確認します。</p>
        </div>
        <Link href="/projects/new" className="button primary">＋ 案件登録</Link>
      </div>

      {calendar.connected && (
        <div className="sync-strip dashboard-sync-strip">
          <span className={`badge ${calendar.lastSyncError ? "red" : "green"}`}>{calendar.lastSyncError ? "Calendar同期エラー" : "Calendar自動同期"}</span>
          <span className="small muted">最終同期：{formatDateTime(calendar.lastSyncAt)}　・　アプリ利用中は約5分間隔でGoogle側の変更を確認します。</span>
          <Link href="/schedule" className="small link-text">予定を確認 →</Link>
        </div>
      )}

      <div className="grid-4">
        <MetricCard label="今日の予定" value={snapshot.todayScheduleCount} note="Google連携含む"/>
        <MetricCard label="未完了タスク" value={snapshot.unfinishedTaskCount} note="全案件"/>
        <MetricCard label="期限超過" value={snapshot.overdueTaskCount} note="要対応"/>
        <MetricCard label="対応中案件" value={snapshot.activeProjectCount} note="完了・失注以外"/>
      </div>

      <div className="two-col">
        <section className="card">
          <div className="card-head"><h2>今日・直近の予定</h2><Link href="/schedule" className="small muted">すべて見る</Link></div>
          <div className="list">
            {snapshot.upcomingSchedules.length ? snapshot.upcomingSchedules.map((s) => (
              <div className="list-row" key={s.id}>
                <div className="schedule-date-block"><strong>{s.date}</strong><div className="small muted">{s.time}</div></div>
                <div className="grow"><div className="list-title">{s.title}</div><div className="small muted">{s.company}</div></div>
                {s.googleSyncStatus === "synced" && <span className="badge green desktop-only">Google</span>}
                {s.projectId && <Link className="button" href={`/projects/${s.projectId}`}>案件へ</Link>}
              </div>
            )) : <div className="empty">今後の予定はありません。</div>}
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h2>要確認</h2><Link href="/tasks" className="small muted">タスク一覧</Link></div>
          <div className="list">
            {snapshot.overdueTasks.map((t) => (
              <div className="list-row" key={`over-${t.id}`}>
                <span className="badge red">期限超過</span>
                <div className="grow"><div className="list-title">{t.title}</div><div className="small muted">{t.companyName ?? "単独タスク"} ・ {dueLabel(t.dueAt)}</div></div>
                {t.projectId && <Link className="icon-button edit" title="案件へ" href={`/projects/${t.projectId}`}>→</Link>}
              </div>
            ))}
            {snapshot.staleProjects.map((p) => (
              <Link className="list-row" href={`/projects/${p.id}`} key={`stale-${p.id}`}>
                <span className="badge orange">14日活動なし</span>
                <div className="grow"><div className="list-title">{p.name}</div><div className="small muted">{p.companyName} ・ 次：{p.nextAction ?? "未設定"}</div></div>
              </Link>
            ))}
            {snapshot.noNextProjects.slice(0, 3).map((p) => (
              <Link className="list-row" href={`/projects/${p.id}`} key={`next-${p.id}`}>
                <span className="badge">次回未設定</span>
                <div className="grow"><div className="list-title">{p.name}</div><div className="small muted">{p.companyName}</div></div>
              </Link>
            ))}
            {!snapshot.overdueTasks.length && !snapshot.staleProjects.length && !snapshot.noNextProjects.length && <div className="empty">要確認項目はありません。</div>}
          </div>
        </section>
      </div>

      <div className="two-col">
        <section className="card">
          <div className="card-head"><h2>最近の案件</h2><Link href="/projects" className="small muted">案件一覧</Link></div>
          <div className="list">
            {snapshot.recentProjects.map((p) => (
              <Link className="list-row" href={`/projects/${p.id}`} key={p.id}>
                <div className="grow"><div className="list-title">{p.name}</div><div className="small muted">{p.companyName}　・　次：{p.nextAction ?? "未設定"}</div></div>
                <StatusBadge status={p.status}/>
              </Link>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h2>最近更新されたDriveファイル</h2><span className="badge">{snapshot.recentDriveFiles.length}件</span></div>
          <div className="list compact-list">
            {snapshot.recentDriveFiles.length ? snapshot.recentDriveFiles.map((file) => (
              <div className="list-row drive-dashboard-row" key={file.id}>
                <div className="drive-file-icon">{file.fileType === "PDF" ? "PDF" : "▤"}</div>
                <div className="grow">
                  <a className="list-title drive-file-title" href={file.url} target="_blank" rel="noreferrer">{file.name} ↗</a>
                  <div className="small muted">{file.companyName ?? "—"}{file.projectName ? ` / ${file.projectName}` : ""}</div>
                  {file.modifiedAt && <div className="small muted">更新：{formatDateTime(file.modifiedAt)}</div>}
                </div>
                {file.projectId && <Link className="button" href={`/projects/${file.projectId}#drive`}>案件へ</Link>}
              </div>
            )) : <div className="empty">同期済みのDriveファイルはまだありません。</div>}
          </div>
        </section>
      </div>
    </>
  );
}
