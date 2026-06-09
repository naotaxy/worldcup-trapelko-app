import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import type { Rules } from '../types'
import type { RulesUpdateMode } from '../lib/publicRules'

export type NumericRuleKey = { [K in keyof Rules]-?: Rules[K] extends number ? K : never }[keyof Rules]
export type BoolRuleKey = { [K in keyof Rules]-?: boolean extends Rules[K] ? K : never }[keyof Rules]

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

// Edits a local draft of the rules. The host/insider then chooses how to apply:
// "最初から再計算" (recompute the whole tournament with the new rules) or
// "変えた時から" (only matches kicking off from now on use the new rules).
export function RulesEditor({
  rules,
  onApply,
  children,
  busyLabel,
}: {
  rules: Rules
  onApply: (rules: Rules, mode: RulesUpdateMode) => void
  children?: ReactNode
  busyLabel?: string
}) {
  const radioName = useId()
  const rulesKey = JSON.stringify(rules)
  const [syncedKey, setSyncedKey] = useState(rulesKey)
  const [draft, setDraft] = useState<Rules>(rules)
  const [mode, setMode] = useState<RulesUpdateMode>('all')
  // Re-sync the draft when the committed rules change (after a save, or another
  // host edits). Adjusting state during render (not in an effect) is the React
  // pattern for "derive from props" and avoids clobbering an in-progress edit.
  if (syncedKey !== rulesKey) {
    setSyncedKey(rulesKey)
    setDraft(rules)
  }

  const updateRule = (key: NumericRuleKey, rawValue: string) => {
    const value = Number(rawValue)
    setDraft((current) => ({ ...current, [key]: Number.isFinite(value) ? value : current[key] }))
  }
  const updateRuleToggle = (key: BoolRuleKey, value: boolean) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  return (
    <>
      <div className="rule-grid">
        {RULE_FIELDS.map((field) => (
          <label key={field.key} className="rule-control">
            <span>
              {field.label}
              <strong>{draft[field.key]}</strong>
            </span>
            <input
              type="range"
              min={field.min}
              max={field.max}
              step={field.step}
              value={draft[field.key]}
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
              checked={draft[toggle.key] ?? RULE_TOGGLE_DEFAULTS[toggle.key]}
              onChange={(event) => updateRuleToggle(toggle.key, event.target.checked)}
            />
            <span>
              <strong>{toggle.label}</strong>
              <em>{toggle.hint}</em>
            </span>
          </label>
        ))}
      </div>
      <div className="rule-apply-bar">
        <div className="rule-mode" role="radiogroup" aria-label="再計算の方法">
          <label className={mode === 'all' ? 'active' : ''}>
            <input type="radio" name={radioName} checked={mode === 'all'} onChange={() => setMode('all')} />
            <span>
              <strong>最初から再計算</strong>
              <em>過去も含め全試合を新しい配点で計算し直す</em>
            </span>
          </label>
          <label className={mode === 'forward' ? 'active' : ''}>
            <input type="radio" name={radioName} checked={mode === 'forward'} onChange={() => setMode('forward')} />
            <span>
              <strong>変えた時から</strong>
              <em>これから始まる試合だけ新しい配点（過去は固定）</em>
            </span>
          </label>
        </div>
        <button type="button" className="room-primary" onClick={() => onApply(draft, mode)}>
          {busyLabel || '配点を適用'}
        </button>
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
