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

  // When this app owns the channel webhook, forward NON-WC events to the
  // existing トラペル子 bot so other groups keep all their features. WC☆2026
  // events are handled here (W杯特化) and not forwarded (avoids double replies).
  const touchesWcGroup = events.some((e) => {
    const gid = e?.source?.groupId
    return gid && (knownWcGroupIds.has(gid) || (wcGroupId && gid === wcGroupId))
  })
  if (!touchesWcGroup) forwardWebhook(bodyText, signature)

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

function syncAuthorized(req) {
  const key = process.env.SYNC_KEY
  return !key || req.query.key === key
}

// Mutating board endpoints (manual results, rules/awards, member linking) require
// the board passphrase. Without it set, these are locked (deny) so the public
// cannot tamper with shared scoring/results.
function adminAuthorized(req) {
  const expected = process.env.BOARD_PASSPHRASE || ''
  if (!expected) return false
  const key = req.get('x-admin-key') || (req.body && req.body.adminKey) || req.query.adminKey || ''
  return key === expected
}

// Combined live sync: ESPN (scores + events) + football-data fallback.
app.post('/api/sync', async (req, res) => {
  if (!syncAuthorized(req)) {
    res.status(403).json({ ok: false, error: 'forbidden' })
    return
  }
  const out = await runAutoSync({ notify: req.query.notify !== '0' }).catch((err) => ({ ok: false, error: err?.message }))
  res.json(out)
})

// Recompute tournament awards (champion/runner-up/3rd/top scorer) from ESPN.
app.post('/api/sync-awards', async (req, res) => {
  if (!syncAuthorized(req)) {
    res.status(403).json({ ok: false, error: 'forbidden' })
    return
  }
  const out = await computeAutoAwards({ force: true }).catch((err) => ({ ok: false, error: err?.message }))
  res.json(out)
})

// Preview text for a match WITHOUT pushing (testing).
app.get('/api/preview-text', async (req, res) => {
  const matchId = String(req.query.matchId || '')
  if (!matchId) {
    res.json({ ok: false, error: 'matchId required' })
    return
  }
  const text = await buildMatchPreview(matchId).catch((err) => {
    console.error('[preview-text]', err)
    return null
  })
  res.json({ ok: Boolean(text), text })
})

// ESPN only. ?full=1 backfills the whole group stage (wider date scan).
app.post('/api/sync-espn', async (req, res) => {
  if (!syncAuthorized(req)) {
    res.status(403).json({ ok: false, error: 'forbidden' })
    return
  }
  const out = await syncFromEspn({ notify: req.query.notify !== '0', full: req.query.full === '1' }).catch((err) => ({
    ok: false,
    error: err?.message,
  }))
  res.json(out)
})

