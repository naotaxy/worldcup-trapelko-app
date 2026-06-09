import { defaultRules } from '../data/worldCup2026'
import type { RulesTimeline } from '../logic/score'
import type { Rules } from '../types'

export type RulesUpdateMode = 'all' | 'forward'

const numericRuleKeys = [
  'win',
  'penaltyWin',
  'draw',
  'goalMargin3Bonus',
  'hatTrickBonus',
  'knockoutQualifiedBonus',
  'thirdPlaceBonus',
  'runnerUpBonus',
  'championBonus',
  'allLossBonus',
  'mvpBonus',
  'topScorerBonus',
  'yellowCardsFourPenalty',
  'redCardPenalty',
  'ownGoalPenalty',
  'japanMultiplier',
] as const satisfies ReadonlyArray<keyof Rules>

const booleanRuleKeys = [
  'doubleHatTrickOnSix',
  'doubleRedCardOnTwo',
  'doubleJapanNegative',
  'oddsMultiplier',
] as const satisfies ReadonlyArray<keyof Rules>

export const neutralPublicRules: Rules = { ...defaultRules, japanMultiplier: 1 }

export function normalizeRules(rawRules?: Partial<Rules> | null): Rules {
  const next: Rules = { ...neutralPublicRules }
  if (!rawRules || typeof rawRules !== 'object') return next
  const mutableRules = next as Record<string, number | boolean | undefined>
  for (const key of numericRuleKeys) {
    const value = rawRules[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      mutableRules[key] = value
    }
  }
  for (const key of booleanRuleKeys) {
    const value = rawRules[key]
    if (typeof value === 'boolean') {
      mutableRules[key] = value
    }
  }
  return next
}

// The current (latest) rule set in a timeline.
export function currentRulesOf(timeline: RulesTimeline): Rules {
  return timeline.length > 0 ? timeline[timeline.length - 1].rules : { ...neutralPublicRules }
}

// Validate raw timeline data from the server into a non-empty, well-formed
// timeline. The first segment is always the base (from = null). Falls back to a
// single base segment when the data is missing or invalid.
export function normalizeTimeline(raw: unknown, fallback: Rules = neutralPublicRules): RulesTimeline {
  if (Array.isArray(raw) && raw.length > 0) {
    const segments = raw
      .filter((seg): seg is Record<string, unknown> => Boolean(seg) && typeof seg === 'object')
      .map((seg, index) => ({
        from: index > 0 && typeof seg.from === 'string' ? seg.from : null,
        rules: normalizeRules((seg as { rules?: Partial<Rules> | null }).rules ?? null),
      }))
    if (segments.length > 0) return segments
  }
  return [{ from: null, rules: { ...fallback } }]
}

// Build the next timeline when rules change. 'all' replaces history so the whole
// tournament is recomputed with the new rules; 'forward' appends a boundary at
// `now`, so only matches kicking off at or after that point use the new rules.
export function buildRulesTimeline(existing: RulesTimeline, nextRules: Rules, mode: RulesUpdateMode, now: string): RulesTimeline {
  if (mode === 'all' || existing.length === 0) return [{ from: null, rules: nextRules }]
  return [...existing, { from: now, rules: nextRules }]
}
