import type { AwardSettings, MatchResult, Rules, TeamSelection } from '../types'
import type { RulesTimeline } from '../logic/score'
import type { KnockoutScore } from './bracket'
import type { RulesUpdateMode } from './publicRules'

// Thin, defensive client for the optional backend API.
//
// The app must work in three situations:
//   1. Static hosting with no backend (GitHub Pages) -> every call resolves to
//      null and the UI falls back to seed data + device-local storage.
//   2. Render server without Supabase -> API responds but reports source:static.
//   3. Render server with Supabase -> shared, persisted state for the group.
//
// Every function swallows network/parse errors and never throws, so a missing
// or sleeping backend can never break the board.

export type PlayerStat = { name?: string; abbr?: string; goals?: number; yellow?: number; red?: number; own?: number }

export type ServerState = {
  source: 'supabase' | 'static'
  rules?: Rules
  rulesTimeline?: RulesTimeline
  awards?: AwardSettings
  selections?: TeamSelection[]
  rescues?: { memberId: string; teamId: string; baseline: number }[]
  results?: Record<string, MatchResult>
  playerStats?: Record<string, PlayerStat>
  qualifierIds?: string[]
  knockoutScores?: KnockoutScore[]
}

export type Bootstrap = {
  liffId: string | null
  supabaseReady: boolean
  lineGroupName: string
  lineGroupLocked: boolean
}

export type AnalyticsDailySummary = {
  day: string
  visits: number
  uniques: number
}

export type AnalyticsSummary = {
  ok: true
  totalVisits: number
  uniqueVisitors: number
  today: {
    visits: number
    uniques: number
  }
  daily: AnalyticsDailySummary[]
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    // Always hit the network fresh. Mobile webviews (esp. the LINE in-app
    // browser) otherwise serve a stale HTTP-cached /api/state that predates the
    // authoritative qualifierIds/knockoutScores, which makes the app compute a
    // wrong low ranking from its own incomplete client-side bracket. A
    // cache-busting query plus cache:'no-store' defeats every cache layer.
    const bust = `${path.includes('?') ? '&' : '?'}_=${Date.now()}`
    const res = await fetch(path + bust, { headers: { accept: 'application/json' }, cache: 'no-store' })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

function adminKey(): string {
  try {
    return localStorage.getItem('wc-board-key') || ''
  } catch {
    return ''
  }
}

async function postJson<T>(path: string, body: unknown, extraHeaders?: Record<string, string>): Promise<T | null> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', ...(extraHeaders || {}) },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export async function fetchBootstrap(): Promise<Bootstrap | null> {
  return getJson<Bootstrap>('/api/bootstrap')
}

// Returns shared state only when the backend is actually Supabase-backed.
// Otherwise null, so the caller keeps seed + local-device state.
export async function fetchSharedState(): Promise<ServerState | null> {
  const state = await getJson<ServerState>('/api/state')
  if (!state || state.source !== 'supabase') return null
  return state
}

export async function pushResult(matchId: string, result: MatchResult, notifyTo?: string): Promise<boolean> {
  const payload = {
    matchId,
    homeScore: result.home ?? 0,
    awayScore: result.away ?? 0,
    homePenaltyWin: Boolean(result.homePenaltyWin),
    awayPenaltyWin: Boolean(result.awayPenaltyWin),
    homeHatTricks: result.homeHatTricks ?? 0,
    awayHatTricks: result.awayHatTricks ?? 0,
    homeYellowCards: result.homeYellowCards ?? 0,
    awayYellowCards: result.awayYellowCards ?? 0,
    homeRedCards: result.homeRedCards ?? 0,
    awayRedCards: result.awayRedCards ?? 0,
    homeOwnGoals: result.homeOwnGoals ?? 0,
    awayOwnGoals: result.awayOwnGoals ?? 0,
    homeSixGoals: result.homeSixGoals ?? 0,
    awaySixGoals: result.awaySixGoals ?? 0,
    ...(notifyTo ? { notifyTo } : {}),
  }
  const out = await postJson<{ ok: boolean }>('/api/results', payload, { 'x-admin-key': adminKey() })
  return Boolean(out?.ok)
}

export async function pushRules(rules: Rules, awards: AwardSettings, mode: RulesUpdateMode = 'all'): Promise<boolean> {
  const out = await postJson<{ ok: boolean }>('/api/rules', { ...rules, awards, mode }, { 'x-admin-key': adminKey() })
  return Boolean(out?.ok)
}

export async function saveRescuePick(memberKey: string, teamId: string): Promise<boolean> {
  if (!memberKey || !teamId) return false
  const out = await postJson<{ ok: boolean }>('/api/rescue', { memberKey, teamId }, { 'x-admin-key': adminKey() })
  return Boolean(out?.ok)
}

export async function unlockBoard(
  passphrase: string,
): Promise<{ ok: boolean; members?: { id: string; name: string; avatar: string }[] } | null> {
  return postJson('/api/board/unlock', { passphrase })
}

export async function recordVisit(visitorId: string): Promise<void> {
  if (!visitorId) return
  await postJson<{ ok: boolean }>('/api/analytics/hit', { visitorId })
}

export async function fetchAnalyticsSummary(key: string): Promise<AnalyticsSummary | null> {
  const summary = await getJson<AnalyticsSummary>(`/api/analytics/summary?key=${encodeURIComponent(key)}`)
  return summary?.ok ? summary : null
}

export async function linkLineMember(profile: {
  lineUserId: string
  displayName?: string
  pictureUrl?: string
  realName?: string
}): Promise<boolean> {
  const out = await postJson<{ ok: boolean }>('/api/members/line', profile, { 'x-admin-key': adminKey() })
  return Boolean(out?.ok)
}
