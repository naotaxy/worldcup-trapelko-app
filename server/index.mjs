import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import 'dotenv/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const distDir = path.join(projectRoot, 'dist')
const app = express()
const port = Number(process.env.PORT || 8787)
const wcGroupName = process.env.LINE_WC_GROUP_NAME || 'WC☆2026'
const wcGroupId = process.env.LINE_WC_GROUP_ID || ''
const knownWcGroupIds = new Set(wcGroupId ? [wcGroupId] : [])

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase =
  supabaseUrl && supabaseServiceRoleKey ? createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } }) : null

const resultSchema = z.object({
  matchId: z.string().min(1),
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
  homePenaltyWin: z.boolean().optional(),
  awayPenaltyWin: z.boolean().optional(),
  homeHatTricks: z.number().int().min(0).optional(),
  awayHatTricks: z.number().int().min(0).optional(),
  homeYellowCards: z.number().int().min(0).optional(),
  awayYellowCards: z.number().int().min(0).optional(),
  homeRedCards: z.number().int().min(0).optional(),
  awayRedCards: z.number().int().min(0).optional(),
  homeOwnGoals: z.number().int().min(0).optional(),
  awayOwnGoals: z.number().int().min(0).optional(),
  notifyTo: z.string().optional(),
})

const rulesSchema = z.object({
  win: z.number(),
  penaltyWin: z.number(),
  draw: z.number(),
  goalMargin3Bonus: z.number(),
  hatTrickBonus: z.number(),
  knockoutQualifiedBonus: z.number(),
  thirdPlaceBonus: z.number(),
  runnerUpBonus: z.number(),
  championBonus: z.number(),
  allLossBonus: z.number(),
  mvpBonus: z.number(),
  topScorerBonus: z.number(),
  yellowCardsFourPenalty: z.number(),
  redCardPenalty: z.number(),
  ownGoalPenalty: z.number(),
  japanMultiplier: z.number(),
})

const awardsSchema = z.object({
  championTeamId: z.string(),
  runnerUpTeamId: z.string(),
  thirdPlaceTeamId: z.string(),
  mvpTeamId: z.string(),
  topScorerTeamId: z.string(),
})

const lineMemberSchema = z.object({
  lineUserId: z.string().min(1),
  displayName: z.string().optional(),
  pictureUrl: z.string().url().optional(),
  realName: z.string().optional(),
})

const memoryState = {
  rules: null,
  awards: null,
  results: [],
}

const capturedGroups = new Map()

app.post('/api/line/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const bodyText = req.body.toString('utf8')
  const signature = req.get('x-line-signature')
  if (!isValidLineSignature(bodyText, signature)) {
    res.status(401).json({ ok: false, error: 'invalid LINE signature' })
    return
  }

  const payload = JSON.parse(bodyText)
  const events = Array.isArray(payload.events) ? payload.events : []

  // Record any group IDs seen so the WC☆2026 group ID can be captured once,
  // then read from GET /api/line/captured-groups.
  for (const event of events) {
    if (event?.source?.type === 'group' && event.source.groupId) captureGroup(event.source.groupId)
  }

  // Optional transparent forward, so the existing トラペル子 bot keeps working
  // even while this app is temporarily set as the channel webhook for capture.
  forwardWebhook(bodyText, signature)

  await Promise.all(events.map(handleLineEvent))
  res.json({ ok: true })
})

// Read captured group IDs (for one-time WC☆2026 groupId discovery).
app.get('/api/line/captured-groups', (req, res) => {
  const key = process.env.LINE_CAPTURE_KEY
  if (key && req.query.key !== key) {
    res.status(403).json({ ok: false, error: 'forbidden' })
    return
  }
  res.json({ ok: true, wcGroupName, groups: [...capturedGroups.values()] })
})

app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'worldcup-trapelko-app',
    bot: '秘書トラペル子',
    lineGroup: wcGroupName,
    lineGroupLocked: Boolean(wcGroupId),
    supabase: Boolean(supabase),
    liff: Boolean(process.env.LINE_LIFF_ID),
  })
})

app.get('/api/bootstrap', (_req, res) => {
  res.json({
    tournament: 'FIFA World Cup 2026',
    liffId: process.env.LINE_LIFF_ID || null,
    supabaseReady: Boolean(supabase),
    notificationRole: '秘書トラペル子',
    lineGroupName: wcGroupName,
    lineGroupLocked: Boolean(wcGroupId),
    wcOnlyMode: true,
    disabledInWcGroup: ['ウイコレ'],
    contentPolicy: 'Store article URLs and short summaries. Do not republish article bodies or video files.',
  })
})

