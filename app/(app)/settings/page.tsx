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
      <div className="page-head"><div><h1>設定</h1><p className="muted">認証・Google Workspace連携などを管理します。</p></div></div>

      {calendar === "connected" && <div className="notice success-notice">Google Workspaceとの接続が完了しました。</div>}
      {calendar === "disconnected" && <div className="notice">Google Workspaceとの接続を解除しました。</div>}
      {calendar === "save_error" && <div className="notice error-notice">Google連携情報を保存できませんでした。Vercel環境変数とDB migrationを確認してください。</div>}

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="card-head"><h2>Google Workspace</h2><span className={`badge ${status.connected ? "green" : ""}`}>{status.connected ? "接続済み" : "未接続"}</span></div>
        <div className="card-body">
          <p className="muted">Google Calendar・Google Drive・Gmailを同じGoogleアカウントで連携します。Calendarは予定同期、Driveは案件フォルダ、Gmailは案件に関連するメールの参照に利用します。</p>
          <div className="kv"><div className="k">状態</div><div>{status.connected ? "接続済み" : "未接続"}</div></div>
          <div className="kv"><div className="k">Googleアカウント</div><div>{status.googleEmail ?? "—"}</div></div>
          <div className="kv"><div className="k">Calendar</div><div>予定の作成・更新・削除＋アプリ利用中の約5分間隔自動同期</div></div>
          <div className="kv"><div className="k">Drive</div><div>案件フォルダのメタデータ読み取り（ファイル本文は保存しません）</div></div>
          <div className="kv"><div className="k">Gmail</div><div>取引先・担当者メールアドレスで関連メールを検索し、件名・送受信者・日時・本文snippetを案件へ保存</div></div>
          <div className="kv"><div className="k">接続日時</div><div>{formatDateTime(status.connectedAt)}</div></div>
          <div className="kv"><div className="k">Calendar最終同期</div><div>{formatDateTime(status.lastSyncAt)}</div></div>
          {status.lastSyncError && <div className="kv"><div className="k">同期エラー</div><div style={{ color: "var(--danger)" }}>{status.lastSyncError}</div></div>}
          <div className="row-actions" style={{ marginTop: 18, flexWrap: "wrap" }}>
            <GoogleCalendarConnectButton connected={status.connected} />
            {status.connected && <form action={disconnectGoogleCalendar}><button className="button danger" type="submit">Google連携を解除</button></form>}
          </div>
          {status.connected && <><p className="small muted" style={{ marginTop: 12 }}>Google Calendarはアプリを開いている間と、タブへ戻った時に自動同期します。Gmailは案件の活動画面から手動同期します。</p><p className="small muted" style={{ marginTop: 8 }}>Gmail連携では制限付きOAuthスコープを使用します。個人利用を前提とした機能です。第三者向けに公開する場合はGoogleのOAuth審査要件を別途確認してください。</p></>}
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
