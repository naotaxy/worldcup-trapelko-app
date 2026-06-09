import type { CSSProperties } from 'react'
import type { MemberProjection, ProjectionMode } from '../logic/projection'

export function ProjectionGraph({
  projections,
  mode,
  onModeChange,
  hideHistoryDemo = false,
}: {
  projections: MemberProjection[]
  mode: ProjectionMode
  onModeChange: (mode: ProjectionMode) => void
  hideHistoryDemo?: boolean
}) {
  const maxValue = Math.max(1, ...projections.map((projection) => projection.high))
  const leaderAverage = projections[0]?.average || 0

  return (
    <div className="projection-list">
      <div className="projection-mode-controls">
        <button type="button" className={mode === 'standard' ? 'active' : ''} onClick={() => onModeChange('standard')}>
          標準予想
        </button>
        <button type="button" className={mode === 'oddsBased' ? 'active' : ''} onClick={() => onModeChange('oddsBased')}>
          オッズ予想
        </button>
        {hideHistoryDemo ? null : (
          <button type="button" className={mode === 'historyDemo' ? 'active' : ''} onClick={() => onModeChange('historyDemo')}>
            過去デモ予想
          </button>
        )}
        <p>
          {mode === 'oddsBased'
            ? 'ブックメーカーのオッズ(勝/分/負の確率)で残り試合を計算中。オッズ未提供の試合はシード強度で補完。'
            : mode === 'historyDemo'
              ? '前回Excelルールの点差感を参考に、全48カ国へ仮の上振れ/下振れポイントを入れて計算中。'
              : '入力済みの試合結果を固定し、残り試合と大会ボーナスをシード強度ベースで計算中。'}
        </p>
      </div>
      {projections.map((projection) => {
        const averageWidth = `${normalizeProjectionValue(projection.average, maxValue)}%`
        const medianLeft = `${normalizeProjectionValue(projection.median, maxValue)}%`
        const lowLeft = `${normalizeProjectionValue(projection.low, maxValue)}%`
        const rangeWidth = `${Math.max(1, normalizeProjectionValue(projection.high - projection.low, maxValue))}%`
        const gap = roundPoint(projection.average - leaderAverage)

        return (
          <article key={projection.member.id} className="projection-row">
            <div className="projection-head">
              <div className="member-avatar" style={{ '--avatar-color': projection.member.accent } as CSSProperties}>
                {projection.member.avatar}
              </div>
              <div>
                <strong>
                  {projection.averageRank}. {projection.member.name}
                </strong>
                <span>
                  現在 {projection.current} / 予想差 {gap === 0 ? '首位' : gap}
                </span>
              </div>
            </div>
            <div className="projection-chart">
              <div className="projection-track">
                <div className="projection-range" style={{ left: lowLeft, width: rangeWidth }} />
                <div className="projection-average" style={{ width: averageWidth }} />
                <div className="projection-median" style={{ left: medianLeft }} />
              </div>
              <div className="projection-values">
                <span>平均 {projection.average}</span>
                <strong>中央値 {projection.median}</strong>
                <span>
                  10-90% {projection.low}-{projection.high}
                </span>
              </div>
            </div>
          </article>
        )
      })}
      <div className="projection-note">
        <span>平均</span>
        <strong>中央値</strong>
        <em>
          薄い帯は10-90%レンジ。
          {mode === 'historyDemo'
            ? '過去デモ予想は全チームへ仮の上振れ/下振れを入れています。'
            : mode === 'oddsBased'
              ? 'オッズ予想はブックメーカーの勝率で残り試合を引いています。'
              : '標準予想は未入力の試合と大会ボーナスだけを推定します。'}
          900回シミュレーションです。
        </em>
      </div>
    </div>
  )
}

function normalizeProjectionValue(value: number, maxValue: number): number {
  return Math.min(100, Math.max(0, (value / maxValue) * 100))
}

function roundPoint(value: number): number {
  return Math.round(value * 10) / 10
}
