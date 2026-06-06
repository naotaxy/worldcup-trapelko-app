# World Cup Draft Architecture

## Current MVP

- Frontend: Vite, React, Three.js, lucide-react.
- API: Express on Render. It serves the built frontend and exposes LINE webhook, rules, and result endpoints.
- Data: Static FIFA 2026 seed and squad data in the frontend now. Production state should move to Supabase tables in `supabase/schema.sql`.
- Bot role: 秘書トラペル子 posts LINE group links and result notifications.

## Service Split

| Area | Service | Notes |
| --- | --- | --- |
| Web app | Render web service | `npm run build`, `npm start`. No GitHub Actions required. |
| Database | Supabase Postgres | Teams, squad players, fixtures, selections, rules, results, content links. |
| Login | LINE LIFF / LINE Login | Bind `line_user_id`, display name, picture URL to `members`. |
| Bot | LINE Messaging API | Webhook reply and push notifications to LINE group. |
| Legacy memory | Firebase optional | Reuse existing `config/memberProfiles/{userId}` from 秘書トラペル子. |
| Content discovery | Yahoo Developer optional | Store URLs and summaries only. Do not republish full article bodies. |

## Trapelko Reuse Points

Use these existing modules from `/Users/naotay/soccer-roulette` as references when merging:

- `linebot/src/webhook.js`: group mention policy, postback routing, reply/push shape.
- `linebot/src/firebase-admin.js`: `config/memberProfiles` profile memory, conversation logs, case/event logs.
- `linebot/src/member-profile.js`: real name and LINE display name binding.
- `linebot/src/help-message.js`: help and Flex Message conventions.
- `linebot/src/noblesse-agent.js`: short secretary-style summaries and external search intake.

## Result Flow

1. Admin or sync job writes a match result to `POST /api/results`.
2. API upserts `match_results` in Supabase.
3. API recalculates standings on the next app load or realtime push.
4. If `notifyTo` is supplied, API sends a LINE push message.
5. LINE group members open the LIFF app from the group link.

## Auth Flow

1. User opens `https://liff.line.me/{LINE_LIFF_ID}` from LINE group.
2. LIFF returns LINE profile and access token.
3. Frontend sends the profile to the API.
4. API upserts `members.line_user_id`, `line_display_name`, `avatar_url`.
5. Existing Firebase `memberProfiles` can enrich `real_name` and `memo`.

## Rule Editing

Rules are JSON in `rulesets.rules`.

Recommended first shape:

```json
{
  "win": 3,
  "draw": 1,
  "goal": 0.5,
  "cleanSheet": 1,
  "groupWinnerBonus": 5,
  "qualifiedBonus": 3,
  "upsetBonus": 2
}
```

The frontend score engine is pure TypeScript, so changing rules only requires refetching rules and recalculating.

## Squad Data

- Local seed: `src/data/squads.ts`.
- Supabase table: `squad_players`.
- Each player stores `team_id`, `name`, `position`, optional `shirt_number`, optional `club`, and `source_url`.
- The current UI shows registered players by active group, with Japan player names rendered in Japanese where mapped.

## Content Rules

- Use official/highlight video links and article URLs.
- Store only title, URL, source, kind, and short original summary.
- Do not copy full news articles into the app or LINE messages.
- For highlights, link to FIFA/rights-holder pages or YouTube search results unless a licensed API confirms the exact video URL.

## Official Seed Sources

- FIFA final draw results: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/final-draw-results
- FIFA qualified teams: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/world-cup-2026-who-has-qualified
- FIFA match schedule: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums
- FIFA Group F focus: https://www.fifa.com/en/articles/group-f-focus-teams-fixtures-standings
