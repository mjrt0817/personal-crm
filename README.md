# Personal CRM Ver.1.5

個人用 SFA + CRM + 案件・タスク・スケジュール管理ツールです。

Ver.1.5では、Ver.1.4のGoogle Calendar双方向同期に加えて **Google Drive案件フォルダ連携** を追加しました。

## Ver.1.5の追加機能

- 案件ごとにGoogle Driveフォルダを紐付け
- DriveフォルダURLを貼るだけで登録
- フォルダ名をGoogle Drive APIから自動取得
- サブフォルダを含めてファイルメタデータを同期
- 案件詳細に最近更新されたDriveファイルを表示
- 案件からDriveファイルを1クリックで開く
- 案件別のDrive専用画面でファイル一覧を確認
- Drive側でファイルを追加・削除・名称変更した後は「同期」でCRMへ反映
- Google Drive上の**ファイル本文はSupabaseへ保存しない**
- Supabaseに保存するのはファイル名・URL・種類・更新日時・パス等のメタデータのみ

Google CalendarとGoogle Driveは、同じGoogle OAuth接続を利用します。

---

# Ver.1.4からの更新手順

## 1. Supabase migrationを実行

Supabase Dashboardで

`SQL Editor` → `New query`

を開き、次のファイルを全文貼り付けて `Run` してください。

```text
supabase/migrations/004_google_drive_integration.sql
```

追加される主なもの：

- `project_drive_folders` テーブル
- `files.source`
- `files.external_id`
- `files.drive_folder_id`
- `files.mime_type`
- `files.relative_path`
- `files.external_modified_at`
- `files.is_folder`
- Drive同期用インデックス
- RLS / authenticated権限

既存の取引先・案件・タスク・予定・Calendar同期データは削除しません。

---

## 2. Google Drive APIを有効化

Google Cloud Consoleで、Personal CRMに使っている既存Projectを開きます。

1. 上部検索で `Google Drive API` を検索
2. `Google Drive API` を開く
3. `Enable` / `有効にする` を押す

Google Calendar APIとは別のAPIなので、Drive APIも有効化が必要です。

---

## 3. Google Auth PlatformへDrive scopeを追加

Google Cloud Console → `Google Auth Platform` → `Data Access` → `Add or Remove Scopes`

で、既存のCalendar scopeに加えて次を追加してください。

```text
https://www.googleapis.com/auth/drive.metadata.readonly
```

Ver.1.5で利用するGoogle scopeは次の2つです。

```text
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/drive.metadata.readonly
```

Drive側では **メタデータ読み取りだけ** を要求します。Drive API経由でファイル本文をダウンロード・保存するための権限は要求していません。

アプリがGoogle Auth PlatformのTesting状態の場合は、これまで通り自分のGoogleアカウントをTest userに登録しておいてください。

---

## 4. GitHubへVer.1.5を上書き

ZIPを展開し、`personal-crm-v1.5` フォルダの**中身**を現在のGitHubリポジトリ直下へ上書きしてください。

VercelのGitHub連携により自動デプロイされます。

### Vercel環境変数

Ver.1.4から追加の環境変数はありません。既存の以下をそのまま利用します。

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

## 5. Google Workspaceを再接続

**ここは必須です。**

Ver.1.4で保存済みのRefresh TokenにはCalendar権限しか含まれていないため、Drive scopeを追加した後に再認証します。

アプリで

`設定` → `Google Workspace` → `Google Workspaceを再接続`

を押してください。

Googleの同意画面で、CalendarとDriveメタデータへのアクセスを許可します。

`prompt=consent` と `access_type=offline` を指定しているため、新しいscopeを含むRefresh Tokenを取得して暗号化保存します。

---

# Drive連携の使い方

## 案件にDriveフォルダを紐付ける

1. 案件詳細を開く
2. `Google Drive` セクションを開く
3. `Google Driveフォルダを紐付け` を押す
4. Google Driveで案件フォルダを開く
5. ブラウザのURLをコピー
6. CRMへ貼り付けて `紐付けて同期`

例：

```text
https://drive.google.com/drive/folders/xxxxxxxxxxxxxxxx
```

フォルダIDだけを貼り付けても認識します。

登録時にGoogle Drive APIでフォルダを確認し、フォルダ内のファイルを同期します。

---

## 案件詳細

案件詳細のGoogle Drive欄には、

- 紐付けフォルダ
- `Driveで開く`
- `同期`
- 最近更新されたファイル

が表示されます。

ファイル名をクリックするとGoogle Drive側で開きます。

---

## Drive専用画面

案件詳細 → `ファイル一覧`

から、案件に紐付いたDrive情報をまとめて確認できます。

- 複数フォルダの紐付け
- 手動同期
- Driveでフォルダを開く
- 紐付け解除
- 同期済みファイル一覧

紐付け解除を行っても **Google Drive上のフォルダやファイルは削除しません。**
CRM側の関連付けと同期済みメタデータだけを削除します。

---

# 同期範囲

Ver.1.5ではルートフォルダからサブフォルダを再帰的に確認します。

安全性とVercel実行時間を考慮し、1フォルダ連携あたり次を上限としています。

- 最大500項目
- 最大8階層

大規模フォルダの場合は「上限500件まで」と表示します。

---

# セキュリティ方針

## Google Drive

Supabaseに保存するもの：

- ファイル名
- Google Drive URL
- MIME Type / 種別
- フォルダからの相対パス
- Google側更新日時
- Google Drive File ID

保存しないもの：

- ファイル本文
- Google Docs本文
- PDF本文
- Driveの共有権限情報

Google Drive側のアクセス制御はそのまま有効です。CRMにURLが表示されていても、Google側で権限のないファイルを開けるようにはなりません。

## Google OAuth Token

Ver.1.4同様、Refresh Tokenは

1. Vercelサーバー上でAES-256-GCM暗号化
2. 暗号文のみSupabaseへ保存
3. Google API利用時だけサーバー側で復号

します。

以下はGitHubへコミットしないでください。

- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_TOKEN_ENCRYPTION_KEY`
- Supabase Secret key / service_role key
- Database password
- `.env.local`

---

# 動作確認

## Drive

1. Google Drive APIを有効化
2. `drive.metadata.readonly` scopeを追加
3. Ver.1.5をDeploy
4. Google Workspaceを再接続
5. 案件へDriveフォルダを紐付け
6. CRMにファイル一覧が表示されることを確認
7. Driveにテストファイルを追加
8. CRMで `同期`
9. 追加したファイルが表示されることを確認

## Calendar

Ver.1.4のCalendar機能はそのまま維持しています。

- CRM予定追加 → Googleへ自動作成
- CRM予定編集 → Googleへ自動更新
- CRM予定削除 → Google側も削除
- Google側変更 → `Googleから同期`

---

# 次段階候補

Ver.1.5確認後は、次の順を想定しています。

1. Google Calendarの自動取り込み（ボタン不要化）
2. Driveフォルダの自動同期
3. Gmail連携（案件に関連するメール履歴）
4. 見積・請求・売上管理
5. AIによる案件要約・次アクション提案
