# Personal CRM / SFA Ver.1.2

個人事業向けの取引先・案件・タスク・予定・活動履歴管理Webアプリです。
案件詳細を業務のハブとし、Teams報告先やGoogle Drive等の関連URLを最大4件クイックリンクとして固定できます。

## Ver.1.2 の主な改善

- Vercel FunctionsをTokyo（`hnd1`）へ固定
- 案件詳細の5クエリを同時実行し、DB往復待ちを短縮
- タスク・活動・予定・URL追加画面では案件詳細全体を読まず、必要最小限の案件ヘッダーだけ取得
- 案件編集・取引先編集でも不要な関連データを取得しない
- タスク完了切替をOptimistic UI化し、クリック直後に見た目を反映
- Server Action後の再検証対象を必要な画面だけに限定
- 画面遷移中のローディングバー・スケルトンを追加
- 保存・追加ボタンに「保存中」「追加中」表示を追加
- よく使う検索条件向けの複合インデックスを追加

## 実装済み

- Next.js App Router + TypeScript
- Supabase PostgreSQL
- Google OAuthログイン
- 許可Googleアカウント制限（`ALLOWED_EMAILS`）
- Supabase RLS（本人データのみ）
- 初回ログイン時のプロフィール・案件種別自動作成
- PC / スマホレスポンシブUI
- PWA manifest
- ダッシュボード
- 取引先：一覧 / 詳細 / 新規 / 編集 / アーカイブ
- 担当者：追加 / 削除
- 案件：一覧 / 詳細 / 新規 / 編集 / アーカイブ
- 案件関連URL：追加 / ピン留め / 削除
- タスク：追加 / 完了切替 / 削除
- 活動履歴：追加 / 削除 / 次回アクションへ反映
- スケジュール：追加 / 削除
- 全体検索（取引先・案件）
- デモデータ表示モード

## 既存Ver.1.1から更新する場合

### 1. GitHubへVer.1.2を反映

ソースを更新してmainへpushすると、Vercelが自動デプロイします。
`vercel.json` ではNext.jsとTokyoリージョンを明示しています。

### 2. Supabaseで性能改善SQLを一度だけ実行

Supabase > SQL Editor > New query を開き、以下のファイル内容を貼り付けて `Run` してください。

`supabase/migrations/002_performance_indexes.sql`

既存データは削除・変更しません。`create index if not exists` のみなので再実行しても安全です。

## 新規セットアップ

### 1. Supabaseを作成

Supabaseで新規プロジェクトを作成します。
SQL Editorで以下を実行してください。

`supabase/schema.sql`

### 2. Google認証

Supabase Dashboard の Authentication > Providers > Google を有効化します。
Google Cloud側でOAuth Clientを作成し、Supabaseが表示するCallback URLを登録します。

アプリ側のOAuth後の戻り先：

`https://あなたのドメイン/auth/callback`

ローカルの場合：

`http://localhost:3000/auth/callback`

### 3. 環境変数

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=xxxxx
ALLOWED_EMAILS=your-google-account@gmail.com
NEXT_PUBLIC_DEMO_MODE=false
```

複数メールを許可する場合はカンマ区切りです。

### 4. ローカル起動

```bash
npm install
npm run dev
```

`http://localhost:3000` を開きます。

## デモモード

```env
NEXT_PUBLIC_DEMO_MODE=true
```

デモモードでは登録フォームは表示されますが、送信内容はDBへ保存しません。

## 主な画面

- `/dashboard` ホーム
- `/companies` 取引先
- `/companies/new` 取引先登録
- `/projects` 案件
- `/projects/new` 案件登録
- `/projects/[id]` 案件詳細
- `/tasks` タスク
- `/schedule` スケジュール
- `/search` 全体検索

## 案件詳細のクイックリンク

`project_links` にURLを登録し、`is_pinned` を有効にすると案件上部へ表示します。
1案件あたり最大4件です。

想定例：

- DXコンシェルジュ Teams報告
- Google Drive案件フォルダ
- 顧客Webサイト
- WordPress / 管理システム

## セキュリティ

- Google OAuthで本人認証
- `ALLOWED_EMAILS` で利用可能Googleアカウントを制限
- Proxyでは検証済みJWT Claimsを使用
- DBは全業務テーブルでRLSを有効化
- `user_id = auth.uid()` のデータのみ読み書き可能
- 匿名ユーザーのDBアクセス権はrevoke

## 次の実装候補

1. Google Calendar双方向同期
2. Google Driveファイル選択・自動関連付け
3. Gmail活動履歴連携
4. 案件Kanbanのドラッグ操作
5. 検索対象に担当者・活動本文を追加
6. 見積・請求・入金管理
7. AIによる案件要約・次回アクション提案
