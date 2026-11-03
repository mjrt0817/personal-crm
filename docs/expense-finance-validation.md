# 検証記録

## 経費画面のレイアウト改善（2026-11-03）

- 入力・検索・一覧を分離。既存のfield/form-gridスタイルを適用し、ラベルを上に配置。登録後の領収書追加手順と空状態を明示。
- PCは2列、モバイルは1列。金額検索・領収書追加・内部ID・保存/訂正説明は必要時に展開。
- 実際のページコンポーネントをサンプルデータで静的レンダリングし、Edgeヘッドレスの1440px/390pxで空一覧と登録済み一覧を画像確認。領収書追加の展開、ページの横はみ出しなし、登録入力欄の高さ44px以上を確認。
- ページのESLintとアプリのTypeScript検査が成功。DB構造、登録処理、権限、会計計算の変更なし。実アカウントの保存確認は今回の画面検証に含まない。

2026-11-03。対象はローカル取得したmjrt0817/personal-crmへの追加差分。

| 検証 | 結果 |
|---|---|
| Next.js本番ビルド | 成功。既存ページと新規 `/expenses` `/finance` `/api/export/expenses` の生成を確認 |
| TypeScript型検査 | 成功 |
| 新規画面・処理・経理ライブラリ・backup・next.configのESLint | 成功 |
| 全体ESLint | 既存箇所に52エラー・1警告。Date.now、any、既存CSVダウンロードリンク等。今回の追加コードによるエラーなし |
| PL/BS計算テスト | 成功：開始残高、売掛・回収、未払・決済、個人立替、逆仕訳、年またぎ |
| 入力検証テスト | 成功：存在しない日付、小数/負数/ゼロ/上限超過額を拒否 |
| SQLテスト | PGliteのPostgreSQL実行環境で018適用成功。本人登録、他人名義の登録拒否、他人の経費/証憑非表示、他人の経費への証憑関連付け拒否、同一貸借科目拒否、経費UPDATE/DELETE拒否、anonのSELECT拒否 |
| 差分の空白チェック | 成功 |
| 実Supabase適用・実Google Drive保存 | 未実施。接続情報なし。本番前に導入資料の手順で検証が必要 |
| 既存契約・請求の実DB回帰 | 未実施。該当コード、既存SQL、認証・proxy、従来会計イベント出力は変更していない |

再実行：Node 24環境で `pnpm install --frozen-lockfile`、`pnpm test:finance`、`pnpm exec tsc --noEmit`、`pnpm build`。

元の依存指定がlatestでロックファイルがなかったため、今回解決した依存をpnpm-lock.yamlに固定。TypeScript 7とtypescript-eslintの非互換を確認したためTypeScriptは6系を指定した。Next.js 16.4.4 / React 19.3.1 / TypeScript 6.0.3で検証。Next.jsによるtsconfigのJSX設定更新を含む。

SQLテストのauth.uidはテスト専用のJWT-sub設定による代替関数。Supabase Auth・PostgREST・Vercel・Google OAuthの接続動作を保証するものではない。テスト実行時のNodeのMODULE_TYPELESS_PACKAGE_JSON警告は結果に影響していない。
