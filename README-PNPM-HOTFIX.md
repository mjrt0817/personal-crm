# Ver.3.4 pnpmビルド修正

Vercelがpnpmを使用している既存リポジトリに対し、前回の配布版にはnpmのロックファイルだけが含まれていました。そのため、残っていたpnpm-lock.yamlと新しいpackage.jsonが不一致になりました。

## 今回の変更

- pnpm-lock.yamlを追加し、Ver.3.4の依存関係に同期。
- package.jsonにpackageManager: pnpm@10.12.1を設定。
- TypeScriptを含む直接依存を、前回検証したnpmロック内のバージョンに固定（TypeScript 6.0.3）。latestの再解決による意図しない更新を防止。
- npmを使用する場合も矛盾しないようpackage-lock.jsonの指定を同期。

## 適用

1. 更新版のルートにある以下の3ファイルを既存リポジトリの同じ場所へ上書きし、まとめてコミットしてください。
   - package.json
   - pnpm-lock.yaml
   - package-lock.json
2. Vercelで新しいコミットをデプロイしてください。
3. VercelでInstall Commandを独自に設定している場合は、pnpm install --frozen-lockfileへ合わせます。Build Commandはpnpm run buildです。

アプリの機能・SQLは変更していません。018を適用済みなら再実行は不要です。まだ適用していない場合は、従来の導入手順どおり1回実行してください。

通常の依存関係更新もpnpmで行い、package.jsonとpnpm-lock.yamlを同時にコミットします。ロックファイルのチェックを無効化する必要はありません。

## 検証結果

pnpm 10.12.1による新規の `pnpm install --frozen-lockfile`、`pnpm test`、デモ環境変数を使用した `pnpm run build` が成功しました。本番Vercelへの再デプロイは未実施です。
