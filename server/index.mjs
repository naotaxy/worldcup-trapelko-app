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

const footballDataToken = process.env.FOOTBALL_DATA_TOKEN || ''
// football-data.org TLA -> our team id. 47/48 match shortName directly; only
// Uruguay differs (URY vs our URU).
const fdTlaOverrides = { URY: 'uruguay' }
const syncIntervalMs = Number(process.env.SYNC_INTERVAL_MS || 5 * 60 * 1000)

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

// Preview the トラペル子 broadcast text for a match WITHOUT pushing to LINE.
// e.g. GET /api/broadcast-preview?matchId=F-1&home=2&away=1
app.get('/api/broadcast-preview', async (req, res) => {
  const matchId = String(req.query.matchId || '')
  if (!matchId) {
    res.json({ ok: false, error: 'matchId required' })
    return
  }
  const savedRow = {
    match_id: matchId,
    home_score: Number(req.query.home ?? 1),
    away_score: Number(req.query.away ?? 0),
    home_penalty_win: req.query.hpk === '1',
    away_penalty_win: req.query.apk === '1',
    event_payload: {},
  }
  const text = await buildResultBroadcast(savedRow).catch((err) => {
    console.error('[broadcast-preview]', err)
    return null
  })
  res.json({ ok: Boolean(text), text })
})

