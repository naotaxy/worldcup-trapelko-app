import { ExternalLink, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { playerInfoJa } from '../data/playerInfoJa'
import type { PdfPlayer } from '../data/wcPdf'
import { teamNamesJa, teams } from '../data/worldCup2026'
import { flagUrl, type TeamBreakdown } from '../logic/score'
import { formatDateShort, formatKickoff, useSettings } from '../lib/i18n'
import type { Team } from '../types'
import type { PlayerStat } from '../lib/api'

const positionLabels: Record<PdfPlayer['pos'], string> = {
  GK: 'GK',
  DF: 'DF',
  MF: 'MF',
  FW: 'FW',
}

const confederationJa: Record<string, string> = {
  UEFA: '欧州 (UEFA)',
  CONMEBOL: '南米 (CONMEBOL)',
  CAF: 'アフリカ (CAF)',
  AFC: 'アジア (AFC)',
  Concacaf: '北中米カリブ (Concacaf)',
  OFC: 'オセアニア (OFC)',
}

const playerInfoByJa: Record<string, { en: string; photo?: string; heightCm?: number; dob?: string }> = {}
for (const [en, v] of Object.entries(playerInfoJa)) {
  if (v.ja && !playerInfoByJa[v.ja]) playerInfoByJa[v.ja] = { en, photo: v.photo, heightCm: v.heightCm, dob: v.dob }
}

export type TeamDetailNextMatch = {
  date: string
  kickoff?: string
  opponentName: string
  home: boolean
  winOdds?: number
  drawOdds?: number
} | null

export function TeamDetailModal({
  team,
  breakdown,
  owners,
  players,
  playerStats,
  fifaRank,
  wcHistory,
  summary,
  coach,
  remaining,
  nextMatch,
  onClose,
}: {
  team: Team
  breakdown: TeamBreakdown
  owners: string
  players: PdfPlayer[]
  playerStats: Record<string, PlayerStat>
  fifaRank?: number
  wcHistory?: string
  summary?: string
  coach?: string
  remaining: number
  nextMatch: TeamDetailNextMatch
  onClose: () => void
}) {
  const standing = breakdown.standing
  const maxAbs = Math.max(1, ...breakdown.components.map((component) => Math.abs(component.points)))
  const grouped = {
    GK: players.filter((player) => player.pos === 'GK'),
    DF: players.filter((player) => player.pos === 'DF'),
    MF: players.filter((player) => player.pos === 'MF'),
    FW: players.filter((player) => player.pos === 'FW'),
  }
  const { lang, tz } = useSettings()
  const { hatTricks, yellowCards, redCards, ownGoals } = breakdown.tallies
  const nextMatchOddsText = nextMatch
    ? [
        nextMatch.winOdds != null ? `勝ち ${nextMatch.winOdds.toFixed(2)}倍` : null,
        nextMatch.drawOdds != null ? `引分 ${nextMatch.drawOdds.toFixed(2)}倍` : null,
      ]
        .filter((value): value is string => Boolean(value))
        .join(' / ')
    : ''

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="team-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="team-modal" onClick={(event) => event.stopPropagation()}>
        <header className="team-modal-head">
          <div>
            <img src={flagUrl(team.flag)} alt={`${teamNameJa(team.id)}の国旗`} />
            <div>
              <strong>{teamNameJa(team.id)}</strong>
              <span>
                {confederationJa[team.confederation] || team.confederation} / グループ{team.group} / 第{team.seed}シード
                {fifaRank ? ` / FIFAランキング ${fifaRank}位` : ''}
                {coach ? ` / 監督 ${coach}` : ''}
              </span>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="閉じる">
            <X size={18} />
          </button>
        </header>

        <div className="team-modal-score">
          <span>現在の総ポイント</span>
          <strong>{breakdown.total}</strong>
          <em>保有: {owners}</em>
        </div>

        {wcHistory ? <div className="team-modal-history">過去W杯: {wcHistory}</div> : null}
        {summary ? <p className="team-modal-summary">{summary}</p> : null}

        {standing ? (
          <div className="team-modal-standing">
            <span>{standing.played}試</span>
            <span>{standing.wins}勝</span>
            <span>{standing.draws}分</span>
            <span>{standing.losses}敗</span>
            <span>得失{formatSigned(standing.goalDifference)}</span>
            <span>勝点{standing.fifaPoints}</span>
          </div>
        ) : null}

        <div className="team-modal-schedule">
          <span>残り試合 {remaining}</span>
          {nextMatch ? (
            <span>
              次戦 {nextMatch.kickoff ? formatKickoff(nextMatch.kickoff, tz, lang) : formatDateShort(nextMatch.date, tz, lang)} {nextMatch.home ? 'vs' : '@'}{' '}
              {nextMatch.opponentName}
            </span>
          ) : (
            <span>予選日程は終了</span>
          )}
          {nextMatchOddsText ? <span>{nextMatchOddsText}</span> : null}
        </div>

        <div className="team-modal-tallies" aria-label="自動取得イベント実績">
          <span>ハットトリック {hatTricks}</span>
          <span>黄 {yellowCards}</span>
          <span className={redCards ? 'danger' : ''}>赤 {redCards}</span>
          <span className={ownGoals ? 'danger' : ''}>OG {ownGoals}</span>
        </div>

        <section className="team-modal-breakdown">
          <h4>ポイント内訳</h4>
          {breakdown.components.length > 0 ? (
            breakdown.components.map((component) => (
              <div key={component.key} className="breakdown-row">
                <span className="breakdown-label">
                  {component.label}
                  {component.count > 1 ? ` ×${component.count}` : ''}
                </span>
                <div className="breakdown-bar-track">
                  <div
                    className={component.points < 0 ? 'breakdown-bar negative' : 'breakdown-bar'}
                    style={{ width: `${(Math.abs(component.points) / maxAbs) * 100}%` }}
                  />
                </div>
                <strong className={component.points < 0 ? 'negative' : ''}>
                  {component.points > 0 ? `+${component.points}` : component.points}
                </strong>
              </div>
            ))
          ) : (
            <p className="breakdown-empty">まだ加点なし（試合前）</p>
          )}
        </section>

        <section className="team-modal-squad">
          <h4>代表メンバー ({players.length}人)</h4>
          {(Object.keys(grouped) as PdfPlayer['pos'][]).map((position) =>
            grouped[position].length > 0 ? (
              <div key={position} className="team-modal-squad-group">
                <span className="squad-pos-label">{positionLabels[position]}</span>
                <div className="player-chip-grid">
                  {grouped[position].map((player) => (
                    <PlayerChip key={`${player.name}-${player.club ?? ''}`} player={player} playerStats={playerStats} />
                  ))}
                </div>
              </div>
            ) : null,
          )}
          <a
            className="team-modal-source gekisaka"
            href={`https://www.google.com/search?q=${encodeURIComponent(`site:gekisaka.jp ${teamNameJa(team.id)} 代表`)}`}
            target="_blank"
            rel="noreferrer"
          >
            ゲキサカで{teamNameJa(team.id)}代表の記事を読む
            <ExternalLink size={12} />
          </a>
          <span className="team-modal-credit">選手名簿・監督・解説: 配布資料 / 写真・年齢・身長: Wikidata・Wikimedia Commons</span>
        </section>
      </div>
    </div>,
    document.body,
  )
}

