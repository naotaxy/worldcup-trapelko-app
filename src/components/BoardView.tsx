import { useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Bell, Gauge, Medal, Network, Trophy } from 'lucide-react'
import { fifaRanking, teamNamesJa, teams, worldCupHistory } from '../data/worldCup2026'
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
import { ProjectionGraph } from './ProjectionGraph'
import { GoogleMatchCard } from './GoogleMatchCard'
import { TeamDetailModal } from './TeamDetailModal'
import { formatKickoff, useSettings } from '../lib/i18n'

const maxTeamsPerMember = 8

export type BoardViewProps = {
  members: Member[]
  selections: TeamSelection[]
  rules: Rules | RulesTimeline
  awards: AwardSettings
  teamStandings: TeamStanding[]
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

  const groupStageComplete = useMemo(
    () => liveFixtures.length > 0 && liveFixtures.every((match) => match.result.home !== null && match.result.away !== null),
    [liveFixtures],
  )
  const activeRows = useMemo(() => groupStandings(teamStandings, activeGroup), [teamStandings, activeGroup])
  const activeMatches = useMemo(() => liveFixtures.filter((match) => match.group === activeGroup), [activeGroup, liveFixtures])
  const selectedPublicMatch = useMemo(
    () => activeMatches.find((match) => match.id === selectedPublicMatchId) || activeMatches[0] || liveFixtures[0],
    [activeMatches, liveFixtures, selectedPublicMatchId],
  )
  const memberStandings = useMemo(
    () => calculateMemberStandings(members, selections, teamStandings),
    [members, selections, teamStandings],
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
      ),
    [awards, effectiveProjectionMode, groups, liveFixtures, members, odds, oddsProbs, qualifierIds, rules, schedule, selections],
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
      breakdown={calculateTeamBreakdown(selectedTeam, groups, liveFixtures, rules, awards, qualifierIds, odds, schedule)}
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
      {groupStageComplete ? <KnockoutBracket id={sectionId('bracket')} rounds={bracket} loaded={bracketLoaded} /> : null}
      <details className="panel group-panel" id={sectionId('group-standings')} open={groupStageComplete ? undefined : true}>
        <summary className="rescue-summary">
          <span>
            <Trophy size={18} />
            <strong>グループ{activeGroup} 順位</strong>
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
                <span>{teamOwnersByTeam.get(row.team.id) || '持ち主未定'}</span>
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
          <PanelTitle icon={<Bell size={18} />} title="試合・結果" note="" />
          <div className="google-match-list">
            {activeMatches.map((match) => (
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
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel leaderboard-panel" id={sectionId('member-ranking')}>
        <PanelTitle icon={<Medal size={18} />} title="参加者ランキング" note="総合ポイント" />
        <div className="leader-list">
          {memberStandings.map((row) => (
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
                  {row.teams.slice(0, maxTeamsPerMember).map((team) => (
                    <button
                      key={team.team.id}
                      type="button"
                      className="team-pill team-pill-button"
                      onClick={() => setSelectedTeamId(team.team.id)}
                      title={`${teamNameJa(team.team.id)}の内訳を見る`}
                    >
                      <img src={flagUrl(team.team.flag)} alt="" />
                      {teamNameJa(team.team.id)}
                      <em className="pill-group">{team.team.group}</em>
                      <strong>{team.fantasyPoints}</strong>
                    </button>
                  ))}
                </div>
              </div>
              <strong>{row.total}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="panel projection-panel" id={sectionId('projection-panel')}>
        <PanelTitle
          icon={<Gauge size={18} />}
          title="最終予想グラフ"
          note={effectiveProjectionMode === 'historyDemo' ? '過去デモ / 平均値 / 中央値' : '標準 / 平均値 / 中央値'}
        />
        <ProjectionGraph
          projections={memberProjections}
          mode={effectiveProjectionMode}
          onModeChange={onProjectionMode}
          hideHistoryDemo={isPublic}
        />
      </section>

      {!groupStageComplete ? <KnockoutBracket id={sectionId('bracket')} rounds={bracket} loaded={bracketLoaded} /> : null}

      {selectedTeamModal}
    </>
  )
}

function KnockoutBracket({ id, rounds, loaded }: { id: string; rounds: BracketRound[] | null; loaded: boolean }) {
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
                <BracketCard key={match.id} match={match} />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function BracketCard({ match }: { match: BracketMatch }) {
  const { lang, tz } = useSettings()
  const when = formatKickoff(match.date, tz, lang)
  return (
    <div className={match.status === 'post' ? 'bracket-card done' : 'bracket-card'}>
      {when ? <div className="bracket-date">{when}</div> : null}
      <BracketTeamRow team={match.home} />
      <BracketTeamRow team={match.away} />
    </div>
  )
}

function BracketTeamRow({ team }: { team: BracketTeam }) {
  return (
    <div className={team.winner ? 'bracket-team winner' : 'bracket-team'}>
      {team.flag ? <img src={team.flag} alt="" /> : <span className="bracket-tbd" />}
      <span className="bracket-team-name">{team.name}</span>
      <strong>{team.score ?? ''}</strong>
    </div>
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
