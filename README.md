# Personal CRM Ver.1.6

個人用 SFA + CRM + 案件・タスク・スケジュール管理ツールです。

Ver.1.6では、Ver.1.5のGoogle Calendar / Google Drive連携を土台に、**Calendarの自動取り込み**と**日常利用向けダッシュボード強化**を行いました。

## Ver.1.6の主な追加・改善

- Google Calendar側の変更を約5分間隔で自動取得
- アプリを開いた直後、タブへ戻った時にも自動同期を確認
- 前回同期以降に更新されたGoogle予定だけを取得し、API通信量を削減
- 手動の「Googleから同期」も引き続き利用可能
- 自動同期成功・エラーをトースト表示
- ダッシュボードにCalendar最終同期状態を表示
- ダッシュボードを実務向けに強化
  - 今日・直近の予定
  - 期限超過タスク
  - 14日間活動がない案件
  - 次回アクション未設定案件
  - 最近の案件
  - 最近更新されたGoogle Driveファイル
- Driveフォルダの最終同期日時・同期エラーを案件詳細でも表示
- スマホの案件詳細に「＋活動 / ＋タスク / ＋予定」のクイック操作を追加

---

# Ver.1.5からの更新手順

## 1. Supabase

**Ver.1.6では追加migrationはありません。**

Ver.1.5までの以下が実行済みなら、そのままで大丈夫です。

```text
002_performance_indexes.sql
003_google_calendar_sync.sql
004_google_drive_integration.sql
```

## 2. Google Cloud

追加設定はありません。

既に次が有効ならそのまま利用します。

- Google Calendar API
- Google Drive API

OAuth scope：

```text
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/drive.metadata.readonly
```

Google Workspaceの再接続もVer.1.5で完了済みなら不要です。

## 3. Vercel

追加の環境変数はありません。

既存の以下をそのまま利用します。

```text
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
ALLOWED_EMAILS=your-google-account@example.com
GOOGLE_OAUTH_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=xxxxx
GOOGLE_TOKEN_ENCRYPTION_KEY=xxxxx
```

## 4. GitHubへVer.1.6を上書き

ZIPを展開して、`personal-crm-v1.6` フォルダの**中身**を現在のGitHubリポジトリ直下へ上書きしてください。

`main` へ反映するとVercelの自動デプロイが動きます。

---

# Google Calendar自動同期の動き

Ver.1.6ではVercelの定期Cronを使わず、**ログイン中のアプリ自身がバックグラウンドで同期を行う方式**にしています。

```text
アプリを開く
   ↓
約1秒後に同期確認
   ↓
Google側に変更があればCRMへ反映
   ↓
アプリ利用中は約5分間隔
   ↓
別タブからCRMへ戻った時にも確認
```

## なぜこの方式か

- 個人利用ではアプリを開いている時に最新になれば実用上十分
- SupabaseのSecret keyを追加せずに済む
- Vercel Cronのプラン制限に依存しない
- 同期のためだけに常時バックグラウンド処理を走らせない

そのため、**アプリを完全に閉じている間は同期しません。**
次にCRMを開いた時に自動でGoogle側の変更を取り込みます。

24時間バックグラウンドで同期する仕組みは、必要になった段階で別途追加可能です。

---

# Calendar同期の仕様

## CRM → Google

従来通り即時反映です。

- CRM予定追加 → Google Calendarへ作成
- CRM予定編集 → Google Calendarを更新
- CRM予定削除 → Google Calendarから削除

## Google → CRM

Ver.1.6から自動化しました。

- Google側で日時変更 → 自動取得
- Google側で件名変更 → 自動取得
- Google側で場所・内容変更 → 自動取得
- Google側で削除 → CRM側も削除

CRMと紐付いていない個人予定・家族予定などは従来通り取り込みません。

## API通信量の削減

手動同期では対象期間を確認しますが、自動同期では原則として**前回同期後に更新されたイベントだけ**をGoogle Calendar APIから取得します。

境界時刻の取りこぼし防止のため、前回同期時刻から2分重ねて確認します。

---

# ダッシュボード

## Calendar同期状態

Google Workspace接続済みの場合、ホーム上部に次を表示します。

- Calendar自動同期 ON
- 最終同期日時
- 同期エラーの有無

## 今日・直近の予定

Google Calendarと同期済みの予定を含めて表示します。

## 要確認

次をまとめて表示します。

- 期限超過タスク
- 14日間活動履歴がない案件
- 次回アクション未設定案件

## 最近更新されたDriveファイル

案件に紐付けたDriveフォルダから同期済みのファイルを、更新日時の新しい順に表示します。

ダッシュボードから直接、

- Google Driveのファイルを開く
- 関連案件を開く

ことができます。

---

# Google Drive表示改善

案件詳細のDriveフォルダに、

- 最終同期日時
- 同期エラー
- 手動同期ボタン

を表示します。

Google Driveそのものを自動同期する機能はVer.1.6ではまだ入れていません。Driveはファイル数が案件によって大きく変わるため、Calendarより慎重に自動化します。

---

# スマートフォン

案件詳細を開いた状態で画面下部に、

```text
＋ 活動   ＋ タスク   ＋ 予定
```

を表示します。

訪問後の利用を、

```text
案件を開く
↓
＋ 活動
↓
内容と次回アクションを入力
↓
保存
```

の短い導線で行えるようにしています。

---

# 動作確認

更新後は次を確認してください。

## Calendar自動同期

1. CRMを開く
2. Google Calendar側でCRM連携済み予定の時刻または件名を変更
3. CRMのタブへ戻る
4. 最大約5分、または再フォーカス後の同期を待つ
5. CRM側へ変更が反映されることを確認

すぐ確認したい場合は、スケジュール画面の `Googleから同期` を押せます。

## ダッシュボード

- Calendar自動同期状態が表示される
- 今日・直近の予定が表示される
- 期限超過タスクが表示される
- 14日活動なし案件が存在すれば表示される
- Drive同期済みファイルが存在すれば最近のファイルが表示される

## スマートフォン

案件詳細で画面下部の

- ＋活動
- ＋タスク
- ＋予定

が利用できることを確認してください。

---

# セキュリティ

Ver.1.6で新しい秘密鍵は追加していません。

Calendar自動同期APIは、ログイン中のSupabaseセッションがあるユーザーからのみ呼び出されます。既存RLSをそのまま利用します。

GitHubへ以下をコミットしない方針も従来通りです。

- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_TOKEN_ENCRYPTION_KEY`
- Supabase Secret key / service_role key
- Database password
- `.env.local`

---

# 次段階候補

Ver.1.6確認後は次を想定しています。

1. Google Driveの自動同期（負荷を見ながら実装）
2. Gmail連携（案件に関連するメールを活動履歴へ）
3. Gmailから取引先・案件への簡単な紐付け
4. 見積・請求・売上管理
5. AIによる案件要約・次回アクション提案