app.get('/api/rules', (_req, res) => {
  res.json({
    ok: true,
    rules: memoryState.rules || {
      win: 5,
      penaltyWin: 3,
      draw: 1,
      goalMargin3Bonus: 3,
      hatTrickBonus: 5,
      knockoutQualifiedBonus: 5,
      thirdPlaceBonus: 5,
      runnerUpBonus: 10,
      championBonus: 15,
      allLossBonus: 10,
      mvpBonus: 10,
      topScorerBonus: 10,
      yellowCardsFourPenalty: -2,
      redCardPenalty: -2,
      ownGoalPenalty: -2,
      japanMultiplier: 2,
    },
  })
})

app.post('/api/members/line', async (req, res) => {
  const profile = lineMemberSchema.parse(req.body)
  const row = {
    line_user_id: profile.lineUserId,
    line_display_name: profile.displayName || null,
    real_name: profile.realName || null,
    avatar_url: profile.pictureUrl || null,
    updated_at: new Date().toISOString(),
  }

  if (supabase) {
    const { data, error } = await supabase.from('members').upsert(row, { onConflict: 'line_user_id' }).select().single()
    if (error) throw error
    res.json({ ok: true, member: data })
    return
  }

  res.json({ ok: true, member: row, memoryOnly: true })
})

app.post('/api/rules', async (req, res) => {
  const { awards: rawAwards, ...rawRules } = req.body || {}
  const rules = rulesSchema.parse(rawRules)
  const awards = rawAwards ? awardsSchema.parse(rawAwards) : memoryState.awards
  memoryState.rules = rules
  memoryState.awards = awards

  if (supabase) {
    const { error } = await supabase.from('rulesets').upsert({
      id: 'default',
      rules,
      awards: awards || {},
      updated_at: new Date().toISOString(),
    })
    if (error) throw error
  }

  res.json({ ok: true, rules, awards })
})

// Shared mutable board state. Returns source:"supabase" only when a backend is
// actually wired up, so the frontend knows whether to trust it over local/seed.
app.get('/api/state', async (_req, res) => {
  if (!supabase) {
    res.json({ source: 'static' })
    return
  }

  try {
    const [rulesetRes, selectionsRes, resultsRes] = await Promise.all([
      supabase.from('rulesets').select('rules, awards').eq('id', 'default').maybeSingle(),
      supabase.from('selections').select('team_id, owner_slot, members(member_key)'),
      supabase.from('match_results').select('*'),
    ])

    const selections = (selectionsRes.data || [])
      .filter((row) => row.members?.member_key)
      .map((row) => ({ memberId: row.members.member_key, teamId: row.team_id }))

    const results = {}
    for (const row of resultsRes.data || []) {
      results[row.match_id] = {
        home: row.home_score,
        away: row.away_score,
        homePenaltyWin: row.home_penalty_win,
        awayPenaltyWin: row.away_penalty_win,
        ...(row.event_payload || {}),
      }
    }

    res.json({
      source: 'supabase',
      rules: rulesetRes.data?.rules || null,
      awards: rulesetRes.data?.awards || null,
      selections,
      results,
    })
  } catch (error) {
    console.error('[server] /api/state', error)
    res.json({ source: 'static' })
  }
})

app.post('/api/results', async (req, res) => {
  const result = resultSchema.parse(req.body)
  const row = {
    match_id: result.matchId,
    home_score: result.homeScore,
    away_score: result.awayScore,
    home_penalty_win: Boolean(result.homePenaltyWin),
    away_penalty_win: Boolean(result.awayPenaltyWin),
    event_payload: {
      homeHatTricks: result.homeHatTricks || 0,
      awayHatTricks: result.awayHatTricks || 0,
      homeYellowCards: result.homeYellowCards || 0,
      awayYellowCards: result.awayYellowCards || 0,
      homeRedCards: result.homeRedCards || 0,
      awayRedCards: result.awayRedCards || 0,
      homeOwnGoals: result.homeOwnGoals || 0,
      awayOwnGoals: result.awayOwnGoals || 0,
    },
    source: 'manual-admin',
    updated_at: new Date().toISOString(),
  }
  memoryState.results.push(row)

  if (supabase) {
    const { error } = await supabase.from('match_results').upsert(row, { onConflict: 'match_id' })
    if (error) throw error
  }

  const notifyTarget = lineNotificationTarget(result.notifyTo)
  if (notifyTarget) {
    await pushLine(notifyTarget, [
      {
        type: 'text',
        text: `秘書トラペル子です。WC☆2026の結果を更新しました。\n${result.matchId}: ${result.homeScore}-${result.awayScore}\n順位表と参加者ランキングも再計算済みです。\n${publicAppUrl()}`,
      },
    ])
  }

  res.json({ ok: true, result: row, notifiedTo: notifyTarget || null, wcGroupLocked: Boolean(wcGroupId) })
})

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.use((err, _req, res, _next) => {
  console.error('[server]', err)
  res.status(500).json({ ok: false, error: err?.message || 'server error' })
})

app.listen(port, () => {
  console.log(`[worldcup-trapelko] listening on ${port}`)
})