function PlayerChip({ player, playerStats }: { player: PdfPlayer; playerStats: Record<string, PlayerStat> }) {
  const info = playerInfoByJa[player.name]
  const age = info?.dob ? playerAge(info.dob) : null
  const bio = [age != null ? `${age}歳` : null, info?.heightCm ? `${info.heightCm}cm` : null, player.club || null]
    .filter(Boolean)
    .join(' / ')
  const stat = info?.en ? playerStats[normName(info.en)] : undefined
  const statParts: string[] = []
  if (stat?.goals) statParts.push(`得点${stat.goals}`)
  if (stat?.own) statParts.push(`OG${stat.own}`)
  if (stat?.yellow) statParts.push(`黄${stat.yellow}`)
  if (stat?.red) statParts.push(`赤${stat.red}`)
  const statLine = statParts.join('・')
  return (
    <div className="player-chip">
      {info?.photo ? (
        <img src={info.photo} alt={player.name} loading="lazy" />
      ) : (
        <span className="player-photo-fallback">{player.name.slice(0, 1)}</span>
      )}
      <div>
        <strong>{player.name}</strong>
        {bio ? <span>{bio}</span> : null}
        {statLine ? <span className="player-stat">{statLine}</span> : null}
      </div>
    </div>
  )
}

function teamNameJa(teamId: string): string {
  return teamNamesJa[teamId] || teams.find((team) => team.id === teamId)?.name || teamId
}

function normName(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function playerAge(dob: string): number | null {
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1
  return age
}


function formatSigned(value: number): string {
  if (value > 0) return `+${value}`
  return String(value)
}
