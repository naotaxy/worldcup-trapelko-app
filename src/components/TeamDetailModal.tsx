import { ExternalLink, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { playerInfoJa } from '../data/playerInfoJa'
import type { PdfPlayer } from '../data/wcPdf'
import { teamNamesJa, teams } from '../data/worldCup2026'
import { flagUrl, type TeamBreakdown } from '../logic/score'
import { formatDateShort, formatKickoff, useSettings, useT } from '../lib/i18n'
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
const playerInfoByNormEnglish = buildPlayerInfoByNormEnglish()

type NameAliases = {
  full: Set<string>
  surname: Set<string>
  initialSurname: Set<string>
}

type PlayerInfoLookup = {
  ja: string
  club?: string
}

type SquadCandidate = {
  player: PdfPlayer
  aliases: NameAliases
}

type PlayerStatEntry = {
  key: string
  stat: PlayerStat
  displayName: string
  aliases: NameAliases
}

type TeamPlayerStatMatches = {
  entries: PlayerStatEntry[]
  playerByStatKey: Map<string, PdfPlayer>
  statByPlayer: Map<PdfPlayer, PlayerStat>
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
  const teamPlayerStats = buildTeamPlayerStatMatches(team, players, playerStats)
  const recorded = teamPlayerStats.entries
    .filter(({ stat }) => (stat.goals || 0) + (stat.yellow || 0) + (stat.red || 0) + (stat.own || 0) > 0)
    .map(({ key, stat, displayName }) => ({
      ...stat,
      key,
      label: teamPlayerStats.playerByStatKey.get(key)?.name || japaneseNameForEnglish(displayName) || stat.name || '?',
    }))
    .sort((a, b) => (b.goals || 0) - (a.goals || 0) || (b.red || 0) - (a.red || 0) || (b.yellow || 0) - (a.yellow || 0))
  const { lang, tz } = useSettings()
  const t = useT()
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

        <div className="team-modal-tallies" aria-label={t('自動取得イベント実績（予選・決勝T）')}>
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

        {recorded.length > 0 ? (
          <section className="team-modal-record">
            <h4>{t('試合の記録（予選・決勝T、自動取得）')}</h4>
            <ul className="team-record-list">
              {recorded.map((r) => (
                <li key={r.key}>
                  <span>{r.label}</span>
                  <strong>
                    {[
                      r.goals ? `得点${r.goals}` : null,
                      r.own ? `OG${r.own}` : null,
                      r.yellow ? `黄${r.yellow}` : null,
                      r.red ? `赤${r.red}` : null,
                    ]
                      .filter(Boolean)
                      .join('・')}
                  </strong>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="team-modal-squad">
          <h4>代表メンバー ({players.length}人)</h4>
          {(Object.keys(grouped) as PdfPlayer['pos'][]).map((position) =>
            grouped[position].length > 0 ? (
              <div key={position} className="team-modal-squad-group">
                <span className="squad-pos-label">{positionLabels[position]}</span>
                <div className="player-chip-grid">
                  {grouped[position].map((player) => (
                    <PlayerChip key={`${player.name}-${player.club ?? ''}`} player={player} stat={teamPlayerStats.statByPlayer.get(player)} />
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

function PlayerChip({ player, stat }: { player: PdfPlayer; stat?: PlayerStat }) {
  const info = playerInfoByJa[player.name]
  const age = info?.dob ? playerAge(info.dob) : null
  const bio = [age != null ? `${age}歳` : null, info?.heightCm ? `${info.heightCm}cm` : null, player.club || null]
    .filter(Boolean)
    .join(' / ')
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

function buildTeamPlayerStatMatches(team: Team, players: PdfPlayer[], playerStats: Record<string, PlayerStat>): TeamPlayerStatMatches {
  const candidates: SquadCandidate[] = players
    .map((player) => {
      const en = playerInfoByJa[player.name]?.en
      return en ? { player, aliases: nameAliases(en) } : null
    })
    .filter((candidate): candidate is SquadCandidate => Boolean(candidate))
  const entries: PlayerStatEntry[] = Object.entries(playerStats)
    .filter(([, stat]) => stat.abbr === team.shortName)
    .map(([key, stat]) => ({
      key,
      stat,
      displayName: stat.name || key,
      aliases: nameAliases(stat.name || key),
    }))
  const playerByStatKey = new Map<string, PdfPlayer>()
  const statByPlayer = new Map<PdfPlayer, PlayerStat>()
  const usedStats = new Set<string>()
  const usedPlayers = new Set<PdfPlayer>()
  const tiers: Array<keyof NameAliases> = ['full', 'surname', 'initialSurname']

  for (const tier of tiers) {
    const index = uniqueCandidateIndex(
      candidates.filter((candidate) => !usedPlayers.has(candidate.player)),
      tier,
    )

    for (const entry of entries) {
      if (usedStats.has(entry.key)) continue
      const candidate = findUniqueCandidate(entry.aliases[tier], index, usedPlayers)
      if (!candidate) continue

      playerByStatKey.set(entry.key, candidate.player)
      statByPlayer.set(candidate.player, entry.stat)
      usedStats.add(entry.key)
      usedPlayers.add(candidate.player)
    }
  }

  for (const entry of entries) {
    if (usedStats.has(entry.key)) continue
    const candidate = findUniqueJapaneseCandidate(entry.displayName, candidates, usedPlayers)
    if (!candidate) continue

    playerByStatKey.set(entry.key, candidate.player)
    statByPlayer.set(candidate.player, entry.stat)
    usedStats.add(entry.key)
    usedPlayers.add(candidate.player)
  }

  return { entries, playerByStatKey, statByPlayer }
}

function uniqueCandidateIndex(candidates: SquadCandidate[], tier: keyof NameAliases): Map<string, SquadCandidate> {
  const buckets = new Map<string, SquadCandidate[]>()
  for (const candidate of candidates) {
    for (const alias of candidate.aliases[tier]) {
      const bucket = buckets.get(alias)
      if (bucket) bucket.push(candidate)
      else buckets.set(alias, [candidate])
    }
  }

  const index = new Map<string, SquadCandidate>()
  for (const [alias, bucket] of buckets) {
    const uniquePlayers = new Set(bucket.map((candidate) => candidate.player))
    if (uniquePlayers.size === 1) index.set(alias, bucket[0])
  }
  return index
}

function findUniqueCandidate(
  aliases: Set<string>,
  index: Map<string, SquadCandidate>,
  usedPlayers: Set<PdfPlayer>,
): SquadCandidate | null {
  const matches = new Set<SquadCandidate>()
  for (const alias of aliases) {
    const candidate = index.get(alias)
    if (candidate && !usedPlayers.has(candidate.player)) matches.add(candidate)
  }
  return matches.size === 1 ? [...matches][0] : null
}

function findUniqueJapaneseCandidate(name: string, candidates: SquadCandidate[], usedPlayers: Set<PdfPlayer>): SquadCandidate | null {
  const info = playerInfoForEnglish(name)
  if (!info) return null
  const targetName = normalizeJapanese(info.ja)
  if (!targetName) return null
  const scored = candidates
    .filter((candidate) => !usedPlayers.has(candidate.player))
    .map((candidate) => {
      const squadName = normalizeJapanese(candidate.player.name)
      const nameScore = japaneseSimilarity(targetName, squadName)
      const clubMatch = clubsMatch(info.club, candidate.player.club)
      const accepted = targetName === squadName || nameScore >= 0.78 || (clubMatch && nameScore >= 0.45)
      return accepted ? { candidate, score: nameScore + (clubMatch ? 0.25 : 0) + (targetName === squadName ? 0.5 : 0) } : null
    })
    .filter((candidate): candidate is { candidate: SquadCandidate; score: number } => Boolean(candidate))
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) return null
  const [best, second] = scored
  if (second && best.score - second.score < 0.12) return null
  return best.candidate
}

function nameAliases(name: string): NameAliases {
  const tokens = nameTokens(name)
  return {
    full: fullNameAliases(name, tokens),
    surname: surnameAliases(tokens),
    initialSurname: initialSurnameAliases(tokens),
  }
}

function fullNameAliases(name: string, tokens = nameTokens(name)): Set<string> {
  const aliases = new Set<string>()
  const direct = normName(name)
  if (direct) aliases.add(direct)
  if (tokens.length > 1) {
    aliases.add(tokens.join(''))
    aliases.add([...tokens.slice(1), tokens[0]].join(''))
    aliases.add([tokens[tokens.length - 1], ...tokens.slice(0, -1)].join(''))
  }
  return aliases
}

function surnameAliases(tokens: string[]): Set<string> {
  const aliases = new Set<string>()
  if (tokens.length === 0) return aliases
  aliases.add(tokens[tokens.length - 1])
  return aliases
}

function initialSurnameAliases(tokens: string[]): Set<string> {
  const aliases = new Set<string>()
  if (tokens.length < 2) return aliases
  for (const surname of surnamePartsFromEnd(tokens)) aliases.add(`${tokens[0].slice(0, 1)}${surname}`)
  return aliases
}

function surnamePartsFromEnd(tokens: string[]): string[] {
  const last = tokens[tokens.length - 1]
  const parts = [last]
  if (tokens.length > 2) {
    const previous = tokens[tokens.length - 2]
    if (isSurnameParticle(previous)) parts.push(`${previous}${last}`)
  }
  return parts
}

function isSurnameParticle(token: string): boolean {
  return ['al', 'da', 'de', 'del', 'di', 'dos', 'du', 'el', 'la', 'le', 'lo', 'mac', 'mc', 'van', 'von'].includes(token)
}

function nameTokens(name: string): string[] {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function buildPlayerInfoByNormEnglish(): Map<string, PlayerInfoLookup> {
  const buckets = new Map<string, Map<string, PlayerInfoLookup>>()
  for (const [en, info] of Object.entries(playerInfoJa)) {
    if (!info.ja) continue
    for (const alias of fullNameAliases(en)) {
      const bucket = buckets.get(alias)
      const value = { ja: info.ja, club: info.club }
      const key = `${value.ja}\0${value.club ?? ''}`
      if (bucket) bucket.set(key, value)
      else buckets.set(alias, new Map([[key, value]]))
    }
  }

  const lookup = new Map<string, PlayerInfoLookup>()
  for (const [alias, values] of buckets) {
    if (values.size === 1) lookup.set(alias, [...values.values()][0])
  }
  return lookup
}

function playerInfoForEnglish(name: string): PlayerInfoLookup | undefined {
  const matches = new Map<string, PlayerInfoLookup>()
  for (const alias of fullNameAliases(name)) {
    const info = playerInfoByNormEnglish.get(alias)
    if (info) matches.set(`${info.ja}\0${info.club ?? ''}`, info)
  }
  return matches.size === 1 ? [...matches.values()][0] : undefined
}

function japaneseNameForEnglish(name: string): string | undefined {
  const labels = new Set<string>()
  for (const alias of fullNameAliases(name)) {
    const info = playerInfoByNormEnglish.get(alias)
    if (info) labels.add(info.ja)
  }
  return labels.size === 1 ? [...labels][0] : undefined
}

function normalizeJapanese(value?: string): string {
  return (value || '')
    .normalize('NFKC')
    .replace(/[A-Za-z]+/g, '')
    .replace(/[・=＝\s()（）]/g, '')
    .replace(/[ーｰ]/g, '')
    .replace(/[ッっ]/g, '')
}

function clubsMatch(a?: string, b?: string): boolean {
  const left = normalizeJapanese(a)
  const right = normalizeJapanese(b)
  if (!left || !right) return false
  return left === right || (Math.min(left.length, right.length) >= 4 && (left.includes(right) || right.includes(left)))
}

function japaneseSimilarity(a: string, b: string): number {
  if (!a || !b) return 0
  return 1 - editDistance(a, b) / Math.max(a.length, b.length)
}

function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  const current = Array.from({ length: b.length + 1 }, () => 0)

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    previous.splice(0, previous.length, ...current)
  }

  return previous[b.length]
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
