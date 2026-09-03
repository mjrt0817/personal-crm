# Personal CRM Ver.1.4

個人用 SFA + CRM + 案件・タスク・スケジュール管理ツールです。

Ver.1.4では Google Calendar との連携を次の段階へ進めています。

- アプリで予定を新規登録 → Google Calendarへ自動作成
- アプリで予定を編集 → Google Calendarへ自動更新
- アプリで予定を削除 → Google Calendarからも自動削除
- Google Calendar側で変更 → 「Googleから同期」でアプリへ反映
- Google Calendar側で削除 → 「Googleから同期」でアプリ側も削除
- Ver.1.3までの「Google Calendarへ登録」ボタンで作成した同名・同時刻予定は、同期時に自動で既存CRM予定と紐付け
- CRMと無関係なGoogle Calendar予定は取り込まない

> 今回は「CRMに登録した予定」を双方向に保つ方式です。Google Calendarで新しく作った無関係な予定をCRMへ全部取り込む仕様にはしていません。個人・家族予定がCRMへ混ざることを防ぐためです。

---

## Ver.1.3からの更新手順

### 1. GitHubへVer.1.4を上書き

ZIPを展開し、`personal-crm-v1.4` フォルダの**中身**を現在のGitHubリポジトリ直下へ上書きしてください。

VercelのGitHub連携により自動デプロイされますが、先に以下のSupabase / Google / Vercel設定も行ってください。

---

## 2. Supabase migrationを実行

Supabase Dashboardで以下を開きます。

`SQL Editor` → `New query`

次のファイルを全文貼り付けて `Run` してください。

`supabase/migrations/003_google_calendar_sync.sql`

追加される主なもの：

- `schedules.google_calendar_id`
- `schedules.google_sync_status`
- `schedules.google_sync_error`
- `schedules.google_updated_at`
- `schedules.google_html_link`
- `google_calendar_connections` テーブル

既存の案件・タスク・予定データは削除しません。

---

## 3. Google Calendar APIを有効化

Google Cloud Consoleで、Personal CRM用に作成した既存Projectを開きます。

1. 上部検索で `Google Calendar API` を検索
2. `Google Calendar API` を開く
3. `Enable` / `有効にする` を押す

既に有効なら何もしなくて構いません。

---

## 4. Google Auth PlatformへCalendar scopeを追加

Google Cloud Console → `Google Auth Platform` → `Data Access` を開きます。

次のscopeを追加してください。

```text
https://www.googleapis.com/auth/calendar.events
```

このscopeは、Google Calendarの予定を表示・追加・変更・削除するために使います。

現在アプリがTestingの場合は、これまで通り自分のGoogleアカウントをTest userにしておけば構いません。

---

## 5. Vercelへ環境変数を3個追加

既存の4項目はそのまま残します。

```text
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
ALLOWED_EMAILS=...
```

追加で以下を設定します。

### GOOGLE_OAUTH_CLIENT_ID

Supabase → Authentication → Google Provider に設定したものと**同じGoogle OAuth Client ID**です。

```text
GOOGLE_OAUTH_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
```

### GOOGLE_OAUTH_CLIENT_SECRET

同じOAuth ClientのClient Secretです。

```text
GOOGLE_OAUTH_CLIENT_SECRET=xxxxxxxx
```

これは秘密情報です。`NEXT_PUBLIC_` を付けないでください。GitHubにも登録しません。

### GOOGLE_TOKEN_ENCRYPTION_KEY

GoogleのRefresh TokenをSupabaseへ保存する際の暗号化キーです。

32文字以上のランダム値を推奨します。

PowerShellで生成する場合：

```powershell
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 32
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
$rng.Dispose()
```

表示された文字列をそのままValueに設定します。

```text
GOOGLE_TOKEN_ENCRYPTION_KEY=生成されたランダム文字列
```

この値もGitHubには登録しません。

---

## 6. VercelをRedeploy

環境変数追加後、必ず再デプロイしてください。

GitHubへのVer.1.4 push後のDeploymentに3つの新しい環境変数が入っていることを確認します。

---

## 7. アプリからGoogle Calendarを接続

Ver.1.4へログイン後、

`設定` → `Google Calendar` → `Google Calendarと接続`

を押します。

Googleの同意画面が表示されます。

Calendarの予定を扱う権限を許可してください。

正常終了すると設定画面に戻り、

```text
Google Calendar
接続済み
```

と表示されます。

この接続操作ではGoogleのRefresh Tokenを取得し、`GOOGLE_TOKEN_ENCRYPTION_KEY` で暗号化してSupabaseへ保存します。

---

# 動作確認

## A. アプリ → Google

1. CRMの「スケジュール」から新しい予定を作成
2. Google Calendarを開く
3. 同じ予定が自動で作成されていることを確認

その後CRM側でタイトルや時間を変更し、Google側も更新されることを確認します。

---

## B. Google → アプリ

1. CRMから作成してGoogleと同期済みの予定をGoogle Calendar側で編集
2. CRMの「スケジュール」を開く
3. `Googleから同期` を押す
4. CRM側へ変更が反映されることを確認

Google Calendar側で予定を削除した場合も、`Googleから同期` 後にCRM側から削除されます。

---

## C. Ver.1.3までの旧方式

Ver.1.3の `Google Calendar ↗` から手動作成した予定は、まだGoogle Event IDをCRMが知りません。

Ver.1.4の `Googleから同期` は、

- 件名が同じ
- 開始時刻が同じ

既存予定を見つけると自動でGoogle Event IDを紐付けます。

一致する予定がGoogle側にない場合、CRM側には「Google未同期」と表示されるので `再同期` を押してください。

---

# 同期方針

## アプリ側操作

Google接続済みの場合：

- 新規：自動同期
- 編集：自動同期
- 削除：Googleも削除

Google APIが一時的に失敗した場合、CRMの保存自体は維持し、予定に「同期エラー」を表示します。`再同期` から再実行できます。

## Google側操作

Google Calendarは外部サービスのため、Ver.1.4ではCRM画面の `Googleから同期` を押した時に変更を取得します。

常時リアルタイム監視（Google Calendar Push Notifications / Webhook）は次段階候補です。

---

# セキュリティ

Google ProviderのRefresh Tokenは強い権限を持つため、平文では保存しません。

Ver.1.4では：

1. GoogleからRefresh Tokenを取得
2. Vercelサーバー側でAES-256-GCM暗号化
3. 暗号文だけをSupabaseへ保存
4. Google APIアクセス時のみサーバー側で復号

という構成です。

以下は絶対にGitHubへコミットしないでください。

- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_TOKEN_ENCRYPTION_KEY`
- Supabase Secret key / service_role key
- Database password
- `.env.local`

Ver.1.4でもSupabase Secret key / service_role keyは使用しません。

---

# 環境変数一覧

```text
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
ALLOWED_EMAILS=your-google-account@example.com

GOOGLE_OAUTH_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=xxxxx
GOOGLE_TOKEN_ENCRYPTION_KEY=xxxxx
```

---

# Ver.1.4の次候補

- Google Calendar Push Notificationsによる自動取り込み
- CRM専用Google Calendarの選択・作成
- Google Drive API連携
- 案件画面からDriveファイル一覧を自動表示
- Gmail連携
