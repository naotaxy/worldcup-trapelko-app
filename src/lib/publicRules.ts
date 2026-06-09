import { defaultRules } from '../data/worldCup2026'
import type { Rules } from '../types'

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
