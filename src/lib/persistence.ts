import type { AwardSettings, MatchResult, Rules, TeamSelection } from '../types'
import type { RulesTimeline } from '../logic/score'

// Device-local persistence. Keeps each user's board edits across reloads even
// when no backend (Supabase) is configured, e.g. on the static GitHub Pages
// build. When the server API is available it acts as the source of truth and
// overwrites this on load (see lib/api.ts).

export type BoardState = {
  rules?: Rules
  rulesTimeline?: RulesTimeline
  awards?: AwardSettings
  selections?: TeamSelection[]
  results?: Record<string, MatchResult>
  updatedAt?: string
}

const STORAGE_KEY = 'wc2026-board-state-v1'

export function loadLocalState(): BoardState | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as BoardState) : null
  } catch {
    return null
  }
}

export function saveLocalState(state: BoardState): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }))
  } catch {
    // storage full or disabled, ignore
  }
}
