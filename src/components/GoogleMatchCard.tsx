import { teamNamesJa, teams } from '../data/worldCup2026'
import { flagUrl, matchWasPlayed } from '../logic/score'
import { formatDateShort, formatKickoff, useSettings } from '../lib/i18n'
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

