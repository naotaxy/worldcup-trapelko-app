import { teamNamesJa, teams } from '../data/worldCup2026'
import { knockoutChannelForKickoff } from '../data/knockoutBroadcasts'
import { flagUrl, matchWasPlayed } from '../logic/score'
import { formatDateShort, formatKickoff, useSettings, useT } from '../lib/i18n'
import type { BracketMatch, BracketTeam } from '../lib/bracket'
import type { Match, Team } from '../types'

export function GoogleMatchCard({
  match,
  selected,
  onSelect,
  kickoff,
  homeOwner,
  awayOwner,
  homeOdds,
  awayOdds,
  drawOdds,
}: {
  match: Match
  selected: boolean
  onSelect: () => void
  kickoff?: string
  homeOwner?: string
  awayOwner?: string
  homeOdds?: number
  awayOdds?: number
  drawOdds?: number
}) {
  const { lang, tz } = useSettings()
  const homeTeam = teams.find((team) => team.id === match.homeTeamId) || teams[0]
  const awayTeam = teams.find((team) => team.id === match.awayTeamId) || teams[0]
  const played = matchWasPlayed(match)
  // Worldwide (English) Google News search for the fixture: far more coverage,
  // including overseas sources, than the old Yahoo! JAPAN search.
  const newsUrl = `https://news.google.com/search?q=${encodeURIComponent(`${homeTeam.name} ${awayTeam.name} World Cup`)}&hl=en-US&gl=US&ceid=US:en`

  return (
    <button type="button" className={selected ? 'google-match-card active' : 'google-match-card'} onClick={onSelect}>
      <div className="google-match-meta">
        <span>{kickoff ? formatKickoff(kickoff, tz, lang) : formatDateShort(match.date, tz, lang)}</span>
        <strong>グループ{match.group}</strong>
        {drawOdds != null ? <span className="draw-odds">引分 {drawOdds.toFixed(2)}倍</span> : null}
        <em>{played ? '終了' : '試合前'}</em>
      </div>
      <TeamScoreLine team={homeTeam} owner={homeOwner} odds={homeOdds} score={match.result.home} winner={played && isMatchWinner(match, 'home')} />
      <TeamScoreLine team={awayTeam} owner={awayOwner} odds={awayOdds} score={match.result.away} winner={played && isMatchWinner(match, 'away')} />
      <div className="google-match-links">
        <a href={match.highlightUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
          ハイライト
        </a>
        <a href={newsUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
          ニュース
        </a>
      </div>
    </button>
  )
}

export function KnockoutMatchCard({
  match,
  roundLabel,
  owners,
  odds,
  selected = false,
  onSelect,
}: {
  match: BracketMatch
  roundLabel: string
  owners: Map<string, string>
  odds: Record<string, Record<string, number>>
  selected?: boolean
  onSelect?: () => void
}) {
  const { lang, tz } = useSettings()
  const t = useT()
  const channel = knockoutChannelForKickoff(match.date)
  const matchOdds = odds[match.id]
  const drawOdds = matchOdds?.draw
  const statusLabel = match.status === 'post' ? t('終了') : match.status === 'in' ? t('試合中') : t('試合前')
  const className = selected ? 'google-match-card knockout-match-card active' : 'google-match-card knockout-match-card'
  const body = (
    <>
      <div className="google-match-meta knockout-match-meta">
        <span>{formatKickoff(match.date, tz, lang)}</span>
        <strong>{roundLabel}</strong>
        <span className={channel === 'DAZN' ? 'schedule-channel knockout-channel dazn' : 'schedule-channel knockout-channel'}>
          {channel}
        </span>
        {drawOdds != null ? <span className="draw-odds">{`${t('引分')} ${drawOdds.toFixed(2)}倍`}</span> : null}
        <em>{statusLabel}</em>
      </div>
      <KnockoutTeamScoreLine team={match.home} owner={match.home.teamId ? owners.get(match.home.teamId) : undefined} odds={match.home.teamId ? matchOdds?.[match.home.teamId] : undefined} />
      <KnockoutTeamScoreLine team={match.away} owner={match.away.teamId ? owners.get(match.away.teamId) : undefined} odds={match.away.teamId ? matchOdds?.[match.away.teamId] : undefined} />
    </>
  )

  return onSelect ? (
    <button type="button" className={className} onClick={onSelect}>
      {body}
    </button>
  ) : (
    <article className={className}>{body}</article>
  )
}

function KnockoutTeamScoreLine({ team, owner, odds }: { team: BracketTeam; owner?: string; odds?: number }) {
  return (
    <div className={team.winner ? 'team-score-line knockout-team-line winner' : 'team-score-line knockout-team-line'}>
      <span>
        {team.flag ? <img src={team.flag} alt="" /> : <span className="knockout-flag-placeholder" />}
        <span className="knockout-team-name">{team.name}</span>
        {owner ? <em className="match-owner">{owner}</em> : null}
        {odds != null ? <em className="match-odds">{odds.toFixed(2)}倍</em> : null}
      </span>
      <strong>{team.score ?? '-'}</strong>
    </div>
  )
}

function TeamScoreLine({
  team,
  score,
  winner,
  owner,
  odds,
}: {
  team: Team
  score: number | null
  winner: boolean
  owner?: string
  odds?: number
}) {
  return (
    <div className={winner ? 'team-score-line winner' : 'team-score-line'}>
      <span>
        <img src={flagUrl(team.flag)} alt={`${teamNameJa(team.id)}の国旗`} />
        {teamNameJa(team.id)}
        {owner ? <em className="match-owner">{owner}</em> : null}
        {odds ? <em className="match-odds">{odds.toFixed(2)}倍</em> : null}
      </span>
      <strong>{score ?? '-'}</strong>
    </div>
  )
}

function isMatchWinner(match: Match, side: 'home' | 'away'): boolean {
  if (!matchWasPlayed(match) || match.result.home === null || match.result.away === null) return false
  if (side === 'home') return match.result.home > match.result.away || Boolean(match.result.homePenaltyWin)
  return match.result.away > match.result.home || Boolean(match.result.awayPenaltyWin)
}

function teamNameJa(teamId: string): string {
  return teamNamesJa[teamId] || teams.find((team) => team.id === teamId)?.name || teamId
}
