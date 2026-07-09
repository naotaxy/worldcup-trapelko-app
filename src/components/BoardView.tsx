import { useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Bell, CalendarDays, Gauge, Medal, Network, Trophy } from 'lucide-react'
import { fifaRanking, teamNamesJa, teams, worldCupHistory } from '../data/worldCup2026'
import { broadcastByFixture } from '../data/broadcasts'
import { pdfCountryInfo, pdfSquads } from '../data/wcPdf'
import {
  calculateMemberStandings,
  calculateTeamBreakdown,
  flagUrl,
  groupStandings,
  matchWasPlayed,
  type RulesTimeline,
} from '../logic/score'
import { calculateFinalProjections, type MatchProb, type ProjectionMode } from '../logic/projection'
import type { AwardSettings, Group, GroupCode, Match, Member, Rules, TeamSelection, TeamStanding } from '../types'
import type { PlayerStat } from '../lib/api'
import type { BracketMatch, BracketRound, BracketTeam } from '../lib/bracket'
import { knockoutScores } from '../lib/bracket'
import { ProjectionGraph } from './ProjectionGraph'
import { GoogleMatchCard, KnockoutMatchCard } from './GoogleMatchCard'
import { TeamDetailModal } from './TeamDetailModal'
import { formatKickoff, useSettings, useT } from '../lib/i18n'

const maxTeamsPerMember = 8
const rescueTeamsPerMember = maxTeamsPerMember + 1
// 終了した決勝T試合を「試合・結果」に残す時間(キックオフ基準で約1日)。
const KNOCKOUT_KEEP_MS = 24 * 60 * 60 * 1000

export type BoardViewProps = {
  members: Member[]
  selections: TeamSelection[]
  rules: Rules | RulesTimeline
  awards: AwardSettings
  teamStandings: TeamStanding[]
  rescueBaselines?: Map<string, number>
  liveFixtures: Match[]
  groups: Group[]
  qualifierIds: Set<string>
  odds: Record<string, Record<string, number>>
  oddsProbs: Record<string, MatchProb>
  schedule: Record<string, string>
  playerStats: Record<string, PlayerStat>
  bracket: BracketRound[] | null
  bracketLoaded: boolean
  projectionMode: ProjectionMode
  onProjectionMode: (mode: ProjectionMode) => void
  isPublic?: boolean
  activeGroup?: GroupCode
  onActiveGroup?: (group: GroupCode) => void
}