async function handleLineEvent(event) {
  if (event.type === 'message' && event.message?.type === 'text') {
    const inWcGroup = await isWorldCupLineGroup(event)
    if (!inWcGroup) return

    const text = String(event.message.text || '')
    if (isWicolleText(text)) return

    if (isWorldCupText(text)) {
      await replyLine(event.replyToken, [
        {
          type: 'text',
          text: buildWorldCupReply(text),
        },
      ])
    }
  }
}

async function isWorldCupLineGroup(event) {
  if (event.source?.type !== 'group' || !event.source?.groupId) return false
  const groupId = event.source.groupId
  if (knownWcGroupIds.has(groupId)) return true
  if (wcGroupId) return groupId === wcGroupId

  const summary = await fetchLineGroupSummary(groupId)
  if (summary?.groupName === wcGroupName) {
    knownWcGroupIds.add(groupId)
    return true
  }
  return false
}

function isWicolleText(text) {
  return /(ウイコレ|winning\s*roulette|ウイニングルーレット|月次ルール|ルール決め)/i.test(text)
}

function isWorldCupText(text) {
  return /(WC|W杯|ワールドカップ|world\s*cup|順位|結果|試合|集計|ドラフト|予選|突破|グループ|ハイライト|ニュース|予想|平均|中央値)/i.test(text)
}

function buildWorldCupReply(text) {
  const latestResults = memoryState.results
    .slice(-3)
    .reverse()
    .map((row) => `${row.match_id}: ${row.home_score}-${row.away_score}`)
    .join('\n')
  if (/結果|試合/i.test(text) && latestResults) {
    return `秘書トラペル子です。WC☆2026の直近更新です。\n${latestResults}\n詳細と順位表はこちらです。\n${publicAppUrl()}`
  }
  if (/順位|集計|ランキング/i.test(text)) {
    return `秘書トラペル子です。WC☆2026の参加者ランキングとチーム別ポイントはこちらです。\n${publicAppUrl()}\nこのグループではW杯集計だけ担当します。`
  }
  if (/予想|平均|中央値/i.test(text)) {
    return `秘書トラペル子です。WC☆2026の最終予想グラフはこちらです。\n標準予想と、前回データの点差感を入れた過去デモ予想を切り替えて見られます。\n${publicAppUrl()}#projection-panel`
  }
  return `秘書トラペル子です。WC☆2026のドラフト、試合、順位はこちらです。\n${publicAppUrl()}\n結果更新時はこのグループへ随時報告します。`
}

function isValidLineSignature(bodyText, signature) {
  const secret = process.env.LINE_CHANNEL_SECRET
  if (!secret) return process.env.NODE_ENV !== 'production'
  if (!signature) return false
  const digest = crypto.createHmac('sha256', secret).update(bodyText).digest('base64')
  const received = Buffer.from(signature)
  const expected = Buffer.from(digest)
  if (received.length !== expected.length) return false
  return crypto.timingSafeEqual(received, expected)
}

async function replyLine(replyToken, messages) {
  if (!replyToken || !process.env.LINE_CHANNEL_ACCESS_TOKEN) return
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ replyToken, messages }),
  })
}

async function pushLine(to, messages) {
  if (!to || !process.env.LINE_CHANNEL_ACCESS_TOKEN) return
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, messages }),
  })
}

function captureGroup(groupId) {
  const entry = capturedGroups.get(groupId) || { groupId, count: 0 }
  entry.count += 1
  entry.lastSeen = new Date().toISOString()
  capturedGroups.set(groupId, entry)
  if (!entry.groupName) {
    fetchLineGroupSummary(groupId)
      .then((summary) => {
        if (summary?.groupName) entry.groupName = summary.groupName
      })
      .catch(() => {})
  }
}

function forwardWebhook(bodyText, signature) {
  const url = process.env.LINE_FORWARD_WEBHOOK_URL
  if (!url) return
  fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-line-signature': signature || '' },
    body: bodyText,
  }).catch(() => {})
}

async function fetchLineGroupSummary(groupId) {
  if (!groupId || !process.env.LINE_CHANNEL_ACCESS_TOKEN) return null
  const response = await fetch(`https://api.line.me/v2/bot/group/${encodeURIComponent(groupId)}/summary`, {
    headers: {
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
  })
  if (!response.ok) return null
  return response.json()
}

function lineNotificationTarget(requestedTarget) {
  if (wcGroupId) return wcGroupId
  if (requestedTarget && knownWcGroupIds.has(requestedTarget)) return requestedTarget
  return null
}

function publicAppUrl() {
  // RENDER_EXTERNAL_URL is injected automatically by Render, so the app works
  // even before PUBLIC_APP_URL is set manually.
  return process.env.PUBLIC_APP_URL || process.env.RENDER_EXTERNAL_URL || 'https://example.onrender.com'
}
