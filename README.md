# Personal CRM / SFA Ver.1.3

個人事業向けの取引先・案件・タスク・予定・活動履歴管理Webアプリです。
案件詳細を業務のハブとし、Teams報告先やGoogle Drive等の関連URLを最大4件クイックリンクとして固定できます。

## Ver.1.3 の主な改善

- **登録済みタスクの編集機能を追加**
  - タスク名
  - 紐づく案件
  - 状態
  - 優先度
  - 開始日
  - 期限
  - 内容
  - メモ
- **登録済み関連リンクの編集機能を追加**
  - 表示名
  - URL
  - 種別
  - メモ
  - クイックリンクへのピン留めON/OFF
- クイックリンクを「未ピン留め → ピン留め」に変更した際、空いている1〜4番を自動採番
- ピン留めを解除した場合は `pin_order` を自動クリア
- タスク一覧・案件詳細から直接編集画面へ移動可能
- 関連リンク一覧から直接編集画面へ移動可能
- 実運用上同様に修正需要が高いため、**活動履歴・予定の編集機能も追加**
- 案件を選択してタスク・予定を登録/編集した場合、取引先IDを案件から自動補完するよう改善
- 編集後は元の案件詳細タブへ戻る導線を維持
- Ver.1.2のTokyoリージョン・速度改善を継続
- **Google Calendar連携 Phase 1**：予定一覧からGoogle Calendarの新規予定画面を1クリックで開き、件名・日時・場所・内容を引き継ぐ

## Ver.1.2 からの更新方法

### 1. GitHubへVer.1.3のソースを上書き

リポジトリ直下の以下の構成を維持したまま、Ver.1.3の内容で上書きして `main` へpushしてください。

```text
app/
components/
lib/
public/
supabase/
package.json
vercel.json
```

VercelのGitHub連携により自動デプロイされます。

### 2. Supabase側のSQL追加作業は不要

Ver.1.3では既存テーブルの列構成を変更していないため、**Ver.1.2から更新する場合はSQL Migration不要**です。

Ver.1.2でまだ性能改善SQLを実行していない場合だけ、以下を一度実行してください。

`supabase/migrations/002_performance_indexes.sql`

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
- 案件関連URL：**追加 / 編集 / ピン留め / ピン解除 / 削除**
- タスク：**追加 / 編集 / 完了切替 / 削除**
- 活動履歴：**追加 / 編集 / 削除 / 次回アクションへ反映**
- スケジュール：**追加 / 編集 / 削除 / Google Calendarへの1クリック登録**
- 全体検索（取引先・案件）
- デモデータ表示モード
- Vercel Functions Tokyo（`hnd1`）固定
- 案件詳細DBクエリ並列化
- タスク完了Optimistic UI

## タスク編集

タスク一覧または案件詳細のタスク行にある「✎」から編集できます。

案件詳細から編集した場合は、保存後に元の案件詳細のタスク位置へ戻ります。

## 関連リンク編集

案件詳細 > 関連リンクの「✎」から編集できます。

ピン留めを変更した場合：

- ON：空いているクイックリンク位置（1〜4）を自動使用
- OFF：ピン表示から外し、関連リンク一覧には残す
- すでに4件ピン留め済みの場合：5件目は保存せずエラー

## Google Calendar連携 Phase 1

スケジュール一覧の `Google Calendar ↗` から、登録済み予定の情報をGoogle Calendarの予定作成画面へ渡せます。

現段階ではGoogle Calendar API権限を追加せず、ユーザーがGoogle側で最終確認して保存する方式です。
そのため既存のGoogleログイン設定を変更せずに利用できます。

双方向同期は次フェーズで実装します。

## 活動履歴・予定編集

- 活動履歴：案件詳細の活動行にある「✎」から編集
- 予定：スケジュール一覧の「✎」から編集

活動履歴編集時、「次回アクションを案件にも反映する」を選択した場合だけ案件側の次回アクションも更新します。

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

### 3. Vercel環境変数

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=xxxxx
ALLOWED_EMAILS=your-google-account@gmail.com
NEXT_PUBLIC_DEMO_MODE=false
```

## セキュリティ

- Google OAuthで本人認証
- `ALLOWED_EMAILS` で利用可能Googleアカウントを制限
- DBは全業務テーブルでRLSを有効化
- `user_id = auth.uid()` のデータのみ読み書き可能
- 匿名ユーザーのDBアクセス権はrevoke
- 編集後リダイレクト先はアプリ内相対URLだけ許可

## 次の実装フェーズ

Ver.1.3で日常利用に必要な基本CRUDをほぼ揃えました。
次は外部サービス連携フェーズへ進められます。

1. **Google Calendar連携 Phase 2（双方向同期）**
   - アプリ保存時の自動同期
   - Google Calendar予定 → アプリ表示
   - 更新・削除同期
   - 二重登録防止
2. Google Driveファイル選択・自動関連付け
3. Gmailから活動履歴への取り込み
4. 案件Kanbanのドラッグ操作
5. 検索対象に担当者・活動本文を追加
6. 見積・請求・入金管理
7. AIによる案件要約・次回アクション提案
