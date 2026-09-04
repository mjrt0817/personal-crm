# Personal CRM Ver.2.2

個人用SFA / CRM / タスク・スケジュール管理。Ver.2.2では「優先アクションの判定条件を設定可能」にし、任意でOpenAI APIを使う「AI参謀」を追加しました。

## Ver.2.2 主な変更

- 優先アクションの判定条件を設定画面から変更可能
  - 回答待ちフォロー日数
  - 活動なし案件の日数
  - タスク / 次回アクションの先読み日数
  - 予定の先読み日数
  - 案件納期の先読み日数
  - 未処理Gmailの参照日数
- `AI参謀` 画面を追加
  - 今日の優先アクション / 予定をAIで整理
- 案件詳細に `AI案件レビュー` を追加
  - 案件概要、活動、未完了タスク、最近のGmail、Driveファイル名から現在地を整理
- AIは自動実行しません。生成ボタンを押した場合だけAPIを呼び出します。
- AIの生成結果はDBへ保存しません。

## 更新手順

### 1. Supabase migration

Supabase → SQL Editor で以下を全文実行してください。

`supabase/migrations/008_action_preferences.sql`

既存データは削除されません。

### 2. GitHub更新

ZIPを展開し、`personal-crm-v2.2` フォルダの**中身**を現在のGitHubリポジトリ直下へ上書きしてください。

mainへの反映後、Vercelの自動デプロイを待ちます。

### 3. AIを使う場合のみ OpenAI API key をVercelへ追加

AI機能は任意です。APIキー未設定でもCRMの既存機能はそのまま使えます。

Vercel → Project → Settings → Environment Variables で追加：

```text
OPENAI_API_KEY=（OpenAI APIのSecret key）
OPENAI_MODEL=gpt-5.6-luna
```

- `OPENAI_API_KEY` は **Config / Secret扱い** にしてください。
- `NEXT_PUBLIC_` は絶対につけません。
- `OPENAI_MODEL` は省略可能です。未設定時は `gpt-5.6-luna` を利用します。
- 環境変数追加後はRedeployしてください。

## AIへ送信する情報

### 今日のAIブリーフ

生成ボタンを押した時だけ、次のテキスト情報を送ります。

- 優先アクション候補
- タスク / 回答待ちの状況
- 直近予定
- 案件名 / 取引先名
- 件数情報

### AI案件レビュー

生成ボタンを押した時だけ、その案件の次の情報を送ります。

- 案件概要 / メモ / 次回アクション
- 最近の活動履歴
- 未完了タスク
- 最近のGmail件名とsnippet
- 最近のGoogle Driveファイル名 / パス

Google Driveのファイル本文やGmail本文全体は送信しません。

## 優先アクション設定

設定 → `優先アクションの判定条件` から変更できます。

初期値：

| 条件 | 初期値 |
|---|---:|
| 回答待ちフォロー | 3日 |
| 活動なし案件 | 14日 |
| タスク / 次回アクション | 7日先 |
| 予定 | 7日先 |
| 案件納期 | 7日先 |
| 未処理Gmail | 過去7日 |

候補が少ない場合は、たとえば「タスク先読み」を14日、「Gmail参照」を14日に広げると候補数が増えます。

## 既存Vercel環境変数

従来の設定は継続して必要です。

```text
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
ALLOWED_EMAILS=...
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_TOKEN_ENCRYPTION_KEY=...
```

## 確認項目

1. 設定 → 優先アクション条件を変更・保存できる
2. 優先アクション画面の候補範囲が設定に応じて変わる
3. `AI参謀` 画面が表示される
4. APIキー未設定時はAIボタンが利用不可 / 案内表示になる
5. APIキー設定時は「今日のブリーフ」が生成できる
6. 案件詳細の「AI案件レビュー」が生成できる
7. Calendar / Drive / Gmailの既存連携が継続して動作する

## 補足

AI出力は登録済みデータの整理支援です。内容は必ず元の案件・タスク・活動履歴を確認して利用してください。
