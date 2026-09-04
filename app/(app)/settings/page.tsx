import GoogleCalendarConnectButton from "@/components/GoogleCalendarConnectButton";
import SubmitButton from "@/components/SubmitButton";
import { disconnectGoogleCalendar, saveActionPreferences } from "@/lib/actions";
import { getGoogleCalendarConnectionStatus } from "@/lib/data";
import { getActionPreferences } from "@/lib/preferences";
import { getAiConfigStatus } from "@/lib/openai-server";

function formatDateTime(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const calendar = typeof params.calendar === "string" ? params.calendar : "";
  const actionRules = typeof params.action_rules === "string" ? params.action_rules : "";
  const [status, prefs] = await Promise.all([getGoogleCalendarConnectionStatus(), getActionPreferences()]);
  const ai = getAiConfigStatus();

  return (
    <>
      <div className="page-head"><div><h1>設定</h1><p className="muted">認証・Google Workspace・AI・優先アクション条件を管理します。</p></div></div>

      {calendar === "connected" && <div className="notice success-notice">Google Workspaceとの接続が完了しました。</div>}
      {calendar === "disconnected" && <div className="notice">Google Workspaceとの接続を解除しました。</div>}
      {calendar === "save_error" && <div className="notice error-notice">Google連携情報を保存できませんでした。Vercel環境変数とDB migrationを確認してください。</div>}
      {actionRules === "saved" && <div className="notice success-notice">優先アクションの判定条件を保存しました。</div>}

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

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="card-head"><h2>AI参謀</h2><span className={`badge ${ai.configured ? "green" : ""}`}>{ai.configured ? "利用可能" : "未設定"}</span></div>
        <div className="card-body">
          <div className="kv"><div className="k">モデル</div><div>{ai.model}</div></div>
          <div className="kv"><div className="k">APIキー</div><div>{ai.configured ? "Vercelに設定済み" : "OPENAI_API_KEY 未設定"}</div></div>
          <p className="small muted" style={{ marginTop: 12 }}>AIは自動実行しません。「生成」ボタンを押した場合だけ、必要なCRMテキストをOpenAI APIへ送信します。APIキーはサーバー側のみで利用します。</p>
        </div>
      </section>

      <section className="card" id="action-rules" style={{ marginBottom: 18 }}>
        <div className="card-head"><div><h2>優先アクションの判定条件</h2><div className="small muted">候補が少ない／多いと感じた場合に調整できます。</div></div></div>
        <form action={saveActionPreferences} className="card-body settings-form">
          <div className="form-grid action-rule-grid">
            <label className="field"><span>回答待ちをフォロー候補にする日数</span><input type="number" min="1" max="30" name="waiting_followup_days" defaultValue={prefs.waitingFollowupDays}/><small>フォロー予定日が未設定の場合</small></label>
            <label className="field"><span>活動なし案件を要確認にする日数</span><input type="number" min="3" max="90" name="stale_project_days" defaultValue={prefs.staleProjectDays}/><small>3〜90日</small></label>
            <label className="field"><span>タスク・次回アクションの先読み日数</span><input type="number" min="1" max="30" name="task_horizon_days" defaultValue={prefs.taskHorizonDays}/><small>期限がこの日数以内なら候補化</small></label>
            <label className="field"><span>予定の先読み日数</span><input type="number" min="1" max="30" name="schedule_horizon_days" defaultValue={prefs.scheduleHorizonDays}/><small>予定準備の候補範囲</small></label>
            <label className="field"><span>案件納期の先読み日数</span><input type="number" min="1" max="30" name="project_due_horizon_days" defaultValue={prefs.projectDueHorizonDays}/><small>納期接近として候補化</small></label>
            <label className="field"><span>未処理Gmailの参照日数</span><input type="number" min="1" max="30" name="gmail_lookback_days" defaultValue={prefs.gmailLookbackDays}/><small>最近何日分を候補にするか</small></label>
          </div>
          <div className="row-actions" style={{ marginTop: 16 }}><SubmitButton>判定条件を保存</SubmitButton></div>
        </form>
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
