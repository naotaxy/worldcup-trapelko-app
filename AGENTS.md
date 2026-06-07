# AGENTS.md — worldcup-trapelko-app

WC☆2026 W杯ドラフト/順位/最終予想/決勝T組合せボード。LINEグループ「WC☆2026」用、秘書トラペル子が自動実況。Claude と Codex が**同時開発**する前提のルールをここに集約する。作業前に必ず読むこと。

## URL / インフラ
- 本番(共有・LINEに貼る): https://worldcup-trapelko-app.onrender.com  (Render無料, mainを自動デプロイ)
- 予備(静的): https://naotaxy.github.io/worldcup-trapelko-app/  (gh-pages, `npm run deploy:pages`)
- GitHub: https://github.com/naotaxy/worldcup-trapelko-app (public)
- Supabase: https://exhuqntorugqzblkcydl.supabase.co
- LINE webhook: 現在チャネルwebhookはこのアプリの `/api/line/webhook` を指す(WC☆2026はW杯特化応答、非WCは `LINE_FORWARD_WEBHOOK_URL` の既存Botへ転送)。

## コマンド (作業後は最低 lint+build を必ず通す)
```bash
npm install
npm run dev            # vite フロント
npm run dev:server     # express API (server/index.mjs)
npm run lint           # eslint (PR前に必須・0 errorに)
npm run build          # tsc -b && vite build (必須・通すこと)
node --check server/index.mjs
npm start              # 本番相当 (dist配信 + API)
npm run deploy:pages   # GitHub Pages(gh-pages)へ配信 ※Actions不使用
```

## アーキテクチャ
- フロント: `src/App.tsx` (単一の大コンポーネント), `src/App.css`, `src/index.css`
- ロジック: `src/logic/score.ts` (順位/ポイント/内訳), `src/logic/projection.ts` (最終予想900回sim, mode: standard/oddsBased/historyDemo)
- 静的データ: `src/data/worldCup2026.ts` (teams/fixtures/groups/members/selections/defaultRules/teamNamesJa/fifaRanking/worldCupHistory)
- API/Bot: `server/index.mjs` (Express)。スコア・イベントはESPN無料API(主)＋football-data(予備)で自動取得→Supabase。トラペル子の実況/試合前プレビュー/ヘルプ応答/大会賞自動判定もここ。`src/logic/*.ts`/`src/data/*.ts`を実行時import(Node24型ストリップ。`.node-version`=24)。

## 生成ファイル(手編集禁止・生成スクリプトで再生成すること)
- `src/data/playerInfoJa.ts` ← `npm run player-info:generate` (Wikidata: カタカナ名/写真/身長/生年月日/クラブ)
- `src/data/wcPdf.ts` ← `pdftotext -layout <配布PDF> /tmp/wcsquads.txt && node scripts/build-wc-pdf.mjs /tmp/wcsquads.txt` (各国の解説/監督/全選手カタカナ+クラブ)
- `supabase/seed.sql` ← `npm run seed:generate`
- これらでrebase衝突したら、マージせず該当スクリプトを再実行して上書きする。

## 本番Render環境変数 (sync:false)
`SUPABASE_URL` `SUPABASE_SERVICE_ROLE_KEY` `LINE_CHANNEL_ACCESS_TOKEN` `LINE_CHANNEL_SECRET` `LINE_WC_GROUP_ID=Cd0143687dfae628d3b9617b997344618` `FOOTBALL_DATA_TOKEN` `LINE_FORWARD_WEBHOOK_URL`(既存Bot webhook) / 任意: `SYNC_KEY` `LINE_LIFF_ID` `SYNC_INTERVAL_MS`。ESPNはキー不要。

## 厳守ルール
- **絵文字は一切使わない**(UI・コード・コミット・通知すべて)。
- UIは日本語。秘書トラペル子の口調を保つ。
- 秘密(キー/トークン)はコードに書かない。env経由。
- ニュース(ゲキサカ等)本文の転載はしない。見出し/要約/リンク誘導のみ。
- 目的外の大規模リファクタや未コミット差分の削除をしない。
- `lint`/`build`が緑でなければpush/マージしない。

## 同時開発プロトコル (Claude ⇄ Codex)
大規模実装中はこれを守ってコンフリクトを防ぐ。
1. **作業開始**: `git pull --rebase origin main` → 直近の collab-log 末尾を読む(下記)。
2. **ブランチ**: 各自フィーチャーブランチで作業 (`feat/claude-xxx` / `feat/codex-xxx`)。緑になったら main へ FF/PR マージ。main直pushは小さな修正のみ。
3. **所有ゾーン(重複回避の目安)**: 担当を被らせない。
   - フロント/UI/CSS: `src/App.tsx` `src/App.css` `src/index.css` `src/components/`
   - スコア/予想ロジック: `src/logic/`
   - サーバ/Bot/取得/同期: `server/index.mjs`
   - データ生成: `scripts/` + 生成物(`src/data/playerInfoJa.ts` `src/data/wcPdf.ts` `supabase/`)
   - 静的中核データ: `src/data/worldCup2026.ts`
   同じファイルを両者が同時に触る場合は collab-log で宣言してから。
4. **生成ファイル**: 手編集しない。再生成して差分を出す。衝突時は再生成で解決。
5. **コミット**: 小さく頻繁に。メッセージ末尾に `Co-Authored-By: <自分>`。push前に `git pull --rebase`。
6. **デプロイ**: main push で Render 自動。フロント確認は `npm run deploy:pages` でも可。`/api/health` で `supabase:true` を確認。
7. **作業後**: lint+build(+必要なら `node --check server/index.mjs`) を通し、collab-log に「やったこと/残り/通ったコマンド/本番反映/LINE確認」を追記。

## 引き継ぎ・ログ (Obsidian vault: /Users/naotay/Documents/Codex)
- 同時開発の調整ログ: `2026-06-07-worldcup-collab-log.md` (毎回ここに追記)
- 詳細仕様/実装履歴: `10_Projects/W杯ドラフトアプリ.md`
- Claude→Codex 引き継ぎ: `10_Projects/W杯アプリ_Codex引き継ぎ.md`
