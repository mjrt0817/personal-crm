# Personal CRM Ver.3.0.3 Hotfix

発行済み請求書の内容を固定するための修正です。

## 変更内容

- 未発行の請求書は、現在の請求書設定・請求先情報をプレビュー表示
- 初回発行時に発行者情報と請求先情報をスナップショット保存
- 発行済み請求書は、その後設定や取引先情報を変更しても表示内容を変更しない
- 発行済み請求書の編集画面では、帳票内容を編集不可にし、状態・入金日のみ更新可能
- 発行済み請求書は削除不可。必要な場合は「取消」として履歴を残す
- DBトリガーでも発行済み請求書の帳票内容変更・削除を防止

## 反映手順

1. Supabase SQL Editor で `015_invoice_immutability.sql` を実行
2. Hotfix内の以下をGitHubへ同じパスで上書き
   - `lib/data.ts`
   - `lib/actions.ts`
   - `components/InvoiceForm.tsx`
   - `app/(app)/billing/[id]/edit/page.tsx`
3. Vercelの自動デプロイ完了を待つ

Google Cloud / Vercel環境変数の変更はありません。
