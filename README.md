# World Cup Trapelko App

LINEグループから開く、2026ワールドカップのチームドラフト・順位・ルール編集ボードです。

## What Is Included

- Three.js animated tournament board
- FIFA World Cup 2026 group seed data, A to L
- 8 members x 8 teams draft view
- Group standings and member ranking calculation
- Final projection graph with average, median, and 10-90% range
- Historical demo projection mode based on previous-tournament scoring spread
- Registered national-team squad viewer
- Editable 2022 previous-tournament points rules
- Google-style mobile match cards with result/event input
- LINE webhook for 秘書トラペル子 notifications, locked to `WC☆2026`
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
4. Add env vars from `.env.example` in Render. Set `LINE_WC_GROUP_ID` for the `WC☆2026` group so Trapelko only replies and pushes there.
5. Deploy with `render.yaml` from Git-backed Render Blueprint.
6. Post the LIFF URL into the LINE group.

## Environment Notes

- `LINE_CHANNEL_SECRET` is required in production for signature verification.
- `LINE_CHANNEL_ACCESS_TOKEN` is required for push/reply.
- `LINE_WC_GROUP_ID` locks all Trapelko World Cup replies and result notifications to `WC☆2026`.
- Wicolle-related keywords are ignored in the `WC☆2026` group.
- `SUPABASE_SERVICE_ROLE_KEY` must stay on the server. Do not expose it in Vite env.
- `FIREBASE_*` values are optional, used only if you bridge existing 秘書トラペル子 `memberProfiles`.

## Current Data Status

The app uses static seed data confirmed from FIFA pages as of 2026-06-05. National-team squad data is registered in `src/data/squads.ts` and can later be moved into Supabase `squad_players`. Match results are empty by default because the tournament has not started yet. Use the `デモ結果` button to see ranking movement.
