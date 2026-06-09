// Client for the multiplayer draft rooms API. Unlike lib/api.ts (which swallows
// errors to null), these surface server error messages so the UI can show them
// (wrong passphrase, nickname taken, room full, etc.).

import type { RulesTimeline } from '../logic/score'
import type { RulesUpdateMode } from './publicRules'
import type { Rules } from '../types'

export type RoomPlayer = {
  id: string
  nickname: string
  avatar: string
  accent: string
  isHost: boolean
  picksSubmitted: boolean
  seat: number
}

export type RoomAssignment = {
  playerId: string
  teamId: string
  ownerSlot: number
  source: 'pick' | 'roulette'
  originalTeamId?: string | null
}

export type RoomStatus = 'lobby' | 'picking' | 'revealed'

export type RoomState = {
  code: string
  name: string
  status: RoomStatus
  rules: Rules
  rulesTimeline?: RulesTimeline
  picksPerPlayer: number
  maxPlayers: number
  maxOwnersPerTeam: number
  hasPassphrase: boolean
  players: RoomPlayer[]
  submittedCount: number
  you: { id: string; isHost: boolean; picksSubmitted: boolean } | null
  yourPicks?: string[]
  assignments?: RoomAssignment[]
  picksByPlayer?: Record<string, string[]>
}

export type RoomSpin = { playerId: string; fromTeamId: string; toTeamId: string | null }

type ApiResult<T> = T & { ok: boolean; error?: string }

const SESSION_KEY = 'wc2026-room-session'

export type RoomSession = { code: string; token: string }

export function loadRoomSession(): RoomSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as RoomSession
    if (parsed && parsed.code && parsed.token) return parsed
    return null
  } catch {
    return null
  }
}

export function saveRoomSession(session: RoomSession | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore storage failures
  }
}

async function request<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method,
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const json = (await res.json().catch(() => ({}))) as ApiResult<T>
    if (!res.ok) return { ...(json as object), ok: false, error: json?.error || `エラー (${res.status})` } as ApiResult<T>
    return { ...(json as object), ok: json?.ok !== false } as ApiResult<T>
  } catch {
    return { ok: false, error: '通信に失敗しました' } as ApiResult<T>
  }
}

type RoomResponse = { room?: RoomState; code?: string; token?: string; spins?: RoomSpin[]; collisionTeamIds?: string[] }

export function createRoom(input: {
  name: string
  nickname: string
  passphrase?: string
  picksPerPlayer?: number
  maxPlayers?: number
  rules?: Rules
}) {
  return request<RoomResponse>('/api/rooms', 'POST', input)
}

export function joinRoom(code: string, input: { nickname: string; passphrase?: string }) {
  return request<RoomResponse>(`/api/rooms/${encodeURIComponent(code)}/join`, 'POST', input)
}

export function getRoom(code: string, token: string) {
  const q = token ? `?token=${encodeURIComponent(token)}` : ''
  return request<RoomResponse>(`/api/rooms/${encodeURIComponent(code)}${q}`, 'GET')
}

export function startRoom(code: string, token: string) {
  return request<RoomResponse>(`/api/rooms/${encodeURIComponent(code)}/start`, 'POST', { token })
}

export function submitPicks(code: string, token: string, teamIds: string[]) {
  return request<RoomResponse>(`/api/rooms/${encodeURIComponent(code)}/picks`, 'POST', { token, teamIds })
}

export function revealRoom(code: string, token: string, force = false) {
  const q = force ? '?force=1' : ''
  return request<RoomResponse>(`/api/rooms/${encodeURIComponent(code)}/reveal${q}`, 'POST', { token })
}

export function updateRoomRules(code: string, token: string, rules: Rules, mode: RulesUpdateMode) {
  return request<RoomResponse>(`/api/rooms/${encodeURIComponent(code)}/rules`, 'POST', { token, rules, mode })
}
