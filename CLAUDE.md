# CLAUDE.md

このリポジトリの開発ルールは **`AGENTS.md` に集約**している。Claude も Codex も作業前に `AGENTS.md` を読むこと(コマンド/生成ファイル/env/デプロイ/同時開発プロトコル)。

## Claude 固有メモ
- **絵文字は一切使わない**(会話・コード・コミット・LINE通知すべて。ユーザー恒久ルール)。
- コミットメッセージ末尾: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。
- 同時開発: Codex と被らないよう `AGENTS.md` の所有ゾーンに従う。Claude のブランチは `feat/claude-*`。
- push 前に `npm run lint && npm run build`(必要なら `node --check server/index.mjs`)を通す。
- 当環境では headless スクリーンショットが空になりUI自己目視が不可。**配色/動きの最終確認は実機(ユーザー)依頼**。
- 調整は Obsidian `2026-06-07-worldcup-collab-log.md` に毎回追記して Codex と共有する。
