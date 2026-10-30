# Personal CRM Ver.3.0.5 - 帳票明細枠 Hotfix

請求書・見積書の明細表で、最終行の下罫線が消えて枠が開いて見える問題を修正しました。

## 原因

アプリ共通CSSの `tr:last-child td { border-bottom: 0; }` が、帳票用の明細テーブルにも適用されていました。

## 修正

`app/globals.css` に帳票専用の上書きを追加しています。

```css
.invoice-lines tbody tr:last-child td {
  border-bottom: 1px solid #9ca3af;
}
```

請求書・見積書の両方に反映されます。

## 更新作業

Supabase SQL、Google Cloud、Vercel環境変数の変更はありません。
`app/globals.css` を上書きしてデプロイしてください。
