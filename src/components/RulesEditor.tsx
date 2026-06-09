import type { ReactNode } from 'react'
import type { Rules } from '../types'

export type NumericRuleKey = { [K in keyof Rules]-?: Rules[K] extends number ? K : never }[keyof Rules]
export type BoolRuleKey = { [K in keyof Rules]-?: boolean extends Rules[K] ? K : never }[keyof Rules]
export type RuleChangeMeta = { kind: 'number'; key: NumericRuleKey } | { kind: 'toggle'; key: BoolRuleKey }

const RULE_TOGGLE_DEFAULTS: Record<BoolRuleKey, boolean> = {
  doubleHatTrickOnSix: true,
  doubleRedCardOnTwo: true,
  doubleJapanNegative: true,
  oddsMultiplier: false,
}

const RULE_TOGGLES: Array<{ key: BoolRuleKey; label: string; hint: string }> = [
  { key: 'doubleHatTrickOnSix', label: '6得点でハットトリック2倍', hint: '1選手6得点の試合はハットトリック点が2倍' },
  { key: 'doubleRedCardOnTwo', label: 'レッドカード2枚で2倍', hint: '1チームが1試合で2枚以上なら赤ペナルティ2倍' },
  { key: 'doubleJapanNegative', label: '日本はマイナスも2倍', hint: 'OFFにすると日本のマイナスは2倍にしない' },
  { key: 'oddsMultiplier', label: 'オッズ倍率を適用', hint: '勝った試合の勝ち点にブックメーカー倍率を掛ける(初期OFF)' },
]

const RULE_FIELDS: Array<{ key: NumericRuleKey; label: string; min: number; max: number; step: number }> = [
  { key: 'win', label: '勝ち', min: 0, max: 10, step: 1 },
  { key: 'penaltyWin', label: 'PK勝ち', min: 0, max: 10, step: 1 },
  { key: 'draw', label: '引分', min: 0, max: 5, step: 1 },
  { key: 'goalMargin3Bonus', label: '3点差勝ち', min: 0, max: 10, step: 1 },
  { key: 'hatTrickBonus', label: 'ハットトリック', min: 0, max: 10, step: 1 },
  { key: 'knockoutQualifiedBonus', label: '決勝T進出', min: 0, max: 12, step: 1 },
  { key: 'thirdPlaceBonus', label: '3位', min: 0, max: 12, step: 1 },
  { key: 'runnerUpBonus', label: '準優勝', min: 0, max: 20, step: 1 },
  { key: 'championBonus', label: '優勝', min: 0, max: 25, step: 1 },
  { key: 'allLossBonus', label: '全敗', min: 0, max: 15, step: 1 },
  { key: 'mvpBonus', label: 'MVP', min: 0, max: 20, step: 1 },
  { key: 'topScorerBonus', label: '得点王', min: 0, max: 20, step: 1 },
  { key: 'yellowCardsFourPenalty', label: '黄4枚', min: -5, max: 0, step: 1 },
  { key: 'redCardPenalty', label: '赤', min: -5, max: 0, step: 1 },
  { key: 'ownGoalPenalty', label: 'OG', min: -5, max: 0, step: 1 },
  { key: 'japanMultiplier', label: '日本倍率', min: 1, max: 3, step: 0.5 },
]

export function RulesEditor({
  rules,
  onChange,
  children,
}: {
  rules: Rules
  onChange: (rules: Rules, meta: RuleChangeMeta) => void
  children?: ReactNode
}) {
  const updateRule = (key: NumericRuleKey, rawValue: string) => {
    const value = Number(rawValue)
    onChange({ ...rules, [key]: Number.isFinite(value) ? value : rules[key] }, { kind: 'number', key })
  }
  const updateRuleToggle = (key: BoolRuleKey, value: boolean) => {
    onChange({ ...rules, [key]: value }, { kind: 'toggle', key })
  }

  return (
    <>
      <div className="rule-grid">
        {RULE_FIELDS.map((field) => (
          <label key={field.key} className="rule-control">
            <span>
              {field.label}
              <strong>{rules[field.key]}</strong>
            </span>
            <input
              type="range"
              min={field.min}
              max={field.max}
              step={field.step}
              value={rules[field.key]}
              onChange={(event) => updateRule(field.key, event.target.value)}
            />
          </label>
        ))}
      </div>
      {children}
      <div className="rule-toggles">
        {RULE_TOGGLES.map((toggle) => (
          <label key={toggle.key} className="rule-toggle">
            <input
              type="checkbox"
              checked={rules[toggle.key] ?? RULE_TOGGLE_DEFAULTS[toggle.key]}
              onChange={(event) => updateRuleToggle(toggle.key, event.target.checked)}
            />
            <span>
              <strong>{toggle.label}</strong>
              <em>{toggle.hint}</em>
            </span>
          </label>
        ))}
      </div>
    </>
  )
}

export function RulesSummary({ rules }: { rules: Rules }) {
  return (
    <>
      <p className="rules-readonly-note">このルームの配点です。変更できるのはルームのホストだけです。</p>
      <ul className="rules-readonly-list">
        {RULE_FIELDS.map((field) => (
          <li key={field.key}>
            <span>{field.label}</span>
            <strong>{formatRuleValue(rules[field.key])}</strong>
          </li>
        ))}
      </ul>
      <ul className="rules-readonly-list room-rule-toggle-summary">
        {RULE_TOGGLES.map((toggle) => (
          <li key={toggle.key}>
            <span>{toggle.label}</span>
            <strong>{rules[toggle.key] ?? RULE_TOGGLE_DEFAULTS[toggle.key] ? 'ON' : 'OFF'}</strong>
          </li>
        ))}
      </ul>
    </>
  )
}

function formatRuleValue(value: number): string {
  if (value > 0) return `+${value}`
  return String(value)
}
