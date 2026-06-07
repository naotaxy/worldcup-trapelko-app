# デプロイ手順 (エイト・ドラフト)

このアプリは2通りで公開できる。状況に応じて選ぶ。

| | GitHub Pages (静的) | Render (フルスタック) |
|---|---|---|
| 公開URL | あり | あり |
| みんなで閲覧・操作 | できる | できる |
| 端末ローカル保存 | できる | できる |
| 全員で結果/ルールを共有保存 | できない | できる (Supabase) |
| ドラフト進行役のLINE通知 | できない | できる |
| LINEログイン(LIFF) | できない | できる |
| 費用 | 無料 | 無料枠あり (スリープ有) |

---

## 現状: GitHub Pages で公開済み

- 公開URL: https://naotaxy.github.io/worldcup-trapelko-app/
- リポジトリ: https://github.com/naotaxy/worldcup-trapelko-app
- 配信ブランチ: `gh-pages` (Settings > Pages = Deploy from a branch / GitHub Actions不使用)

この時点で共有URLを知っているメンバーがスマホでドラフト・順位・最終予想を見られる。
初期デモデータは匿名化済み。各自の試合結果やルール編集はその端末に保存される
(端末間では共有されない)。

### 再デプロイ (データ更新後)

```bash
npm run deploy:pages
```

`dist` をビルドして `gh-pages` ブランチへforce pushするだけ。Actionsは使わない。

---

## フル共有運用にする場合: Render + Supabase + LINE

全員で同じ結果/ルールを共有し、ドラフト進行役がLINEへ通知する構成。

### 1. Supabase

1. Supabaseプロジェクトを作成。
2. SQL Editorで順に実行:
   - `supabase/schema.sql`
   - `supabase/seed.sql` (teams/fixtures/members/selections/初期ルール)
3. 控える値: `SUPABASE_URL`, `anon key`, `service_role key`。
   - `service_role key` はサーバ専用。フロント(Vite)へは絶対に出さない。

seedはデータ更新時に `npm run seed:generate` で再生成できる。

### 2. LINE Developers

同一チャネルのWebhook URLは1つだけ。運用方針:

- **推奨(C案)**: 既存のLINEチャネルを使う場合は、対象グループIDで必ずスコープする。
  - 既存BotのWebhook (`/webhook`) は必要に応じて `LINE_FORWARD_WEBHOOK_URL` に置く。
  - エイト・ドラフト側の通知は同じ `LINE_CHANNEL_ACCESS_TOKEN` を使って push できる。
  - 対象外グループのイベントは既存Botへ転送し、ドラフト機能は発動させない。
- B案: 専用に別チャネルを作り、そのWebhookを `https://<render>/api/line/webhook` に設定。

LIFFを使う場合: LINE Loginチャネルで LIFFアプリを作成し、Endpoint URL を
公開URL (`https://<render>/`) に設定 → `LINE_LIFF_ID` を控える。

### 3. Render

1. New > Blueprint で本リポジトリを指定 (`render.yaml` あり)。
   - Build: `npm ci && npm run build`
   - Start: `npm start`
2. 環境変数 (`.env.example` 準拠):

   ```txt
   NODE_ENV=production
   PUBLIC_APP_URL=https://<公開Render URL>
   DRAFT_EVENT_NAME=エイト・ドラフト
   LINE_ASSISTANT_NAME=ドラフト進行役
   GUIDE_MEMBER_ID=m-guide
   LINE_LIFF_ID=...
   LINE_CHANNEL_ID=...
   LINE_CHANNEL_SECRET=...
   LINE_CHANNEL_ACCESS_TOKEN=...
   LINE_BOT_USER_ID=...       # 任意。メンションpayloadにisSelfが無い場合の保険
   LINE_DRAFT_GROUP_NAME=       # 任意。ID固定できない検証時だけ使う
   LINE_DRAFT_GROUP_ID=...      # 下記4で取得
   SUPABASE_URL=...
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   YAHOO_APP_ID=              # 任意
   GEMINI_API_KEY=...         # 任意。メンション時の自由質問回答
   GEMINI_MODEL=gemini-2.5-flash
   ```

3. デプロイ後 `https://<render>/api/health` で `supabase:true` を確認。

### 4. 対象LINEグループの groupId 取得

1. ドラフト進行役を対象LINEグループに招待。
2. グループで「ドラフト」等と発言。
3. Webhookログの `event.source.groupId` を確認。
4. Render環境変数 `LINE_DRAFT_GROUP_ID` に設定して再デプロイ。

`LINE_DRAFT_GROUP_ID` 未設定でもグループ名で判定するフォールバックが効くが、
本番はID固定が安全。

### 5. 動作確認

- アプリURLを対象LINEグループに投稿 → 全員が同じ結果を見られる。
- 対象LINEグループで通常会話 → ドラフト進行役は反応しない。メンション付き質問だけ返信。
- 試合パネルで「結果を保存」→ Supabaseへ保存され、ドラフト進行役がグループへ通知。
- ルール編集 → 「ルール保存」でクラウド保存。

---

## コンテンツ方針

- 記事本文・動画本体は転載しない。見出し・URL・短い要約とリンク誘導のみ。
- 公式または権利者が公開する日程/結果リンクを優先する。