export function BoardView({
  members,
  selections,
  rules,
  awards,
  teamStandings,
  rescueBaselines,
  liveFixtures,
  groups,
  qualifierIds,
  odds,
  oddsProbs,
  schedule,
  playerStats,
  bracket,
  bracketLoaded,
  projectionMode,
  onProjectionMode,
  isPublic = false,
  activeGroup: controlledActiveGroup,
  onActiveGroup,
}: BoardViewProps) {
  const [internalActiveGroup, setInternalActiveGroup] = useState<GroupCode>('F')
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [selectedPublicMatchId, setSelectedPublicMatchId] = useState('F-1')
  const activeGroup = controlledActiveGroup ?? internalActiveGroup
  const effectiveProjectionMode = isPublic && projectionMode === 'historyDemo' ? 'standard' : projectionMode
  const sectionId = (id: string) => (isPublic ? `room-${id}` : id)
  const t = useT()

  const groupStageComplete = useMemo(
    () => liveFixtures.length > 0 && liveFixtures.every((match) => match.result.home !== null && match.result.away !== null),
    [liveFixtures],
  )
  const activeRows = useMemo(() => groupStandings(teamStandings, activeGroup), [teamStandings, activeGroup])
  const activeMatches = useMemo(() => liveFixtures.filter((match) => match.group === activeGroup), [activeGroup, liveFixtures])
  const upcomingKnockoutMatches = useMemo(
    () =>
      (bracket ?? [])
        .flatMap((round) => round.matches.map((match) => ({ match, roundLabel: round.label })))
        // 未終了の試合＋終了した試合はキックオフから約1日は残す。現在時刻参照は意図的(陳腐化は許容)。
        // eslint-disable-next-line react-hooks/purity
        .filter(({ match }) => match.status !== 'post' || knockoutMatchTime(match.date) > Date.now() - KNOCKOUT_KEEP_MS)
        .sort((a, b) => knockoutMatchTime(a.match.date) - knockoutMatchTime(b.match.date)),
    [bracket],
  )
  // 決勝Tで負けて敗退した国(終了した試合の敗者)。ランキングで薄く表示する。
  const knockoutEliminatedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const round of bracket ?? []) {
      for (const match of round.matches) {
        if (match.status !== 'post') continue
        for (const team of [match.home, match.away]) {
          if (team.teamId && !team.winner) ids.add(team.teamId)
        }
      }
    }
    return ids
  }, [bracket])
  const knockoutScoreList = useMemo(() => knockoutScores(bracket), [bracket])
  const selectedPublicMatch = useMemo(
    () => activeMatches.find((match) => match.id === selectedPublicMatchId) || activeMatches[0] || liveFixtures[0],
    [activeMatches, liveFixtures, selectedPublicMatchId],
  )
  const memberStandings = useMemo(
    () => calculateMemberStandings(members, selections, teamStandings, rescueBaselines),
    [members, selections, teamStandings, rescueBaselines],
  )
  const memberProjections = useMemo(
    () =>
      calculateFinalProjections(
        members,
        selections,
        groups,
        liveFixtures,
        rules,
        awards,
        effectiveProjectionMode,
        oddsProbs,
        qualifierIds,
        odds,
        schedule,
        rescueBaselines,
        knockoutScoreList,
      ),
    [awards, effectiveProjectionMode, groups, knockoutScoreList, liveFixtures, members, odds, oddsProbs, qualifierIds, rescueBaselines, rules, schedule, selections],
  )
  const teamOwnersByTeam = useMemo(() => {
    const owners = new Map<string, string>()
    const ownerGroups = new Map<string, string[]>()
    selections.forEach((selection) => {
      const owner = members.find((member) => member.id === selection.memberId)
      if (!owner) return
      ownerGroups.set(selection.teamId, [...(ownerGroups.get(selection.teamId) || []), owner.name])
    })
    ownerGroups.forEach((names, teamId) => owners.set(teamId, names.join(' / ')))
    return owners
  }, [members, selections])

  const setActiveGroup = (group: GroupCode) => {
    if (onActiveGroup) onActiveGroup(group)
    else setInternalActiveGroup(group)
    setSelectedPublicMatchId(`${group}-1`)
  }

  const selectedTeam = selectedTeamId ? teams.find((entry) => entry.id === selectedTeamId) : null
  const selectedTeamModal = selectedTeam ? (
    <TeamDetailModal
      team={selectedTeam}
      breakdown={calculateTeamBreakdown(selectedTeam, groups, liveFixtures, rules, awards, qualifierIds, odds, schedule, knockoutScoreList)}
      owners={teamOwnersByTeam.get(selectedTeam.id) || '未決定'}
      players={pdfSquads[selectedTeam.id] || []}
      playerStats={playerStats}
      fifaRank={fifaRanking[selectedTeam.id]}
      wcHistory={worldCupHistory[selectedTeam.id]}
      summary={pdfCountryInfo[selectedTeam.id]?.summary}
      coach={pdfCountryInfo[selectedTeam.id]?.coach}
      remaining={remainingMatches(selectedTeam.id, liveFixtures).length}
      nextMatch={nextMatchForTeam(selectedTeam.id, liveFixtures, schedule, odds)}
      onClose={() => setSelectedTeamId(null)}
    />
  ) : null

  return (
    <>
      {groupStageComplete ? (
        <KnockoutBracket id={sectionId('bracket')} rounds={bracket} loaded={bracketLoaded} owners={teamOwnersByTeam} odds={odds} />
      ) : null}
      <details className="panel group-panel" id={sectionId('group-standings')} open={groupStageComplete ? undefined : true}>
        <summary className="rescue-summary">
          <span>
            <Trophy size={18} />
            <strong>{t('グループ')}{activeGroup} {t('順位')}</strong>
          </span>
          <em>{groupStageComplete ? '予選終了・タップで確認' : '国をタップで詳細'}</em>
        </summary>
        <nav className="group-tabs" aria-label="groups">
          {groups.map((group) => (
            <button
              key={group.code}
              type="button"
              className={group.code === activeGroup ? 'active' : ''}
              style={{ '--group-color': group.color } as CSSProperties}
              onClick={() => setActiveGroup(group.code)}
            >
              {group.code}
            </button>
          ))}
        </nav>
        <div className="standings-list">
          {activeRows.map((row, index) => (
            <button
              type="button"
              key={row.team.id}
              className="standings-row"
              onClick={() => setSelectedTeamId(row.team.id)}
              title={`${teamNameJa(row.team.id)}の詳細`}
            >
              <span className="standings-rank">{index + 1}</span>
              <img src={flagUrl(row.team.flag)} alt="" />
              <div className="standings-main">
                <strong>{teamNameJa(row.team.id)}</strong>
                <span>{teamOwnersByTeam.get(row.team.id) || t('持ち主未定')}</span>
              </div>
              <div className="standings-stats">
                <span>
                  {row.wins}勝{row.draws}分{row.losses}敗
                </span>
                <span>得失{formatSigned(row.goalDifference)}</span>
              </div>
              <strong className="standings-pt">
                {row.fantasyPoints}
                <em>pt</em>
              </strong>
            </button>
          ))}
        </div>
      </details>

      {isPublic ? (
        <section className="panel match-panel" id={sectionId('match-desk')}>
          <PanelTitle icon={<Bell size={18} />} title={t('試合・結果')} note="" />
          <div className="google-match-list">
            {groupStageComplete ? (
              upcomingKnockoutMatches.length > 0 ? (
                upcomingKnockoutMatches.map(({ match, roundLabel }) => (
                  <KnockoutMatchCard key={match.id} match={match} roundLabel={roundLabel} owners={teamOwnersByTeam} odds={odds} />
                ))
              ) : (
                <p className="match-desk-note">{t('決勝トーナメントの日程を取得中…')}</p>
              )
            ) : (
              activeMatches.map((match) => (
                <GoogleMatchCard
                  key={match.id}
                  match={match}
                  selected={selectedPublicMatch?.id === match.id}
                  onSelect={() => setSelectedPublicMatchId(match.id)}
                  kickoff={schedule[match.id]}
                  homeOwner={teamOwnersByTeam.get(match.homeTeamId)}
                  awayOwner={teamOwnersByTeam.get(match.awayTeamId)}
                  homeOdds={odds[match.id]?.[match.homeTeamId]}
                  awayOdds={odds[match.id]?.[match.awayTeamId]}
                  drawOdds={odds[match.id]?.draw}
                />
              ))
            )}
          </div>
        </section>
      ) : null}

      <section className="panel leaderboard-panel" id={sectionId('member-ranking')}>
        <PanelTitle icon={<Medal size={18} />} title={t('参加者ランキング')} note={t('総合ポイント')} />
        <div className="leader-list">
          {groupStageComplete && qualifierIds.size === 0 ? (
            <p className="match-desk-note">{t('順位を集計中…（決勝トーナメントのデータ取得待ち）')}</p>
          ) : (
            memberStandings.map((row) => (
            <article key={row.member.id} className="leader-row">
              <div className="member-avatar" style={{ '--avatar-color': row.member.accent } as CSSProperties}>
                {row.member.avatar}
              </div>
              <div className="leader-main">
                <div className="leader-name">
                  <span>{row.rank}</span>
                  {row.member.name}
                </div>
                <div className="team-pills">
                  {row.teams.slice(0, isPublic ? maxTeamsPerMember : rescueTeamsPerMember).map((team, index) => {
                    const teamOut =
                      groupStageComplete &&
                      (!qualifierIds.has(team.team.id) || knockoutEliminatedIds.has(team.team.id))
                    const isRescueTeam = !isPublic && index >= maxTeamsPerMember
                    return (
                      <button
                        key={team.team.id}
                        type="button"
                        className={teamOut ? 'team-pill team-pill-button team-pill-out' : 'team-pill team-pill-button'}
                        onClick={() => setSelectedTeamId(team.team.id)}
                        title={`${teamNameJa(team.team.id)}の内訳を見る`}
                      >
                        <img src={flagUrl(team.team.flag)} alt="" />
                        <span className="team-pill-name">{teamNameJa(team.team.id)}</span>
                        <em className="pill-group">{team.team.group}</em>
                        {isRescueTeam ? <em className="pill-rescue">{t('救済')}</em> : null}
                        <strong>{team.fantasyPoints}</strong>
                      </button>
                    )
                  })}
                </div>
              </div>
              <strong>{row.total}</strong>
            </article>
            ))
          )}
        </div>
      </section>

      <MatchSchedule id={sectionId('schedule')} fixtures={liveFixtures} schedule={schedule} owners={teamOwnersByTeam} odds={odds} />

      <section className="panel projection-panel" id={sectionId('projection-panel')}>
        <PanelTitle
          icon={<Gauge size={18} />}
          title={t('最終予想グラフ')}
          note={effectiveProjectionMode === 'historyDemo' ? '過去デモ / 平均値 / 中央値' : '標準 / 平均値 / 中央値'}
        />
        <ProjectionGraph
          projections={memberProjections}
          mode={effectiveProjectionMode}
          onModeChange={onProjectionMode}
          hideHistoryDemo={isPublic}
        />
      </section>

      {!groupStageComplete ? (
        <KnockoutBracket id={sectionId('bracket')} rounds={bracket} loaded={bracketLoaded} owners={teamOwnersByTeam} odds={odds} />
      ) : null}

      {selectedTeamModal}
    </>
  )
}

