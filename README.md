# Personal CRM Ver.1.8

個人用 SFA + CRM + 案件・タスク・スケジュール管理ツールです。

Ver.1.8では **Gmail案件連携** を追加しました。取引先・担当者に登録されているメールアドレスを使ってGmailから関連メールを検索し、案件の「活動」画面から確認できます。必要なメールだけを1クリックで活動履歴へ追加できます。

## Ver.1.8の主な追加・改善

### 1. 案件ごとのGmail関連メール

案件詳細 → **活動** に「Gmail 関連メール」を追加しました。

- 取引先の代表メール
- 取引先に登録されている担当者メール

を対象に、Gmailの過去1年分から送受信メールを検索します。

初期設定では1回の同期につき最大30件を確認します。

### 2. Gmail本文全体は保存しない

Supabaseへ保存するのは以下の参照情報です。

- Gmail message / thread ID
- 件名
- 差出人
- 宛先・CC
- 送受信日時
- Gmail APIのsnippet（短い本文プレビュー）
- Gmailを開くURL

**メール本文全体・添付ファイルはSupabaseへ保存しません。**

### 3. メールを活動履歴へ追加

関連メールから **「活動履歴に追加」** を押すと、次の内容でCRMの活動履歴を作成します。

- 種別：メール
- 日時：メール日時
- 件名：メール件名
- 内容：送受信情報＋snippet＋Gmailリンク

同じメールを二重で活動登録しないための重複防止も入れています。

### 4. Gmailを直接開く

各メールの **「Gmail ↗」** から元メールへ移動できます。

活動タブでは直近8件、**「すべて表示」** では同期済みメールを最大100件表示します。

---

# Ver.1.7からの更新手順

## 1. Supabase migration

Supabase → **SQL Editor → New query** で、以下を全文実行してください。

```text
supabase/migrations/005_gmail_project_integration.sql
```

既存の取引先・案件・活動データは削除されません。

追加される主なDB要素：

```text
project_gmail_syncs
gmail_messages
activities.source
activities.source_external_id
```

## 2. Google CloudでGmail APIを有効化

既存のPersonal CRM用Google Cloud Projectで、API Libraryから

**Gmail API**

を追加して **Enable / 有効化** してください。

Calendar API・Drive APIと同じGoogle Cloud Projectを使用します。

## 3. Google Auth PlatformへGmail scopeを追加

Google Auth Platform → **Data Access → Add or Remove Scopes** で、以下を追加します。

```text
https://www.googleapis.com/auth/gmail.readonly
```

既存の以下は削除しません。

```text
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/drive.metadata.readonly
```

## 4. GitHubへVer.1.8を反映

ZIPを展開し、`personal-crm-v1.8` フォルダの**中身**をGitHubリポジトリ直下へ上書きしてください。

mainへ反映するとVercelが自動デプロイします。

## 5. Vercel

新しい環境変数はありません。

既存の以下をそのまま使用します。

```text
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
ALLOWED_EMAILS=...
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_TOKEN_ENCRYPTION_KEY=...
```

## 6. Google Workspaceを再接続

Gmail scopeを追加しただけでは、現在保存されているRefresh TokenにGmail権限は追加されません。

CRM → **設定 → Google Workspace → Google Workspaceを再接続**

を実行し、Googleの同意画面でGmailへの読み取り権限を許可してください。

Google側の同意画面にGmail権限が出ない場合は、一度Googleアカウント側からPersonal CRMへのアクセス許可を削除してから再接続してください。

---

# 動作確認

1. 取引先または担当者に実際のメールアドレスが入っていることを確認
2. 案件詳細 → **活動** を開く
3. **↻ Gmailを同期** を押す
4. 関連する送受信メールが表示されることを確認
5. **Gmail ↗** から元メールを開けることを確認
6. 任意メールの **活動履歴に追加** を押す
7. 下部の活動履歴にメール活動が追加されることを確認
8. 同じメールに「活動登録済」と表示されることを確認

## 「Request had insufficient authentication scopes.」の場合

Gmail scopeを追加した後の再接続ができていません。

```text
設定 → Google Workspace → 再接続
```

を実施してください。

## 「Gmail API has not been used...」の場合

Google CloudでGmail APIが有効化されていないか、OAuth Clientとは別のGoogle Cloud ProjectでAPIを有効化している可能性があります。

---

# Gmail OAuth scopeについて

`gmail.readonly` はGoogle上の **Restricted（制限付き）scope** です。

このCRMは本人のみが利用する個人用ツールとして設計しています。個人利用・開発/テスト用途ではGoogleのVerification例外に該当する場合がありますが、今後このアプリを第三者へ提供する場合は、Google OAuth Verificationやセキュリティ評価の要否を改めて確認してください。

またVer.1.8では、必要以上のメールデータを保存しないよう、本文全体や添付ファイルは取得・保存しない設計にしています。

---

# 今後の候補

Ver.1.8確認後は次の順を想定しています。

1. Gmail検索条件・紐付け精度の改善
2. Gmailから「返信が必要」「待ち」をタスク化
3. 見積・請求・売上管理
4. AIによる案件要約・次回アクション提案
5. 案件詳細UI（タブ方式を含む）の再調整
