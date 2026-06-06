import type { AwardSettings, Group, Match, MatchResult, Member, MemberStanding, Rules, Team, TeamSelection, TeamStanding } from '../types'

type MutableStanding = Omit<TeamStanding, 'rank'> & { rank: number }

export function flagUrl(flag: string): string {
  return `https://flagcdn.com/${flag}.svg`
}

export function matchWasPlayed(match: Match): boolean {
  return match.result.home !== null && match.result.away !== null
}

const emptyAwards: AwardSettings = {
  championTeamId: '',
  runnerUpTeamId: '',
  thirdPlaceTeamId: '',
  mvpTeamId: '',
  topScorerTeamId: '',
}

export function calculateTeamStandings(
  groups: Group[],
  matches: Match[],
  rules: Rules,
  awards: AwardSettings = emptyAwards,
): TeamStanding[] {
  const rows = new Map<string, MutableStanding>()

  groups.forEach((group) => {
    group.teams.forEach((team) => {
      rows.set(team.id, {
        team,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        fifaPoints: 0,
        fantasyPoints: 0,
        rank: 0,
      })
    })
  })

  matches.forEach((match) => {
    if (!matchWasPlayed(match)) return
    const home = rows.get(match.homeTeamId)
    const away = rows.get(match.awayTeamId)
    if (!home || !away || match.result.home === null || match.result.away === null) return

    applyMatch(home, away, match.result, rules)
  })

  return groups.flatMap((group) => {
    const groupMatches = matches.filter((match) => match.group === group.code)
    const groupIsComplete = groupMatches.length > 0 && groupMatches.every(matchWasPlayed)
    const ranked = group.teams
      .map((team) => rows.get(team.id))
      .filter((row): row is MutableStanding => Boolean(row))
      .sort(sortTeamStanding)

    ranked.forEach((row, index) => {
      row.rank = index + 1
      if (groupIsComplete && index <= 1) row.fantasyPoints += rules.knockoutQualifiedBonus
      if (groupIsComplete && row.played > 0 && row.losses === row.played) row.fantasyPoints += rules.allLossBonus
      row.fantasyPoints += awardPoints(row.team.id, awards, rules)
      if (row.team.id === 'japan') row.fantasyPoints *= rules.japanMultiplier
      row.fantasyPoints = roundPoint(row.fantasyPoints)
    })

    return ranked
  })
}

export function groupStandings(allStandings: TeamStanding[], groupCode: string): TeamStanding[] {
  return allStandings.filter((row) => row.team.group === groupCode).sort(sortTeamStanding)
}

export function calculateMemberStandings(
  members: Member[],
  selections: TeamSelection[],
  teamStandings: TeamStanding[],
): MemberStanding[] {
  const teamRows = new Map(teamStandings.map((row) => [row.team.id, row]))

  const memberRows = members
    .map((member) => {
      const ownedTeams = selections
        .filter((selection) => selection.memberId === member.id)
        .map((selection) => teamRows.get(selection.teamId))
        .filter((row): row is TeamStanding => Boolean(row))

      return {
        member,
        teams: ownedTeams,
        total: roundPoint(ownedTeams.reduce((sum, row) => sum + row.fantasyPoints, 0)),
        rank: 0,
      }
    })
    .sort((a, b) => b.total - a.total || a.member.name.localeCompare(b.member.name, 'ja'))

  memberRows.forEach((row, index) => {
    row.rank = index + 1
  })

  return memberRows
}

function applyMatch(home: MutableStanding, away: MutableStanding, result: MatchResult, rules: Rules) {
  if (result.home === null || result.away === null) return
  const homeScore = result.home
  const awayScore = result.away
  home.played += 1
  away.played += 1
  home.goalsFor += homeScore
  home.goalsAgainst += awayScore
  away.goalsFor += awayScore
  away.goalsAgainst += homeScore
  home.goalDifference = home.goalsFor - home.goalsAgainst
  away.goalDifference = away.goalsFor - away.goalsAgainst
  applyEventPoints(home, result.homeHatTricks, result.homeYellowCards, result.homeRedCards, result.homeOwnGoals, rules)
  applyEventPoints(away, result.awayHatTricks, result.awayYellowCards, result.awayRedCards, result.awayOwnGoals, rules)

  const homePenaltyWinner = Boolean(result.homePenaltyWin && !result.awayPenaltyWin)
  const awayPenaltyWinner = Boolean(result.awayPenaltyWin && !result.homePenaltyWin)
  if (homeScore > awayScore || homePenaltyWinner) {
    applyWin(home, away, rules, Math.abs(homeScore - awayScore), homePenaltyWinner)
  } else if (awayScore > homeScore || awayPenaltyWinner) {
    applyWin(away, home, rules, Math.abs(homeScore - awayScore), awayPenaltyWinner)
  } else {
    home.draws += 1
    away.draws += 1
    home.fifaPoints += 1
    away.fifaPoints += 1
    home.fantasyPoints += rules.draw
    away.fantasyPoints += rules.draw
  }

  home.fantasyPoints = roundPoint(home.fantasyPoints)
  away.fantasyPoints = roundPoint(away.fantasyPoints)
}

function applyWin(winner: MutableStanding, loser: MutableStanding, rules: Rules, margin: number, penaltyWin: boolean) {
  winner.wins += 1
  loser.losses += 1
  winner.fifaPoints += 3
  winner.fantasyPoints += penaltyWin ? rules.penaltyWin : rules.win
  if (!penaltyWin && margin >= 3) winner.fantasyPoints += rules.goalMargin3Bonus
}

function applyEventPoints(
  row: MutableStanding,
  hatTricks = 0,
  yellowCards = 0,
  redCards = 0,
  ownGoals = 0,
  rules: Rules,
) {
  row.fantasyPoints += Math.max(0, hatTricks) * rules.hatTrickBonus
  row.fantasyPoints += Math.floor(Math.max(0, yellowCards) / 4) * rules.yellowCardsFourPenalty
  row.fantasyPoints += Math.max(0, redCards) * rules.redCardPenalty
  row.fantasyPoints += Math.max(0, ownGoals) * rules.ownGoalPenalty
}

function awardPoints(teamId: string, awards: AwardSettings, rules: Rules): number {
  let points = 0
  if (awards.championTeamId === teamId) points += rules.championBonus
  if (awards.runnerUpTeamId === teamId) points += rules.runnerUpBonus
  if (awards.thirdPlaceTeamId === teamId) points += rules.thirdPlaceBonus
  if (awards.mvpTeamId === teamId) points += rules.mvpBonus
  if (awards.topScorerTeamId === teamId) points += rules.topScorerBonus
  return points
}

function sortTeamStanding(a: TeamStanding, b: TeamStanding): number {
  return (
    b.fifaPoints - a.fifaPoints ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor ||
    a.team.seed - b.team.seed ||
    a.team.name.localeCompare(b.team.name)
  )
}

function roundPoint(value: number): number {
  return Math.round(value * 10) / 10
}

export function teamById(teams: Team[], id: string): Team | undefined {
  return teams.find((team) => team.id === id)
}