// Pull live results from football-data.org. notify=0 backfills silently.
app.post('/api/sync-results', async (req, res) => {
  const key = process.env.SYNC_KEY
  if (key && req.query.key !== key) {
    res.status(403).json({ ok: false, error: 'forbidden' })
    return
  }
  const notify = req.query.notify !== '0'
  const out = await syncResultsFromFootballData({ notify }).catch((err) => ({ ok: false, error: err?.message }))
  res.json(out)
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
    const text =
      (await buildResultBroadcast(row).catch(() => null)) ||
      `秘書トラペル子です。WC☆2026の結果を更新しました。\n${result.matchId}: ${result.homeScore}-${result.awayScore}\n順位表と参加者ランキングも再計算済みです。\n${publicAppUrl()}`
    await pushLine(notifyTarget, [{ type: 'text', text }])
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

// Auto-pull results while the instance is awake (keep it warm with UptimeRobot).
if (footballDataToken && supabase) {
  console.log(`[worldcup-trapelko] football-data auto-sync every ${Math.round(syncIntervalMs / 1000)}s`)
  setInterval(() => {
    syncResultsFromFootballData({ notify: true })
      .then((out) => {
        if (out?.updated) console.log('[sync]', JSON.stringify(out))
      })
      .catch((err) => console.error('[sync]', err))
  }, syncIntervalMs)
}

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

// Fetch FIFA World Cup results from football-data.org, map each finished group
// match to our fixture (by group + unordered team pair), upsert to Supabase, and
// have トラペル子 broadcast newly-changed results.
async function syncResultsFromFootballData({ notify = true } = {}) {
  if (!footballDataToken) return { ok: false, error: 'FOOTBALL_DATA_TOKEN not set' }
  if (!supabase) return { ok: false, error: 'supabase not configured' }

  const data = await import('../src/data/worldCup2026.ts')
  const tlaToId = {}
  for (const team of data.teams) tlaToId[team.shortName] = team.id
  Object.assign(tlaToId, fdTlaOverrides)

  const response = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
    headers: { 'X-Auth-Token': footballDataToken },
  })
  if (!response.ok) return { ok: false, error: `football-data ${response.status}` }
  const payload = await response.json()
  const matches = Array.isArray(payload.matches) ? payload.matches : []

  const { data: existingRows } = await supabase.from('match_results').select('match_id, home_score, away_score')
  const existing = new Map((existingRows || []).map((row) => [row.match_id, row]))

  const changed = []
  for (const match of matches) {
    if (match.stage !== 'GROUP_STAGE' || match.status !== 'FINISHED') continue
    const fullTime = match.score?.fullTime
    if (!fullTime || fullTime.home == null || fullTime.away == null) continue
    const homeId = tlaToId[match.homeTeam?.tla]
    const awayId = tlaToId[match.awayTeam?.tla]
    if (!homeId || !awayId) continue
    const groupCode = String(match.group || '').replace('GROUP_', '')
    const fixture = data.fixtures.find(
      (f) =>
        f.group === groupCode &&
        ((f.homeTeamId === homeId && f.awayTeamId === awayId) || (f.homeTeamId === awayId && f.awayTeamId === homeId)),
    )
    if (!fixture) continue

    const orientedHome = fixture.homeTeamId === homeId ? fullTime.home : fullTime.away
    const orientedAway = fixture.homeTeamId === homeId ? fullTime.away : fullTime.home
    const prev = existing.get(fixture.id)
    if (prev && prev.home_score === orientedHome && prev.away_score === orientedAway) continue

    const row = {
      match_id: fixture.id,
      home_score: orientedHome,
      away_score: orientedAway,
      home_penalty_win: false,
      away_penalty_win: false,
      event_payload: {},
      source: 'football-data',
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('match_results').upsert(row, { onConflict: 'match_id' })
    if (!error) changed.push(row)
  }

  let notified = 0
  if (notify && changed.length > 0) {
    const target = lineNotificationTarget()
    if (target) {
      if (changed.length <= 5) {
        for (const row of changed) {
          const text = await buildResultBroadcast(row).catch(() => null)
          if (text) {
            await pushLine(target, [{ type: 'text', text }])
            notified += 1
          }
        }
      } else {
        const text = await buildRankingBroadcast(`秘書トラペル子です。WC☆2026 結果まとめ更新（${changed.length}試合）`).catch(() => null)
        if (text) {
          await pushLine(target, [{ type: 'text', text }])
          notified = 1
        }
      }
    }
  }

  return { ok: true, scanned: matches.length, updated: changed.length, notified }
}

async function buildRankingBroadcast(headline) {
  const computed = await computeStandingsFromDb()
  if (!computed) return null
  const ranking = computed.memberStandings.map((row, index) => `${index + 1}位 ${row.member.name} ${row.total}pt`).join('\n')
  return [headline, '———', '現在の参加者ランキング', ranking, publicAppUrl()].join('\n')
}

// Recompute live standings from Supabase using the same scoring logic as the
// frontend (imported at runtime via Node type-stripping; Node 24 pinned).
async function computeStandingsFromDb() {
  if (!supabase) return null
  const [logic, data] = await Promise.all([import('../src/logic/score.ts'), import('../src/data/worldCup2026.ts')])
  const [rulesetRes, selectionsRes, resultsRes, membersRes] = await Promise.all([
    supabase.from('rulesets').select('rules, awards').eq('id', 'default').maybeSingle(),
    supabase.from('selections').select('team_id, members(member_key)'),
    supabase.from('match_results').select('*'),
    supabase.from('members').select('member_key, real_name'),
  ])
  const rules = rulesetRes.data?.rules || data.defaultRules
  const awards =
    rulesetRes.data?.awards && Object.keys(rulesetRes.data.awards).length
      ? rulesetRes.data.awards
      : { championTeamId: '', runnerUpTeamId: '', thirdPlaceTeamId: '', mvpTeamId: '', topScorerTeamId: '' }
  const members = (membersRes.data || []).map((m) => ({
    id: m.member_key,
    name: m.real_name || m.member_key,
    lineName: '',
    avatar: '',
    accent: '',
  }))
  const selections = (selectionsRes.data || [])
    .filter((entry) => entry.members?.member_key)
    .map((entry) => ({ memberId: entry.members.member_key, teamId: entry.team_id }))
  const resultsMap = {}
  for (const entry of resultsRes.data || []) {
    resultsMap[entry.match_id] = {
      home: entry.home_score,
      away: entry.away_score,
      homePenaltyWin: entry.home_penalty_win,
      awayPenaltyWin: entry.away_penalty_win,
      ...(entry.event_payload || {}),
    }
  }
  const fixtures = data.fixtures.map((match) =>
    resultsMap[match.id] ? { ...match, result: { ...match.result, ...resultsMap[match.id] } } : match,
  )
  const teamStandings = logic.calculateTeamStandings(data.groups, fixtures, rules, awards)
  const memberStandings = logic.calculateMemberStandings(members, selections, teamStandings)
  return { data, teamStandings, memberStandings, selections, members }
}

// Build the トラペル子 "live commentary" text: who won, the owners, and the
// current member ranking with points.
async function buildResultBroadcast(savedRow) {
  const computed = await computeStandingsFromDb()
  if (!computed) return null
  const { data, memberStandings, selections, members } = computed
  const fixture = data.fixtures.find((entry) => entry.id === savedRow.match_id)
  if (!fixture) return null

  const nameJa = (id) => data.teamNamesJa[id] || data.teams.find((team) => team.id === id)?.name || id
  const owners = (teamId) =>
    selections
      .filter((selection) => selection.teamId === teamId)
      .map((selection) => members.find((member) => member.id === selection.memberId)?.name)
      .filter(Boolean)
  const fmtOwners = (list) => (list.length ? list.join('・') : '保有者なし')

  const hs = savedRow.home_score
  const as = savedRow.away_score
  const homeName = nameJa(fixture.homeTeamId)
  const awayName = nameJa(fixture.awayTeamId)
  const homePk = savedRow.home_penalty_win
  const awayPk = savedRow.away_penalty_win

  let resultLine
  if (hs > as || homePk) {
    resultLine = `勝ち: ${homeName}（保有: ${fmtOwners(owners(fixture.homeTeamId))}）${homePk ? ' ※PK勝ち' : ''}`
  } else if (as > hs || awayPk) {
    resultLine = `勝ち: ${awayName}（保有: ${fmtOwners(owners(fixture.awayTeamId))}）${awayPk ? ' ※PK勝ち' : ''}`
  } else {
    resultLine = `引き分け（${homeName}: ${fmtOwners(owners(fixture.homeTeamId))} / ${awayName}: ${fmtOwners(owners(fixture.awayTeamId))}）`
  }

  const ranking = memberStandings.map((row, index) => `${index + 1}位 ${row.member.name} ${row.total}pt`).join('\n')

  return [
    '秘書トラペル子です。WC☆2026 結果速報',
    `[${fixture.group}組] ${homeName} ${hs}-${as} ${awayName}`,
    resultLine,
    '———',
    '現在の参加者ランキング',
    ranking,
    publicAppUrl(),
  ].join('\n')
}

function publicAppUrl() {
  // RENDER_EXTERNAL_URL is injected automatically by Render, so the app works
  // even before PUBLIC_APP_URL is set manually.
  return process.env.PUBLIC_APP_URL || process.env.RENDER_EXTERNAL_URL || 'https://example.onrender.com'
}
