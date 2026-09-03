# Personal CRM Ver.1.7

個人用 SFA + CRM + 案件・タスク・スケジュール管理ツールです。

Ver.1.7では、案件詳細の操作性を大きく見直し、**ページ内リンク方式からタブ切替方式へ変更**しました。あわせて、Ver.1.6で手動だったGoogle Drive同期を、案件を利用している間は自動で更新する仕組みにしています。

## Ver.1.7の主な追加・改善

### 1. 案件詳細をタブ方式へ変更

案件詳細の以下を、縦に並べる方式からタブ切替へ変更しました。

- 概要
- 活動
- タスク
- 予定
- 関連リンク
- Drive
- メモ

タブを押してもページ再読み込みは発生しません。クライアント側で即座に切り替わります。

活動・タスク・関連リンク・Driveには件数バッジも表示します。

### 2. 編集後も元のタブへ戻る

タスク、活動、関連リンク等を編集・追加・削除した後は、案件詳細の該当タブへ戻るように変更しました。

例：

```text
タスクタブ
↓
タスク編集
↓
保存
↓
案件詳細のタスクタブ
```

旧バージョンの `#tasks` 等のURLを開いた場合にも、該当タブを認識する互換処理を残しています。

### 3. スマホでもタブ切替

スマートフォンではタブ列を横スクロールできます。

また、スクロール中もタブを見失いにくいよう、画面上部にスティッキー表示します。

画面下部の

```text
＋ 活動   ＋ タスク   ＋ 予定
```

はVer.1.6同様に利用できます。

### 4. Google Drive自動同期

案件にGoogle Driveフォルダが紐付いている場合、案件詳細を利用している間にDriveを自動確認します。

- 案件を開いた後に同期確認
- ブラウザタブへ戻った時に同期確認
- 約10分間隔で確認
- サーバー側でも約9分のスロットリング
- 同期直後ならAPIを再度呼ばずスキップ
- エラー時も画面操作を止めない

Drive APIの過剰呼び出しを避けるため、全案件を常時巡回する方式ではなく、**現在利用中の案件だけを自動同期**します。

手動の「今すぐ同期」ボタンも残しています。

---

# Ver.1.6からの更新手順

## 1. Supabase

**追加migrationはありません。**

Ver.1.5までの以下が実行済みならそのままで大丈夫です。

```text
002_performance_indexes.sql
003_google_calendar_sync.sql
004_google_drive_integration.sql
```

## 2. Google Cloud

追加設定はありません。

既存の以下をそのまま利用します。

- Google Calendar API
- Google Drive API

OAuth scope：

```text
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/drive.metadata.readonly
```

## 3. Vercel

追加の環境変数はありません。

既存設定をそのまま利用します。

```text
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
ALLOWED_EMAILS=...
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_TOKEN_ENCRYPTION_KEY=...
```

## 4. GitHub

ZIPを展開し、`personal-crm-v1.7` フォルダの**中身**をGitHubリポジトリ直下へ上書きしてください。

`main` へ反映すればVercelが自動デプロイします。

---

# 動作確認

## 案件詳細タブ

1. 任意の案件詳細を開く
2. 「概要」「活動」「タスク」「Drive」等を順番にクリック
3. ページが上下移動せず、内容だけが切り替わることを確認
4. タスク編集 → 保存後、タスクタブへ戻ることを確認
5. 関連リンク編集 → 保存後、関連リンクタブへ戻ることを確認

## Drive自動同期

1. Driveフォルダ連携済み案件を開く
2. Google Drive側でファイル名変更またはファイル追加
3. 前回同期から10分程度経過後、CRMの案件タブへ戻る
4. Driveタブで更新が反映されることを確認

すぐ確認したい場合は「今すぐ同期」を使えます。

---

# セキュリティ

Ver.1.7で新しい秘密鍵・OAuth scopeは追加していません。

Drive自動同期APIは、ログイン中のSupabaseセッションが存在するユーザーのみ利用できます。データアクセスは既存のRLSに従います。

Google Driveから取得するのは引き続きメタデータのみです。

- ファイル名
- URL
- MIMEタイプ
- 更新日時
- フォルダ内パス

ファイル本文はSupabaseへ保存しません。

---

# 次段階候補

Ver.1.7確認後は、Google Workspace連携の次段階として以下を想定しています。

1. Gmail連携
2. メールを取引先・案件へ紐付け
3. メールから活動履歴を簡単に作成
4. 見積・請求・売上管理
5. AIによる案件要約・次回アクション提案
