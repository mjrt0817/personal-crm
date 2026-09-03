import GoogleCalendarConnectButton from "@/components/GoogleCalendarConnectButton";
import { disconnectGoogleCalendar } from "@/lib/actions";
import { getGoogleCalendarConnectionStatus } from "@/lib/data";

function formatDateTime(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const calendar = typeof params.calendar === "string" ? params.calendar : "";
  const status = await getGoogleCalendarConnectionStatus();

  return (
    <>
      <div className="page-head"><div><h1>設定</h1><p className="muted">認証・Google連携などを管理します。</p></div></div>

      {calendar === "connected" && <div className="notice success-notice">Google Calendarとの接続が完了しました。</div>}
      {calendar === "disconnected" && <div className="notice">Google Calendarとの接続を解除しました。</div>}
      {calendar === "save_error" && <div className="notice error-notice">Google Calendarの接続情報を保存できませんでした。Vercel環境変数とDB migrationを確認してください。</div>}

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="card-head"><h2>Google Calendar</h2><span className={`badge ${status.connected ? "green" : ""}`}>{status.connected ? "接続済み" : "未接続"}</span></div>
        <div className="card-body">
          <p className="muted">接続すると、アプリで予定を追加・編集・削除した際にGoogle Calendarへ自動反映します。Google側の変更はスケジュール画面の「Googleから同期」で取り込みます。</p>
          <div className="kv"><div className="k">状態</div><div>{status.connected ? "接続済み" : "未接続"}</div></div>
          <div className="kv"><div className="k">Googleアカウント</div><div>{status.googleEmail ?? "—"}</div></div>
          <div className="kv"><div className="k">接続日時</div><div>{formatDateTime(status.connectedAt)}</div></div>
          <div className="kv"><div className="k">最終同期</div><div>{formatDateTime(status.lastSyncAt)}</div></div>
          {status.lastSyncError && <div className="kv"><div className="k">同期エラー</div><div style={{ color: "var(--danger)" }}>{status.lastSyncError}</div></div>}
          <div className="row-actions" style={{ marginTop: 18, flexWrap: "wrap" }}>
            <GoogleCalendarConnectButton connected={status.connected} />
            {status.connected && <form action={disconnectGoogleCalendar}><button className="button danger" type="submit">接続を解除</button></form>}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><h2>基本設定</h2></div>
        <div className="card-body">
          <div className="kv"><div className="k">認証</div><div>Google / Supabase Auth</div></div>
          <div className="kv"><div className="k">タイムゾーン</div><div>Asia/Tokyo</div></div>
          <div className="kv"><div className="k">クイックリンク</div><div>案件ごとに最大4件</div></div>
        </div>
      </section>
    </>
  );
}
