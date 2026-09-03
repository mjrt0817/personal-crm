# Personal CRM / SFA Ver.1.1

個人事業向けの取引先・案件・タスク・予定・活動履歴管理Webアプリです。
案件詳細を業務のハブとし、Teams報告先やGoogle Drive等の関連URLを最大4件クイックリンクとして固定できます。

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

## 1. Supabaseを作成

Supabaseで新規プロジェクトを作成します。

SQL Editorで以下を実行してください。

`supabase/schema.sql`

## 2. Google認証

Supabase Dashboard の Authentication > Providers > Google を有効化します。
Google Cloud側でOAuth Clientを作成し、Supabaseが表示するCallback URLを登録します。

アプリ側のOAuth後の戻り先は以下です。

`https://あなたのドメイン/auth/callback`

ローカルの場合：

`http://localhost:3000/auth/callback`

## 3. 環境変数

`.env.example` を `.env.local` にコピーします。

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=xxxxx
ALLOWED_EMAILS=your-google-account@gmail.com
NEXT_PUBLIC_DEMO_MODE=false
```

複数メールを許可する場合はカンマ区切りです。

## 4. 起動

```bash
npm install
npm run dev
```

`http://localhost:3000` を開きます。

## 5. デモモード

Supabase接続前に画面だけ確認する場合：

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