// Pull live results from football-data.org only. notify=0 backfills silently.
app.post('/api/sync-results', async (req, res) => {
  if (!syncAuthorized(req)) {
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

// ---- Privacy-friendly access analytics ----
const analyticsHitSchema = z.object({
  visitorId: z.string().trim().min(8).max(128),
})
const analyticsSummaryQuerySchema = z.object({
  key: z.string().max(256),
})
const analyticsDailySummarySchema = z.object({
  day: z.string(),
  visits: z.coerce.number().int().nonnegative(),
  uniques: z.coerce.number().int().nonnegative(),
})
const analyticsSummaryDataSchema = z.object({
  totalVisits: z.coerce.number().int().nonnegative(),
  uniqueVisitors: z.coerce.number().int().nonnegative(),
  today: z.object({
    visits: z.coerce.number().int().nonnegative(),
    uniques: z.coerce.number().int().nonnegative(),
  }),
  daily: z.array(analyticsDailySummarySchema),
})
const ANALYTICS_RATE_WINDOW_MS = 60 * 1000
const ANALYTICS_RATE_MAX_HITS = 120
const analyticsRateLimits = new Map()

const sha256Hex = (value) => crypto.createHash('sha256').update(String(value)).digest('hex')

function dayInTokyo() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = (type) => parts.find((part) => part.type === type)?.value || '01'
  return `${value('year')}-${value('month')}-${value('day')}`
}

function shiftIsoDay(day, offset) {
  const date = new Date(`${day}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

function analyticsRateLimited(req, visitorHash) {
  const forwardedFor = String(req.get('x-forwarded-for') || '').split(',')[0].trim()
  const address = forwardedFor || req.ip || req.socket?.remoteAddress || visitorHash
  const key = sha256Hex(address)
  const now = Date.now()
  const bucket = analyticsRateLimits.get(key)
  if (!bucket || now - bucket.startedAt > ANALYTICS_RATE_WINDOW_MS) {
    analyticsRateLimits.set(key, { startedAt: now, count: 1 })
    cleanupAnalyticsRateLimits(now)
    return false
  }
  bucket.count += 1
  return bucket.count > ANALYTICS_RATE_MAX_HITS
}

function cleanupAnalyticsRateLimits(now) {
  if (analyticsRateLimits.size < 1000) return
  for (const [key, bucket] of analyticsRateLimits.entries()) {
    if (now - bucket.startedAt > ANALYTICS_RATE_WINDOW_MS) analyticsRateLimits.delete(key)
  }
}

app.post('/api/analytics/hit', async (req, res) => {
  const parsed = analyticsHitSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ ok: false })
    return
  }
  if (!supabase) {
    res.json({ ok: false })
    return
  }
  const visitorHash = sha256Hex(parsed.data.visitorId)
  if (analyticsRateLimited(req, visitorHash)) {
    res.json({ ok: true })
    return
  }
  const { error } = await supabase.from('analytics_visits').insert({
    visitor_hash: visitorHash,
    day: dayInTokyo(),
  })
  if (error) {
    console.error('[analytics/hit]', error)
    res.json({ ok: false })
    return
  }
  res.json({ ok: true })
})

app.get('/api/analytics/summary', async (req, res) => {
  const parsed = analyticsSummaryQuerySchema.safeParse({ key: typeof req.query.key === 'string' ? req.query.key : '' })
  const expected = process.env.BOARD_PASSPHRASE || ''
  if (!parsed.success || !expected || parsed.data.key !== expected) {
    res.json({ ok: false })
    return
  }
  if (!supabase) {
    res.json({ ok: false })
    return
  }
  const endDay = dayInTokyo()
  const startDay = shiftIsoDay(endDay, -29)
  const { data, error } = await supabase.rpc('analytics_visit_summary', { start_day: startDay, end_day: endDay })
  if (error) {
    console.error('[analytics/summary]', error)
    res.json({ ok: false })
    return
  }
  const summary = analyticsSummaryDataSchema.safeParse(data)
  if (!summary.success) {
    console.error('[analytics/summary] invalid response', summary.error)
    res.json({ ok: false })
    return
  }
  res.json({ ok: true, ...summary.data })
})

// ---- Public multiplayer draft rooms ----
// Anyone can create a room (code + optional passphrase), invite up to 8 players
// who join with a nickname only (no login). Each player secretly picks teams,
// the host reveals, and 3+ collisions are resolved by roulette. Match results
// are the shared global tournament data, so rooms only store players + picks.
// All room data is service_role-only (RLS has no public policies).
const ROOM_ACCENTS = ['#e23d3d', '#38a9a6', '#e0b336', '#4f7fdd', '#2ca36a', '#d9632c', '#9854d7', '#c93e79']
const roomTeamIdsCache = { ids: null }
async function allRoomTeamIds() {
  if (roomTeamIdsCache.ids) return roomTeamIdsCache.ids
  const data = await import('../src/data/worldCup2026.ts')
  roomTeamIdsCache.ids = data.teams.map((t) => t.id)
  return roomTeamIdsCache.ids
}
const genRoomToken = () => crypto.randomBytes(24).toString('hex')
const hashRoomToken = (value) => sha256Hex(value)
const normNickname = (value) => String(value).trim().toLowerCase().replace(/\s+/g, ' ')
const readRoomToken = (req) => (req.body && req.body.token) || (req.query && req.query.token) || req.get('x-room-token') || ''
const avatarFromNickname = (value) => String(value).trim().slice(0, 1).toUpperCase() || '?'
function makeRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I, O, 0, 1
  let out = ''
  for (let i = 0; i < 6; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}
function roomsReady(res) {
  if (!supabase) {
    res.status(503).json({ ok: false, error: 'rooms require Supabase' })
    return false
  }
  return true
}

const createRoomSchema = z.object({
  name: z.string().trim().min(1).max(40),
  nickname: z.string().trim().min(1).max(24),
  passphrase: z.string().max(64).optional(),
  picksPerPlayer: z.number().int().min(1).max(12).optional(),
  maxPlayers: z.number().int().min(2).max(8).optional(),
})
const joinRoomSchema = z.object({
  nickname: z.string().trim().min(1).max(24),
  passphrase: z.string().max(64).optional(),
})
const roomPicksSchema = z.object({
  token: z.string().min(1),
  teamIds: z.array(z.string().min(1)).min(1).max(12),
})

async function loadRoomAndPlayer(code, token) {
  const { data: room } = await supabase.from('rooms').select('*').eq('code', code).maybeSingle()
  if (!room) return { room: null, player: null }
  const { data: player } = await supabase
    .from('room_players')
    .select('*')
    .eq('room_id', room.id)
    .eq('token_hash', hashRoomToken(token || ''))
    .maybeSingle()
  return { room, player }
}

async function requireRoomPlayer(code, token, res) {
  const { room, player } = await loadRoomAndPlayer(code, token)
  if (!room) {
    res.status(404).json({ ok: false, error: 'room not found' })
    return { room: null, player: null }
  }
  if (!player) {
    res.status(403).json({ ok: false, error: 'not a member of this room' })
    return { room: null, player: null }
  }
  return { room, player }
}

async function requireRoomHost(code, token, res) {
  const { room, player } = await requireRoomPlayer(code, token, res)
  if (!room) return { room: null, player: null }
  if (!player.is_host) {
    res.status(403).json({ ok: false, error: 'host only' })
    return { room: null, player: null }
  }
  return { room, player }
}

async function buildRoomState(code, token) {
  const { data: room } = await supabase.from('rooms').select('*').eq('code', code).maybeSingle()
  if (!room) return null
  const { data: players } = await supabase
    .from('room_players')
    .select('*')
    .eq('room_id', room.id)
    .order('seat', { ascending: true })
  const tokenHash = token ? hashRoomToken(token) : null
  const you = (players || []).find((p) => p.token_hash === tokenHash) || null
  const state = {
    code: room.code,
    name: room.name,
    status: room.status,
    picksPerPlayer: room.picks_per_player,
    maxPlayers: room.max_players,
    maxOwnersPerTeam: room.max_owners_per_team,
    hasPassphrase: Boolean(room.passphrase_hash),
    players: (players || []).map((p) => ({
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      accent: p.accent,
      isHost: p.is_host,
      picksSubmitted: p.picks_submitted,
      seat: p.seat,
    })),
    submittedCount: (players || []).filter((p) => p.picks_submitted).length,
    you: you ? { id: you.id, isHost: you.is_host, picksSubmitted: you.picks_submitted } : null,
  }
  if (room.status === 'picking' && you) {
    const { data: intents } = await supabase
      .from('room_pick_intents')
      .select('team_id')
      .eq('room_id', room.id)
      .eq('player_id', you.id)
    state.yourPicks = (intents || []).map((r) => r.team_id)
  }
  if (room.status === 'revealed') {
    const { data: assignments } = await supabase.from('room_assignments').select('*').eq('room_id', room.id)
    const { data: intents } = await supabase.from('room_pick_intents').select('player_id, team_id').eq('room_id', room.id)
    state.assignments = (assignments || []).map((a) => ({
      playerId: a.player_id,
      teamId: a.team_id,
      ownerSlot: a.owner_slot,
      source: a.source,
      originalTeamId: a.original_team_id,
    }))
    const picksByPlayer = {}
    for (const it of intents || []) {
      if (!picksByPlayer[it.player_id]) picksByPlayer[it.player_id] = []
      picksByPlayer[it.player_id].push(it.team_id)
    }
    state.picksByPlayer = picksByPlayer
  }
  return state
}

app.post('/api/rooms', async (req, res) => {
  if (!roomsReady(res)) return
  const parsed = createRoomSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'invalid input' })
    return
  }
  const { name, nickname, passphrase, picksPerPlayer, maxPlayers } = parsed.data
  let code = null
  for (let i = 0; i < 6; i += 1) {
    const candidate = makeRoomCode()
    const { data: exists } = await supabase.from('rooms').select('id').eq('code', candidate).maybeSingle()
    if (!exists) {
      code = candidate
      break
    }
  }
  if (!code) {
    res.status(500).json({ ok: false, error: 'could not allocate room code' })
    return
  }
  const { data: room, error: roomErr } = await supabase
    .from('rooms')
    .insert({
      code,
      name,
      passphrase_hash: passphrase ? hashRoomToken(passphrase) : null,
      picks_per_player: picksPerPlayer ?? 8,
      max_players: maxPlayers ?? 8,
    })
    .select()
    .single()
  if (roomErr) {
    res.status(500).json({ ok: false, error: roomErr.message })
    return
  }
  const token = genRoomToken()
  const { data: player, error: playerErr } = await supabase
    .from('room_players')
    .insert({
      room_id: room.id,
      nickname,
      nickname_norm: normNickname(nickname),
      token_hash: hashRoomToken(token),
      is_host: true,
      seat: 1,
      avatar: avatarFromNickname(nickname),
      accent: ROOM_ACCENTS[0],
    })
    .select()
    .single()
  if (playerErr) {
    res.status(500).json({ ok: false, error: playerErr.message })
    return
  }
  res.json({ ok: true, code, token, playerId: player.id, isHost: true, room: await buildRoomState(code, token) })
})

app.post('/api/rooms/:code/join', async (req, res) => {
  if (!roomsReady(res)) return
  const parsed = joinRoomSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'invalid input' })
    return
  }
  const code = String(req.params.code).toUpperCase()
  const { data: room } = await supabase.from('rooms').select('*').eq('code', code).maybeSingle()
  if (!room) {
    res.status(404).json({ ok: false, error: 'room not found' })
    return
  }
  if (room.status !== 'lobby') {
    res.status(409).json({ ok: false, error: 'this room has already started' })
    return
  }
  if (room.passphrase_hash && hashRoomToken(parsed.data.passphrase || '') !== room.passphrase_hash) {
    res.status(403).json({ ok: false, error: 'wrong passphrase' })
    return
  }
  const { data: players } = await supabase.from('room_players').select('id, nickname_norm').eq('room_id', room.id)
  if ((players || []).length >= room.max_players) {
    res.status(409).json({ ok: false, error: 'room is full' })
    return
  }
  const nickNorm = normNickname(parsed.data.nickname)
  if ((players || []).some((p) => p.nickname_norm === nickNorm)) {
    res.status(409).json({ ok: false, error: 'nickname already taken in this room' })
    return
  }
  const seat = (players || []).length + 1
  const token = genRoomToken()
  const { error } = await supabase.from('room_players').insert({
    room_id: room.id,
    nickname: parsed.data.nickname,
    nickname_norm: nickNorm,
    token_hash: hashRoomToken(token),
    seat,
    avatar: avatarFromNickname(parsed.data.nickname),
    accent: ROOM_ACCENTS[(seat - 1) % ROOM_ACCENTS.length],
  })
  if (error) {
    res.status(500).json({ ok: false, error: error.message })
    return
  }
  res.json({ ok: true, code, token, room: await buildRoomState(code, token) })
})

app.get('/api/rooms/:code', async (req, res) => {
  if (!roomsReady(res)) return
  const code = String(req.params.code).toUpperCase()
  const state = await buildRoomState(code, readRoomToken(req))
  if (!state) {
    res.status(404).json({ ok: false, error: 'room not found' })
    return
  }
  res.json({ ok: true, room: state })
})

app.post('/api/rooms/:code/start', async (req, res) => {
  if (!roomsReady(res)) return
  const code = String(req.params.code).toUpperCase()
  const token = readRoomToken(req)
  const { room } = await requireRoomHost(code, token, res)
  if (!room) return
  if (room.status !== 'lobby') {
    res.status(409).json({ ok: false, error: 'room is not in lobby' })
    return
  }
  await supabase.from('rooms').update({ status: 'picking', updated_at: new Date().toISOString() }).eq('id', room.id)
  res.json({ ok: true, room: await buildRoomState(code, token) })
})

app.post('/api/rooms/:code/picks', async (req, res) => {
  if (!roomsReady(res)) return
  const parsed = roomPicksSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'invalid input' })
    return
  }
  const code = String(req.params.code).toUpperCase()
  const { room, player } = await requireRoomPlayer(code, parsed.data.token, res)
  if (!room) return
  if (room.status !== 'picking') {
    res.status(409).json({ ok: false, error: 'room is not in the picking phase' })
    return
  }
  const ids = [...new Set(parsed.data.teamIds)]
  if (ids.length !== room.picks_per_player) {
    res.status(400).json({ ok: false, error: `pick exactly ${room.picks_per_player} teams` })
    return
  }
  const validIds = new Set(await allRoomTeamIds())
  if (!ids.every((id) => validIds.has(id))) {
    res.status(400).json({ ok: false, error: 'unknown team in selection' })
    return
  }
  await supabase.from('room_pick_intents').delete().eq('room_id', room.id).eq('player_id', player.id)
  const rows = ids.map((teamId) => ({ room_id: room.id, player_id: player.id, team_id: teamId }))
  const { error } = await supabase.from('room_pick_intents').insert(rows)
  if (error) {
    res.status(500).json({ ok: false, error: error.message })
    return
  }
  await supabase
    .from('room_players')
    .update({ picks_submitted: true, last_seen_at: new Date().toISOString() })
    .eq('id', player.id)
  res.json({ ok: true, room: await buildRoomState(code, parsed.data.token) })
})

app.post('/api/rooms/:code/reveal', async (req, res) => {
  if (!roomsReady(res)) return
  const code = String(req.params.code).toUpperCase()
  const token = readRoomToken(req)
  const { room } = await requireRoomHost(code, token, res)
  if (!room) return
  if (room.status === 'revealed') {
    res.json({ ok: true, room: await buildRoomState(code, token) })
    return
  }
  if (room.status !== 'picking') {
    res.status(409).json({ ok: false, error: 'room is not in the picking phase' })
    return
  }
  const { data: players } = await supabase.from('room_players').select('id, picks_submitted').eq('room_id', room.id)
  const submitted = (players || []).filter((p) => p.picks_submitted)
  if (submitted.length < 2) {
    res.status(409).json({ ok: false, error: 'need at least 2 players to have submitted' })
    return
  }
  if (req.query.force !== '1' && submitted.length !== (players || []).length) {
    res.status(409).json({
      ok: false,
      error: 'not everyone has submitted',
      submittedCount: submitted.length,
      total: (players || []).length,
    })
    return
  }
  const { data: intents } = await supabase.from('room_pick_intents').select('player_id, team_id').eq('room_id', room.id)
  const submittedSet = new Set(submitted.map((p) => p.id))
  const draftIntents = (intents || [])
    .filter((r) => submittedSet.has(r.player_id))
    .map((r) => ({ playerId: r.player_id, teamId: r.team_id }))
  const { resolveDraft } = await import('../src/logic/roomDraft.ts')
  const result = resolveDraft(draftIntents, {
    allTeamIds: await allRoomTeamIds(),
    maxOwnersPerTeam: room.max_owners_per_team,
  })
  await supabase.from('room_assignments').delete().eq('room_id', room.id)
  const rows = result.assignments.map((a) => ({
    room_id: room.id,
    player_id: a.playerId,
    team_id: a.teamId,
    owner_slot: a.ownerSlot,
    source: a.source,
    original_team_id: a.originalTeamId || null,
  }))
  if (rows.length) {
    const { error } = await supabase.from('room_assignments').insert(rows)
    if (error) {
      res.status(500).json({ ok: false, error: error.message })
      return
    }
  }
  await supabase
    .from('rooms')
    .update({ status: 'revealed', revealed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', room.id)
  res.json({
    ok: true,
    spins: result.spins,
    collisionTeamIds: result.collisionTeamIds,
    room: await buildRoomState(code, token),
  })
})

// Unlock the insider board: returns real participant names from Supabase only
// when the correct passphrase is supplied. The passphrase + names live on the
// server (BOARD_PASSPHRASE env + DB), never in the public client bundle.
app.post('/api/board/unlock', async (req, res) => {
  const passphrase = req.body && typeof req.body.passphrase === 'string' ? req.body.passphrase : ''
  const expected = process.env.BOARD_PASSPHRASE || ''
  if (!expected || passphrase !== expected) {
    res.json({ ok: false })
    return
  }
  let members = []
  if (supabase) {
    const { data } = await supabase.from('members').select('member_key, real_name, line_display_name')
    members = (data || [])
      .filter((m) => m.member_key)
      .map((m) => {
        const name = m.real_name || m.line_display_name || m.member_key
        return { id: m.member_key, name, avatar: name.slice(0, 1) }
      })
  }
  res.json({ ok: true, members })
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
  if (!adminAuthorized(req)) {
    res.status(403).json({ ok: false, error: 'forbidden' })
    return
  }
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
  if (!adminAuthorized(req)) {
    res.status(403).json({ ok: false, error: 'forbidden' })
    return
  }
  const { awards: rawAwards, adminKey: _adminKey, ...rawRules } = req.body || {}
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
      playerStats: playerStatsCache,
    })
  } catch (error) {
    console.error('[server] /api/state', error)
    res.json({ source: 'static' })
  }
})

app.post('/api/results', async (req, res) => {
  if (!adminAuthorized(req)) {
    res.status(403).json({ ok: false, error: 'forbidden' })
    return
  }
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
// ESPN (scores + events) needs no key, so this runs whenever Supabase is set.
if (supabase) {
  console.log(`[worldcup-trapelko] auto-sync (ESPN + football-data fallback) every ${Math.round(syncIntervalMs / 1000)}s`)
  setInterval(() => {
    runAutoSync({ notify: true })
      .then((out) => {
        if (out?.espn?.updated || out?.footballData?.updated) console.log('[sync]', JSON.stringify(out))
      })
      .catch((err) => console.error('[sync]', err))
  }, syncIntervalMs)
}

async function handleLineEvent(event) {
  if (event.type !== 'message' || event.message?.type !== 'text') return
  const inWcGroup = await isWorldCupLineGroup(event)
  if (!inWcGroup) return // only the WC☆2026 group is handled here (W杯特化)
  const reply = await buildWorldCupReply(String(event.message.text || ''))
  if (reply) await replyLine(event.replyToken, [{ type: 'text', text: reply }])
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

function isWorldCupText(text) {
  return /(WC|W杯|ワールドカップ|world\s*cup|順位|結果|試合|集計|ドラフト|予選|突破|グループ|ハイライト|ニュース|予想|平均|中央値|トラペル)/i.test(text)
}

// W杯特化のトラペル子応答。機能のヘルプ・説明が全部できる。
async function buildWorldCupReply(text) {
  const t = text || ''
  if (/(ヘルプ|help|使い方|機能|何ができ|コマンド|メニュー)/i.test(t)) return helpReply()
  if (/(順位|ランキング|何位|首位|トップ|集計)/.test(t)) return await rankingReply()
  if (/(結果|速報|スコア|試合)/.test(t)) return await rankingReply()
  if (/(予想|平均|中央値|シミュ)/.test(t)) {
    return `秘書トラペル子です。WC☆2026の最終予想グラフ(平均/中央値/レンジ)はこちら。\n${publicAppUrl()}#projection-panel`
  }
  if (/(ルール|配点|点数|得点ルール)/.test(t)) return rulesReply()
  if (/(選手|代表|メンバー|スタメン|写真|身長|年齢)/.test(t)) {
    return `秘書トラペル子です。代表選手の写真・年齢・身長は、アプリの順位で国名をタップすると見られます。\n${publicAppUrl()}`
  }
  if (isWorldCupText(t)) {
    return `秘書トラペル子です。WC☆2026のドラフト/試合/順位はこちら。\n${publicAppUrl()}\n「ヘルプ」で使い方、「順位」で今のランキングを返します。`
  }
  return null
}

function helpReply() {
  return [
    '秘書トラペル子です。WC☆2026でできること:',
    '・「順位」… 参加者ランキングと各国ポイント',
    '・「結果」… 試合結果(得点者/カード/HT/OG)は自動取得',
    '・「予想」… 最終予想グラフ(平均/中央値)',
    '・「ルール」… 配点ルール',
    '・「選手」… 代表選手の写真/年齢/身長(国名タップ)',
    '試合前は私が見どころを実況、結果が出たら速報します。',
    '私も参加者の一人として戦ってます！',
    publicAppUrl(),
  ].join('\n')
}

async function rankingReply() {
  const computed = await computeStandingsFromDb().catch(() => null)
  if (!computed) return `秘書トラペル子です。WC☆2026の順位はこちら。\n${publicAppUrl()}`
  const ranking = computed.memberStandings.map((row, index) => `${index + 1}位 ${row.member.name} ${row.total}pt`).join('\n')
  return ['秘書トラペル子です。WC☆2026 現在の参加者ランキング', ranking, publicAppUrl()].join('\n')
}

function rulesReply() {
  return [
    '秘書トラペル子です。WC☆2026の配点:',
    '勝5 / PK勝3 / 分1 / 3点差+3 / ハットトリック+5',
    '決勝T進出+5 / 3位+5 / 準優勝+10 / 優勝+15 / 全敗+10',
    'MVP+10 / 得点王+10 / 黄4枚-2 / 赤-2 / OG-2 / 日本2倍',
    publicAppUrl(),
  ].join('\n')
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

// --- ESPN free hidden API: scores + match events (goals, cards, own goals) ---
// Unofficial/undocumented but free, no key, and includes the 2026 schedule.
// Used as the primary live source; football-data is the score-only fallback.
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'
const EVENT_KEYS = [
  'homeHatTricks',
  'awayHatTricks',
  'homeYellowCards',
  'awayYellowCards',
  'homeRedCards',
  'awayRedCards',
  'homeOwnGoals',
  'awayOwnGoals',
]

async function espnGet(pathname) {
  try {
    const res = await fetch(`${ESPN_BASE}${pathname}`, { headers: { 'user-agent': 'wc2026-trapelko/1.0' } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function ymdUtc(ts) {
  const d = new Date(ts)
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`
}

function eventsEqual(a = {}, b = {}) {
  return EVENT_KEYS.every((k) => (a?.[k] || 0) === (b?.[k] || 0))
}

// Turn one ESPN match summary into { fixtureId, hs, as, eventPayload } oriented
// to our fixture, or null if not finished / not one of our group fixtures.
function parseEspnSummary(summary, data, teamById) {
  const comp = summary?.header?.competitions?.[0]
  if (!comp || !comp.status?.type?.completed) return null
  const competitors = comp.competitors || []
  const home = competitors.find((c) => c.homeAway === 'home')
  const away = competitors.find((c) => c.homeAway === 'away')
  if (!home?.team || !away?.team) return null
  const abbrA = home.team.abbreviation
  const abbrB = away.team.abbreviation
  const ourA = data.teams.find((t) => t.shortName === abbrA)
  const ourB = data.teams.find((t) => t.shortName === abbrB)
  if (!ourA || !ourB) return null
  const fixture = data.fixtures.find(
    (f) =>
      (f.homeTeamId === ourA.id && f.awayTeamId === ourB.id) || (f.homeTeamId === ourB.id && f.awayTeamId === ourA.id),
  )
  if (!fixture) return null

  const idToAbbr = {}
  for (const c of competitors) idToAbbr[c.team.id] = c.team.abbreviation
  const scoreByAbbr = { [abbrA]: Number(home.score), [abbrB]: Number(away.score) }
  const tally = { [abbrA]: { goals: {}, yellow: 0, red: 0, own: 0 }, [abbrB]: { goals: {}, yellow: 0, red: 0, own: 0 } }

  for (const ev of summary.keyEvents || []) {
    const text = ev?.type?.text || ''
    const teamAbbr = idToAbbr[ev?.team?.id]
    if (/own goal/i.test(text)) {
      // ESPN credits the goal to the beneficiary team; the own goal counts
      // against the other team. Best-effort (own goals are rare).
      const conceding = teamAbbr === abbrA ? abbrB : abbrA
      if (tally[conceding]) tally[conceding].own += 1
      continue
    }
    if (/goal/i.test(text) || /penalty - scored/i.test(text)) {
      if (!tally[teamAbbr]) continue
      const scorer = ev?.participants?.[0]?.athlete?.id || `anon-${Math.random()}`
      tally[teamAbbr].goals[scorer] = (tally[teamAbbr].goals[scorer] || 0) + 1
      continue
    }
    if (/red card/i.test(text)) {
      if (tally[teamAbbr]) tally[teamAbbr].red += 1
      continue
    }
    if (/yellow card/i.test(text)) {
      if (tally[teamAbbr]) tally[teamAbbr].yellow += 1
    }
  }

  const hatTricks = (abbr) => Object.values(tally[abbr].goals).filter((n) => n >= 3).length
  const hAbbr = teamById.get(fixture.homeTeamId).shortName
  const aAbbr = teamById.get(fixture.awayTeamId).shortName
  const hs = scoreByAbbr[hAbbr]
  const as = scoreByAbbr[aAbbr]
  if (!Number.isFinite(hs) || !Number.isFinite(as)) return null

  return {
    fixtureId: fixture.id,
    hs,
    as,
    eventPayload: {
      homeHatTricks: hatTricks(hAbbr),
      awayHatTricks: hatTricks(aAbbr),
      homeYellowCards: tally[hAbbr].yellow,
      awayYellowCards: tally[aAbbr].yellow,
      homeRedCards: tally[hAbbr].red,
      awayRedCards: tally[aAbbr].red,
      homeOwnGoals: tally[hAbbr].own,
      awayOwnGoals: tally[aAbbr].own,
    },
  }
}

async function syncFromEspn({ notify = true, full = false } = {}) {
  if (!supabase) return { ok: false, error: 'supabase not configured' }
  const data = await import('../src/data/worldCup2026.ts')
  const teamById = new Map(data.teams.map((t) => [t.id, t]))

  let dates
  if (full) {
    dates = []
    for (let day = 11; day <= 27; day += 1) dates.push(`202606${String(day).padStart(2, '0')}`)
  } else {
    const now = Date.now()
    dates = [ymdUtc(now), ymdUtc(now - 86400000)]
  }

  const eventIds = new Set()
  for (const d of dates) {
    const sb = await espnGet(`/scoreboard?dates=${d}`)
    for (const e of sb?.events || []) eventIds.add(e.id)
  }

  const { data: existingRows } = await supabase.from('match_results').select('*')
  const existing = new Map((existingRows || []).map((r) => [r.match_id, r]))

  const changed = []
  for (const id of eventIds) {
    const summary = await espnGet(`/summary?event=${id}`)
    const parsed = parseEspnSummary(summary, data, teamById)
    if (!parsed) continue
    const prev = existing.get(parsed.fixtureId)
    if (prev && prev.home_score === parsed.hs && prev.away_score === parsed.as && eventsEqual(prev.event_payload, parsed.eventPayload)) {
      continue
    }
    const row = {
      match_id: parsed.fixtureId,
      home_score: parsed.hs,
      away_score: parsed.as,
      home_penalty_win: false,
      away_penalty_win: false,
      event_payload: parsed.eventPayload,
      source: 'espn',
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
  return { ok: true, scanned: eventIds.size, updated: changed.length, notified }
}

// ESPN first (scores + events), football-data as score-only fallback, then
// trapelko pre-match previews for matches kicking off soon.
async function runAutoSync({ notify = true } = {}) {
  const espn = await syncFromEspn({ notify }).catch((err) => ({ ok: false, error: err?.message }))
  const footballData = footballDataToken
    ? await syncResultsFromFootballData({ notify, fallbackOnly: true }).catch((err) => ({ ok: false, error: err?.message }))
    : { skipped: true }
  const previews = notify ? await previewUpcomingMatches().catch((err) => ({ ok: false, error: err?.message })) : { skipped: true }
  const awards = await computeAutoAwards().catch((err) => ({ ok: false, error: err?.message }))
  return { ok: true, espn, footballData, previews, awards }
}

// Fetch FIFA World Cup results from football-data.org, map each finished group
// match to our fixture (by group + unordered team pair), upsert to Supabase, and
// have トラペル子 broadcast newly-changed results.
async function syncResultsFromFootballData({ notify = true, fallbackOnly = false } = {}) {
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
    // Fallback mode: never overwrite a row ESPN already produced.
    if (fallbackOnly && prev) continue
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

  const ep = savedRow.event_payload || {}
  const topics = []
  if (ep.homeHatTricks) topics.push(`${homeName}ハットトリック`)
  if (ep.awayHatTricks) topics.push(`${awayName}ハットトリック`)
  if (ep.homeRedCards) topics.push(`${homeName}退場${ep.homeRedCards}`)
  if (ep.awayRedCards) topics.push(`${awayName}退場${ep.awayRedCards}`)
  if (ep.homeOwnGoals) topics.push(`${homeName}OG`)
  if (ep.awayOwnGoals) topics.push(`${awayName}OG`)

  const ranking = memberStandings.map((row, index) => `${index + 1}位 ${row.member.name} ${row.total}pt`).join('\n')

  return [
    '秘書トラペル子です。WC☆2026 結果速報',
    `[${fixture.group}組] ${homeName} ${hs}-${as} ${awayName}`,
    resultLine,
    ...(topics.length ? [`トピック: ${topics.join(' / ')}`] : []),
    '———',
    '現在の参加者ランキング',
    ranking,
    publicAppUrl(),
  ].join('\n')
}

// トラペル子の試合前プレビュー: 保有国の試合キックオフ前に、国の強さ・主要選手・
// 見どころ・保有者を紹介する。秘書トラペル子は参加者の一人として一言添える。
const seedStrengthJa = { 1: 'グループ最有力', 2: '有力', 3: '伏兵', 4: 'チャレンジャー' }
const confederationShortJa = { UEFA: '欧州', CONMEBOL: '南米', CAF: 'アフリカ', AFC: 'アジア', Concacaf: '北中米', OFC: 'オセアニア' }

async function buildMatchPreview(fixtureId) {
  const computed = await computeStandingsFromDb()
  if (!computed) return null
  const { data, selections, members } = computed
  const [{ squads }, { playerInfoJa }] = await Promise.all([
    import('../src/data/squads.ts'),
    import('../src/data/playerInfoJa.ts'),
  ])
  const fixture = data.fixtures.find((f) => f.id === fixtureId)
  if (!fixture) return null

  const teamById = new Map(data.teams.map((t) => [t.id, t]))
  const nameJa = (id) => data.teamNamesJa[id] || teamById.get(id)?.name || id
  const ownerNames = (teamId) =>
    selections
      .filter((s) => s.teamId === teamId)
      .map((s) => members.find((m) => m.id === s.memberId)?.name)
      .filter(Boolean)
  const keyPlayers = (teamId) => {
    const order = { FW: 0, MF: 1, DF: 2, GK: 3 }
    return (squads[teamId] || [])
      .filter((p) => playerInfoJa[p.name]) // Wikidata-known = more notable
      .sort((a, b) => (order[a.position] ?? 9) - (order[b.position] ?? 9))
      .slice(0, 3)
      .map((p) => playerInfoJa[p.name].ja || p.name)
  }
  const line = (teamId) => {
    const team = teamById.get(teamId)
    const owners = ownerNames(teamId)
    const players = keyPlayers(teamId)
    const conf = confederationShortJa[team.confederation] || team.confederation
    return `${nameJa(teamId)}（${conf}・${seedStrengthJa[team.seed] || ''}）保有: ${owners.join('・') || 'なし'} / 注目: ${players.join('・') || '—'}`
  }

  const homeOwners = ownerNames(fixture.homeTeamId)
  const awayOwners = ownerNames(fixture.awayTeamId)
  const points = []
  if (homeOwners.length && awayOwners.length) points.push('保有者対決')
  const seedGap = Math.abs((teamById.get(fixture.homeTeamId)?.seed || 4) - (teamById.get(fixture.awayTeamId)?.seed || 4))
  if (seedGap >= 2) points.push('格上対格下の一戦')
  if (fixture.homeTeamId === 'japan' || fixture.awayTeamId === 'japan') points.push('日本は得点が2倍')

  // 秘書トラペル子は参加者なので自分の国なら一言。
  const trapelkoTeams = selections.filter((s) => s.memberId === 'm-trapelko').map((s) => s.teamId)
  let trapelkoVoice = ''
  if (trapelkoTeams.includes(fixture.homeTeamId) || trapelkoTeams.includes(fixture.awayTeamId)) {
    const mine = trapelkoTeams.includes(fixture.homeTeamId) ? nameJa(fixture.homeTeamId) : nameJa(fixture.awayTeamId)
    trapelkoVoice = `私（トラペル子）の${mine}、たのむよ〜！`
  }

  return [
    '秘書トラペル子です。まもなくキックオフ！WC☆2026',
    `[${fixture.group}組] ${nameJa(fixture.homeTeamId)} vs ${nameJa(fixture.awayTeamId)}`,
    line(fixture.homeTeamId),
    line(fixture.awayTeamId),
    points.length ? `見どころ: ${points.join(' / ')}` : '見どころ: 勝てば勝点5、3点差なら+3！',
    ...(trapelkoVoice ? [trapelkoVoice] : []),
    publicAppUrl(),
  ].join('\n')
}

// Scan ESPN for matches kicking off soon and preview each once (tracked in
// Supabase notifications so restarts don't double-post).
async function previewUpcomingMatches({ leadMinutes = 45 } = {}) {
  if (!supabase) return { ok: false, error: 'supabase not configured' }
  const target = lineNotificationTarget()
  if (!target) return { ok: false, error: 'no notify target' }
  const data = await import('../src/data/worldCup2026.ts')
  const tlaToId = {}
  for (const team of data.teams) tlaToId[team.shortName] = team.id

  const now = Date.now()
  const dates = [ymdUtc(now - 86400000), ymdUtc(now), ymdUtc(now + 86400000)]
  const events = []
  for (const d of dates) {
    const sb = await espnGet(`/scoreboard?dates=${d}`)
    for (const e of sb?.events || []) events.push(e)
  }

  let previewed = 0
  for (const event of events) {
    const comp = event.competitions?.[0]
    const state = comp?.status?.type?.state || event.status?.type?.state
    if (state !== 'pre') continue
    const kickoff = Date.parse(event.date)
    if (!Number.isFinite(kickoff)) continue
    const minsToKickoff = (kickoff - now) / 60000
    if (minsToKickoff <= 0 || minsToKickoff > leadMinutes) continue

    const competitors = comp?.competitors || []
    const homeId = tlaToId[competitors.find((c) => c.homeAway === 'home')?.team?.abbreviation]
    const awayId = tlaToId[competitors.find((c) => c.homeAway === 'away')?.team?.abbreviation]
    if (!homeId || !awayId) continue
    const fixture = data.fixtures.find(
      (f) =>
        (f.homeTeamId === homeId && f.awayTeamId === awayId) || (f.homeTeamId === awayId && f.awayTeamId === homeId),
    )
    if (!fixture) continue

    const { data: already } = await supabase
      .from('notifications')
      .select('id')
      .eq('event_type', 'match_preview')
      .eq('payload->>matchId', fixture.id)
      .limit(1)
    if (already && already.length > 0) continue

    const text = await buildMatchPreview(fixture.id).catch(() => null)
    if (!text) continue
    await pushLine(target, [{ type: 'text', text }])
    await supabase
      .from('notifications')
      .insert({ line_group_id: target, event_type: 'match_preview', payload: { matchId: fixture.id }, sent_at: new Date().toISOString() })
    previewed += 1
  }
  return { ok: true, scanned: events.length, previewed }
}

// Auto-derive tournament awards from ESPN: champion/runner-up/3rd from the
// knockout results, and top scorer from all goals. MVP has no free data source
// (FIFA editorial pick), so it stays manual. Throttled (heavy full scan).
// Per-player stats (goals/yellow/red/own goals) keyed by normalized name, built
// during the awards scan and exposed via /api/state for the team detail modal.
let playerStatsCache = {}
function normName(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

let lastAwardsRun = 0
async function computeAutoAwards({ force = false } = {}) {
  if (!supabase) return { ok: false, error: 'supabase not configured' }
  if (!force && Date.now() - lastAwardsRun < 30 * 60 * 1000) return { ok: true, skipped: true }
  lastAwardsRun = Date.now()

  const data = await import('../src/data/worldCup2026.ts')
  const tlaToId = {}
  for (const team of data.teams) tlaToId[team.shortName] = team.id

  const start = Date.UTC(2026, 5, 11) // 2026-06-11
  const dates = []
  for (let d = start; d <= Date.now() + 86400000; d += 86400000) dates.push(ymdUtc(d))

  const goalsByPlayer = {}
  const stats = {} // normName -> { name, abbr, goals, yellow, red, own }
  let champion = ''
  let runnerUp = ''
  let thirdPlace = ''

  for (const dstr of dates) {
    const sb = await espnGet(`/scoreboard?dates=${dstr}`)
    for (const ev of sb?.events || []) {
      if (!ev.competitions?.[0]?.status?.type?.completed) continue
      const summary = await espnGet(`/summary?event=${ev.id}`)
      const sc = summary?.header?.competitions?.[0]
      if (!sc) continue
      const roundName = (summary.header?.season?.name || '').trim()
      const competitors = sc.competitors || []
      const idToAbbr = {}
      for (const c of competitors) idToAbbr[c.team.id] = c.team.abbreviation
      const winner = competitors.find((c) => c.winner)
      const loser = competitors.find((c) => !c.winner)

      const isFinal = /final$/i.test(roundName) && !/semi|quarter/i.test(roundName)
      const isThird = /(3rd|third)[ -]?place|play-?off for third/i.test(roundName)
      if (isFinal && winner && loser) {
        champion = tlaToId[winner.team.abbreviation] || champion
        runnerUp = tlaToId[loser.team.abbreviation] || runnerUp
      }
      if (isThird && winner) thirdPlace = tlaToId[winner.team.abbreviation] || thirdPlace

      for (const e of summary.keyEvents || []) {
        const ty = (e.type && e.type.text) || ''
        const ath = e.participants?.[0]?.athlete
        if (!ath?.id) continue
        const key = normName(ath.displayName)
        const st = stats[key] || (stats[key] = { name: ath.displayName, abbr: idToAbbr[e.team?.id], goals: 0, yellow: 0, red: 0, own: 0 })
        if (/own goal/i.test(ty)) {
          st.own += 1
        } else if (/goal/i.test(ty) || /penalty - scored/i.test(ty)) {
          const entry = goalsByPlayer[ath.id] || { goals: 0, abbr: idToAbbr[e.team?.id], name: ath.displayName }
          entry.goals += 1
          goalsByPlayer[ath.id] = entry
          st.goals += 1
        } else if (/red card/i.test(ty)) {
          st.red += 1
        } else if (/yellow card/i.test(ty)) {
          st.yellow += 1
        }
      }
    }
  }
  playerStatsCache = stats

  let best = null
  for (const id of Object.keys(goalsByPlayer)) {
    const g = goalsByPlayer[id]
    if (!best || g.goals > best.goals) best = g
  }
  const topScorer = best?.abbr ? tlaToId[best.abbr] || '' : ''

  const { data: rs } = await supabase.from('rulesets').select('awards').eq('id', 'default').maybeSingle()
  const cur = rs?.awards || {}
  const awards = {
    championTeamId: champion || cur.championTeamId || '',
    runnerUpTeamId: runnerUp || cur.runnerUpTeamId || '',
    thirdPlaceTeamId: thirdPlace || cur.thirdPlaceTeamId || '',
    mvpTeamId: cur.mvpTeamId || '', // MVP stays manual (no free data source)
    topScorerTeamId: topScorer || cur.topScorerTeamId || '',
  }
  await supabase.from('rulesets').update({ awards, updated_at: new Date().toISOString() }).eq('id', 'default')
  return { ok: true, awards, topScorer: best ? { name: best.name, goals: best.goals } : null }
}

function publicAppUrl() {
  // RENDER_EXTERNAL_URL is injected automatically by Render, so the app works
  // even before PUBLIC_APP_URL is set manually.
  return process.env.PUBLIC_APP_URL || process.env.RENDER_EXTERNAL_URL || 'https://example.onrender.com'
}