// Chronological broadcast schedule (collapsed). Shows every group-stage match in
// kickoff order with the Japanese terrestrial channel badge where one is set.
function MatchSchedule({
  id,
  fixtures,
  schedule,
  owners,
  odds,
}: {
  id: string
  fixtures: Match[]
  schedule: Record<string, string>
  owners: Map<string, string>
  odds: Record<string, Record<string, number>>
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { lang, tz } = useSettings()
  const t = useT()
  const sorted = useMemo(
    () =>
      [...fixtures].sort(
        (a, b) => new Date(schedule[a.id] || a.date).getTime() - new Date(schedule[b.id] || b.date).getTime(),
      ),
    [fixtures, schedule],
  )
  return (
    <details className="panel schedule-panel" id={id}>
      <summary className="rescue-summary">
        <span>
          <CalendarDays size={18} />
          <strong>{t('放送スケジュール')}</strong>
        </span>
        <em>{t('日付時間順・地上波は局名')}</em>
      </summary>
      <ul className="schedule-list">
        {sorted.map((match) => {
          const home = teams.find((entry) => entry.id === match.homeTeamId)
          const away = teams.find((entry) => entry.id === match.awayTeamId)
          const played = matchWasPlayed(match)
          const channel = broadcastByFixture[match.id]
          const expanded = expandedId === match.id
          const oddsId = `${id}-${match.id}-odds`
          const matchOdds = odds[match.id]
          const homeOdds = matchOdds?.[match.homeTeamId]
          const awayOdds = matchOdds?.[match.awayTeamId]
          const drawOdds = matchOdds?.draw
          const hasOdds = homeOdds != null || awayOdds != null || drawOdds != null
          const homeOwner = owners.get(match.homeTeamId)
          const awayOwner = owners.get(match.awayTeamId)
          return (
            <li key={match.id} className="schedule-item">
              <button
                type="button"
                className={expanded ? 'schedule-row expanded' : 'schedule-row'}
                aria-expanded={expanded}
                aria-controls={oddsId}
                onClick={() => setExpandedId((current) => (current === match.id ? null : match.id))}
              >
                <span className="schedule-time">{formatKickoff(schedule[match.id] || match.date, tz, lang)}</span>
                <span className="schedule-teams">
                  <span className="schedule-team-side">
                    {home ? <img src={flagUrl(home.flag)} alt="" /> : null}
                    <span className="schedule-name">{teamNameJa(match.homeTeamId)}</span>
                    {homeOwner ? <em className="match-owner schedule-owner">{homeOwner}</em> : null}
                  </span>
                  <em>{played ? `${match.result.home}-${match.result.away}` : 'vs'}</em>
                  <span className="schedule-team-side">
                    {away ? <img src={flagUrl(away.flag)} alt="" /> : null}
                    <span className="schedule-name">{teamNameJa(match.awayTeamId)}</span>
                    {awayOwner ? <em className="match-owner schedule-owner">{awayOwner}</em> : null}
                  </span>
                </span>
                {channel ? <span className="schedule-channel">{channel}</span> : <span className="schedule-channel dazn">DAZN</span>}
              </button>
              {expanded ? (
                <div id={oddsId} className="schedule-odds-line">
                  <strong>{t('オッズ予想')}</strong>
                  {hasOdds ? (
                    <span>
                      {homeOdds != null ? `${teamNameJa(match.homeTeamId)}${t('勝ち')} ${formatOdds(homeOdds)}` : null}
                      {homeOdds != null && (drawOdds != null || awayOdds != null) ? ' / ' : null}
                      {drawOdds != null ? `${t('引分')} ${formatOdds(drawOdds)}` : null}
                      {drawOdds != null && awayOdds != null ? ' / ' : null}
                      {awayOdds != null ? `${teamNameJa(match.awayTeamId)}${t('勝ち')} ${formatOdds(awayOdds)}` : null}
                    </span>
                  ) : (
                    <span className="schedule-odds-empty">{t('オッズなし')}</span>
                  )}
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </details>
  )
}

function formatOdds(value: number): string {
  return `${value.toFixed(2)}倍`
}

function knockoutMatchTime(iso: string): number {
  const time = new Date(iso).getTime()
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
}

function KnockoutBracket({
  id,
  rounds,
  loaded,
  owners,
  odds,
}: {
  id: string
  rounds: BracketRound[] | null
  loaded: boolean
  owners: Map<string, string>
  odds: Record<string, Record<string, number>>
}) {
  return (
    <section className="panel bracket-panel" id={id}>
      <PanelTitle icon={<Network size={18} />} title="決勝トーナメント 組合せ" note="" />
      {!loaded ? (
        <p className="bracket-note">読み込み中…</p>
      ) : !rounds ? (
        <p className="bracket-note">組合せは予選終了後（決勝トーナメント確定後）に自動表示されます。</p>
      ) : (
        <div className="bracket-scroll">
          {rounds.map((round) => (
            <div key={round.slug} className="bracket-round">
              <h4>{round.label}</h4>
              {round.matches.map((match) => (
                <BracketCard key={match.id} match={match} owners={owners} odds={odds} />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function BracketCard({
  match,
  owners,
  odds,
}: {
  match: BracketMatch
  owners: Map<string, string>
  odds: Record<string, Record<string, number>>
}) {
  const [open, setOpen] = useState(false)
  const { lang, tz } = useSettings()
  const t = useT()
  const when = formatKickoff(match.date, tz, lang)
  const cardClassName = match.status === 'post' ? 'bracket-card done' : 'bracket-card'
  const body = (
    <>
      {when ? <span className="bracket-date">{when}</span> : null}
      <BracketTeamRow team={match.home} owners={owners} />
      <BracketTeamRow team={match.away} owners={owners} />
    </>
  )
  const homeTeamId = match.home.teamId
  const awayTeamId = match.away.teamId
  if (!homeTeamId || !awayTeamId) {
    return <div className={cardClassName}>{body}</div>
  }

  const oddsId = `bracket-odds-${match.id}`
  const matchOdds = odds[match.id]
  const homeOdds = matchOdds?.[homeTeamId]
  const awayOdds = matchOdds?.[awayTeamId]
  const drawOdds = matchOdds?.draw
  const hasOdds = homeOdds != null || awayOdds != null || drawOdds != null
  return (
    <div className={cardClassName}>
      <button
        type="button"
        className="bracket-card-button"
        aria-expanded={open}
        aria-controls={oddsId}
        onClick={() => setOpen((current) => !current)}
      >
        {body}
      </button>
      {open ? (
        <div id={oddsId} className="bracket-odds-line">
          <strong>{t('オッズ予想')}</strong>
          {hasOdds ? (
            <span>
              {homeOdds != null ? `${teamNameJa(homeTeamId)}${t('勝ち')} ${formatOdds(homeOdds)}` : null}
              {homeOdds != null && (drawOdds != null || awayOdds != null) ? ' / ' : null}
              {drawOdds != null ? `${t('引分')} ${formatOdds(drawOdds)}` : null}
              {drawOdds != null && awayOdds != null ? ' / ' : null}
              {awayOdds != null ? `${teamNameJa(awayTeamId)}${t('勝ち')} ${formatOdds(awayOdds)}` : null}
            </span>
          ) : (
            <span className="schedule-odds-empty">{t('オッズなし')}</span>
          )}
        </div>
      ) : null}
    </div>
  )
}

function BracketTeamRow({ team, owners }: { team: BracketTeam; owners: Map<string, string> }) {
  const owner = team.teamId ? owners.get(team.teamId) : null
  return (
    <span className={team.winner ? 'bracket-team winner' : 'bracket-team'}>
      {team.flag ? <img src={team.flag} alt="" /> : <span className="bracket-tbd" />}
      <span className="bracket-team-name">
        <span className="bracket-country-name">{team.name}</span>
        {owner ? <em className="match-owner bracket-owner">{owner}</em> : null}
      </span>
      <strong>{team.score ?? ''}</strong>
    </span>
  )
}

function PanelTitle({ icon, title, note }: { icon: ReactNode; title: string; note?: string }) {
  return (
    <div className="panel-title">
      <div>
        {icon}
        <h3>{title}</h3>
      </div>
      {note ? <span>{note}</span> : null}
    </div>
  )
}

function remainingMatches(teamId: string, liveFixtures: Match[]): Match[] {
  return liveFixtures
    .filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId)
    .filter((match) => !matchWasPlayed(match))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function nextMatchForTeam(
  teamId: string,
  liveFixtures: Match[],
  schedule: Record<string, string>,
  odds: Record<string, Record<string, number>>,
) {
  const upcoming = remainingMatches(teamId, liveFixtures)[0]
  if (!upcoming) return null
  return {
    date: upcoming.date,
    kickoff: schedule[upcoming.id],
    opponentName: teamNameJa(upcoming.homeTeamId === teamId ? upcoming.awayTeamId : upcoming.homeTeamId),
    home: upcoming.homeTeamId === teamId,
    winOdds: odds[upcoming.id]?.[teamId],
    drawOdds: odds[upcoming.id]?.draw,
  }
}

function teamNameJa(teamId: string): string {
  return teamNamesJa[teamId] || teams.find((team) => team.id === teamId)?.name || teamId
}


function formatSigned(value: number): string {
  if (value > 0) return `+${value}`
  return String(value)
}
