# Eight Draft

LINEグループや共有URLから開ける、最大8人向けのチームドラフト・順位・ルール編集ボードです。公開化の途中段階として、現行UIには2026年大会向けの静的データが残っていますが、参加者名やLINEグループの実値はリポジトリに置かない方針です。

公開URL (GitHub Pages): https://naotaxy.github.io/worldcup-trapelko-app/

デプロイ手順 (GitHub Pages / Render+Supabase+LINE) は [DEPLOY.md](./DEPLOY.md) を参照。

## What Is Included

- Three.js animated tournament board
- 2026 tournament group seed data, A to L
- 8 members x 8 teams draft view
- Group standings and member ranking calculation
- Final projection graph with average, median, and 10-90% range
- Historical demo projection mode based on previous-tournament scoring spread
- Registered national-team squad viewer
- Editable 2022 previous-tournament points rules
- Google-style mobile match cards with result/event input
- LINE webhook for configurable assistant notifications, scoped to one target group
- Supabase schema
- Render Blueprint without GitHub Actions

## Local Run

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

API server:

```bash
cp .env.example .env
npm run dev:server
curl http://localhost:8787/api/health
```

Production-like local run:

```bash
npm run build
npm start
```

## Production Setup

1. Create Supabase project and run `supabase/schema.sql`.
2. Create LINE Login / LIFF app and Messaging API channel.
3. Set webhook URL to `https://YOUR_RENDER_SERVICE.onrender.com/api/line/webhook`.
4. Add env vars from `.env.example` in Render. Set `LINE_DRAFT_GROUP_ID` for the target group so replies and pushes are scoped there.
5. Deploy with `render.yaml` from Git-backed Render Blueprint.
6. Post the LIFF URL into the LINE group.

## Environment Notes

- `LINE_CHANNEL_SECRET` is required in production for signature verification.
- `LINE_CHANNEL_ACCESS_TOKEN` is required for push/reply.
- `LINE_DRAFT_GROUP_ID` locks all assistant replies and result notifications to the target group. Legacy `LINE_WC_GROUP_ID` remains as a temporary compatibility alias.
- In the target group, the LINE assistant replies only when the bot is mentioned. Set `LINE_BOT_USER_ID` if LINE mention payloads do not include `isSelf`.
- `GEMINI_API_KEY` enables Japanese free-form World Cup Q&A on mentions. Without it, the bot falls back to fixed commands such as ranking, rules, and projections.
- `DRAFT_EVENT_NAME` and `LINE_ASSISTANT_NAME` control public-facing notification text.
- `SUPABASE_SERVICE_ROLE_KEY` must stay on the server. Do not expose it in Vite env.
- `FIREBASE_*` values are optional, used only if you bridge existing `memberProfiles`.

## Current Data Status

The app uses static 2026 tournament seed data captured during development. National-team squad data is registered in `src/data/squads.ts` and can later be moved into Supabase `squad_players`. Match results are empty by default because the tournament has not started yet. Use the `デモ結果` button to see ranking movement.

This project is not affiliated with FIFA, World Cup organizers, LINE, Google, or any football association. Use only links, short summaries, and licensed/public source metadata for news and video references.
