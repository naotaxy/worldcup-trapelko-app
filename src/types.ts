export type GroupCode =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L'

export type Team = {
  id: string
  name: string
  shortName: string
  flag: string
  confederation: string
  group: GroupCode
  seed: number
}

export type SquadPosition = 'GK' | 'DF' | 'MF' | 'FW'

export type SquadPlayer = {
  name: string
  position: SquadPosition
}

export type Group = {
  code: GroupCode
  headline: string
  color: string
  teams: Team[]
}

export type MatchResult = {
  home: number | null
  away: number | null
  homePenaltyWin?: boolean
  awayPenaltyWin?: boolean
  homeHatTricks?: number
  awayHatTricks?: number
  homeYellowCards?: number
  awayYellowCards?: number
  homeRedCards?: number
  awayRedCards?: number
  homeOwnGoals?: number
  awayOwnGoals?: number
}

export type Match = {
  id: string
  group: GroupCode
  date: string
  venue: string
  homeTeamId: string
  awayTeamId: string
  result: MatchResult
  highlightUrl?: string
  newsUrl?: string
  featuredPlayers?: string[]
}

export type Member = {
  id: string
  name: string
  lineName: string
  avatar: string
  accent: string
}

export type TeamSelection = {
  memberId: string
  teamId: string
}

export type Rules = {
  win: number
  penaltyWin: number
  draw: number
  goalMargin3Bonus: number
  hatTrickBonus: number
  knockoutQualifiedBonus: number
  thirdPlaceBonus: number
  runnerUpBonus: number
  championBonus: number
  allLossBonus: number
  mvpBonus: number
  topScorerBonus: number
  yellowCardsFourPenalty: number
  redCardPenalty: number
  ownGoalPenalty: number
  japanMultiplier: number
}

export type AwardSettings = {
  championTeamId: string
  runnerUpTeamId: string
  thirdPlaceTeamId: string
  mvpTeamId: string
  topScorerTeamId: string
}

export type TeamStanding = {
  team: Team
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  fifaPoints: number
  fantasyPoints: number
  rank: number
}

export type MemberStanding = {
  member: Member
  teams: TeamStanding[]
  total: number
  rank: number
}

export type ContentLead = {
  id: string
  label: string
  match: string
  summary: string
  url: string
  source: string
  kind: 'highlight' | 'news' | 'search'
}
