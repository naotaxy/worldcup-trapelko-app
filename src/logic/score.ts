import type { AwardSettings, Group, Match, Member, MemberStanding, Rules, Team, TeamSelection, TeamStanding } from '../types'

type MutableStanding = Omit<TeamStanding, 'rank'> & { rank: number }

export function flagUrl(flag: string): string {
  return `https://flagcdn.com/${flag}.svg`
}

export function matchWasPlayed(match: Match): boolean {
  return match.result.home !== null && match.result.away !== null
}

export type RuleSegment = { from: string | null; rules: Rules }
export type RulesTimeline = RuleSegment[]

// Accepts either a single Rules object (the legacy form) or a timeline of rule
// segments. A plain Rules behaves exactly like a single segment effective from
// the beginning, so every existing caller is unchanged.
export function toRulesTimeline(rules: Rules | RulesTimeline): RulesTimeline {
  return Array.isArray(rules) ? rules : [{ from: null, rules }]
}

export function latestRulesOf(rules: Rules | RulesTimeline): Rules {
  const timeline = toRulesTimeline(rules)
  return timeline[timeline.length - 1].rules
}

// The rule set in effect for a match, chosen by the match kickoff. Segments are
// ordered; a null `from` is the base (effective from the start). A match uses
// the latest segment whose boundary is at or before its kickoff.
function rulesForKickoff(timeline: RulesTimeline, kickoff: string | undefined): Rules {
  let chosen = timeline[0].rules
  const at = kickoff ? new Date(kickoff).getTime() : Number.NEGATIVE_INFINITY
  for (const segment of timeline) {
    if (segment.from === null || new Date(segment.from).getTime() <= at) chosen = segment.rules
  }
  return chosen
}

function kickoffOf(match: Match, schedule?: Record<string, string>): string | undefined {
  return schedule?.[match.id] || match.date
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
  rules: Rules | RulesTimeline,
  awards: AwardSettings = emptyAwards,
  knockoutQualifierIds?: Set<string>,
  oddsByFixture?: Record<string, Record<string, number>>,
  schedule?: Record<string, string>,
): TeamStanding[] {
  const timeline = toRulesTimeline(rules)
  const latest = timeline[timeline.length - 1].rules
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

    applyMatch(home, away, match, rulesForKickoff(timeline, kickoffOf(match, schedule)), oddsByFixture)
  })

  return groups.flatMap((group) => {
    const groupMatches = matches.filter((match) => match.group === group.code)
    const groupIsComplete = groupMatches.length > 0 && groupMatches.every(matchWasPlayed)
    const ranked = group.teams
      .map((team) => rows.get(team.id))
      .filter((row): row is MutableStanding => Boolean(row))
      .sort(sortTeamStanding)

    const useBracketQualifiers = Boolean(knockoutQualifierIds && knockoutQualifierIds.size > 0)
    ranked.forEach((row, index) => {
      row.rank = index + 1
      const qualified = useBracketQualifiers ? knockoutQualifierIds!.has(row.team.id) : groupIsComplete && index <= 1
      if (qualified) row.fantasyPoints += latest.knockoutQualifiedBonus
      if (groupIsComplete && row.played > 0 && row.losses === row.played) row.fantasyPoints += latest.allLossBonus
      row.fantasyPoints += awardPoints(row.team.id, awards, latest)
      if (
        row.team.id === 'japan' &&
        latest.japanMultiplier !== 1 &&
        (row.fantasyPoints >= 0 || latest.doubleJapanNegative !== false)
      ) {
        row.fantasyPoints *= latest.japanMultiplier
      }
      row.fantasyPoints = roundPoint(row.fantasyPoints)
    })

    return ranked
  })
}

export function groupStandings(allStandings: TeamStanding[], groupCode: string): TeamStanding[] {
  return allStandings.filter((row) => row.team.group === groupCode).sort(sortTeamStanding)
}

// Top 2 of each group plus the 8 best third-placed teams, from a set of standings
// where every group is complete. Used by the projection simulation (the live
// board uses the authoritative ESPN Round of 32 set instead).
export function knockoutQualifiersFromStandings(groups: Group[], teamStandings: TeamStanding[]): Set<string> {
  const ids = new Set<string>()
  const thirds: TeamStanding[] = []
  for (const group of groups) {
    const rows = groupStandings(teamStandings, group.code)
    rows.slice(0, 2).forEach((row) => ids.add(row.team.id))
    if (rows[2]) thirds.push(rows[2])
  }
  thirds
    .sort(sortTeamStanding)
    .slice(0, 8)
    .forEach((row) => ids.add(row.team.id))
  return ids
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

export type TeamPointComponent = { key: string; label: string; count: number; points: number }
export type TeamBreakdown = {
  total: number
  components: TeamPointComponent[]
  standing?: TeamStanding
  tallies: { hatTricks: number; yellowCards: number; redCards: number; ownGoals: number }
}

// Explains how a team's fantasyPoints are made up, category by category. Mirrors
// calculateTeamStandings so the components sum to the same total. Cheap enough to
// call on demand (one team), so it is kept off the projection hot path.
export function calculateTeamBreakdown(
  team: Team,
  groups: Group[],
  matches: Match[],
  rules: Rules | RulesTimeline,
  awards: AwardSettings = emptyAwards,
  knockoutQualifierIds?: Set<string>,
  oddsByFixture?: Record<string, Record<string, number>>,
  schedule?: Record<string, string>,
): TeamBreakdown {
  const timeline = toRulesTimeline(rules)
  const latest = timeline[timeline.length - 1].rules
  const standings = calculateTeamStandings(groups, matches, rules, awards, knockoutQualifierIds, oddsByFixture, schedule)
  const standing = standings.find((row) => row.team.id === team.id)
  const groupMatches = matches.filter((match) => match.group === team.group)
  const groupComplete = groupMatches.length > 0 && groupMatches.every(matchWasPlayed)

  let wins = 0
  let pkWins = 0
  let draws = 0
  let losses = 0
  let margin3 = 0
  let played = 0
  let hatTricks = 0
  let yellowCards = 0
  let yellowQuads = 0
  let redCards = 0
  let ownGoals = 0
  let winPoints = 0
  let hatTrickPoints = 0
  let redCardPoints = 0
  let pkWinPoints = 0
  let drawPoints = 0
  let margin3Points = 0
  let yellowQuadPoints = 0
  let ownGoalPoints = 0

  for (const match of matches) {
    if (!matchWasPlayed(match) || match.result.home === null || match.result.away === null) continue
    const isHome = match.homeTeamId === team.id
    const isAway = match.awayTeamId === team.id
    if (!isHome && !isAway) continue
    const r = rulesForKickoff(timeline, kickoffOf(match, schedule))
    played += 1
    const gf = isHome ? match.result.home : match.result.away
    const ga = isHome ? match.result.away : match.result.home
    const myPk = Boolean(isHome ? match.result.homePenaltyWin : match.result.awayPenaltyWin)
    const oppPk = Boolean(isHome ? match.result.awayPenaltyWin : match.result.homePenaltyWin)
    const matchHatTricks = Math.max(0, (isHome ? match.result.homeHatTricks : match.result.awayHatTricks) || 0)
    const sixGoals = Math.max(0, (isHome ? match.result.homeSixGoals : match.result.awaySixGoals) || 0)
    hatTricks += matchHatTricks
    hatTrickPoints += matchHatTricks * r.hatTrickBonus * (r.doubleHatTrickOnSix !== false && sixGoals > 0 ? 2 : 1)
    const yc = Math.max(0, (isHome ? match.result.homeYellowCards : match.result.awayYellowCards) || 0)
    yellowCards += yc
    const quads = Math.floor(yc / 4)
    yellowQuads += quads
    yellowQuadPoints += quads * r.yellowCardsFourPenalty
    const rc = Math.max(0, (isHome ? match.result.homeRedCards : match.result.awayRedCards) || 0)
    redCards += rc
    redCardPoints += rc * r.redCardPenalty * (r.doubleRedCardOnTwo !== false && rc >= 2 ? 2 : 1)
    const og = Math.max(0, (isHome ? match.result.homeOwnGoals : match.result.awayOwnGoals) || 0)
    ownGoals += og
    ownGoalPoints += og * r.ownGoalPenalty

    const pkWinner = Boolean(myPk && !oppPk)
    if (gf > ga || pkWinner) {
      if (pkWinner && gf <= ga) {
        pkWins += 1
        pkWinPoints += r.penaltyWin
      } else {
        wins += 1
        if (Math.abs(gf - ga) >= 3) {
          margin3 += 1
          margin3Points += r.goalMargin3Bonus
        }
        let wp = r.win
        const winnerOdds = oddsByFixture?.[match.id]?.[team.id]
        if (r.oddsMultiplier === true && winnerOdds && winnerOdds > 0) wp *= winnerOdds
        winPoints += wp
      }
    } else if (ga > gf || (oppPk && !myPk)) {
      losses += 1
    } else {
      draws += 1
      drawPoints += r.draw
    }
  }

  const components: TeamPointComponent[] = []
  const add = (key: string, label: string, count: number, unit: number) => {
    if (count === 0 || unit === 0) return
    components.push({ key, label, count, points: roundPoint(count * unit) })
  }
  const addPoints = (key: string, label: string, count: number, points: number) => {
    if (count === 0 && points === 0) return
    components.push({ key, label, count, points: roundPoint(points) })
  }
  addPoints('win', '勝ち', wins, winPoints)
  addPoints('penaltyWin', 'PK勝ち', pkWins, pkWinPoints)
  addPoints('draw', '引分', draws, drawPoints)
  addPoints('goalMargin3Bonus', '3点差勝ち', margin3, margin3Points)
  addPoints('hatTrickBonus', 'ハットトリック', hatTricks, hatTrickPoints)
  addPoints('yellowCardsFourPenalty', '黄カード4枚', yellowQuads, yellowQuadPoints)
  addPoints('redCardPenalty', 'レッドカード', redCards, redCardPoints)
  addPoints('ownGoalPenalty', 'オウンゴール', ownGoals, ownGoalPoints)
  const qualifiedForKnockout =
    knockoutQualifierIds && knockoutQualifierIds.size > 0
      ? knockoutQualifierIds.has(team.id)
      : groupComplete && !!standing && standing.rank >= 1 && standing.rank <= 2
  if (qualifiedForKnockout) {
    add('knockout', '決勝T進出', 1, latest.knockoutQualifiedBonus)
  }
  if (groupComplete && played > 0 && losses === played) add('allLoss', '全敗', 1, latest.allLossBonus)
  if (awards.championTeamId === team.id) add('champion', '優勝', 1, latest.championBonus)
  if (awards.runnerUpTeamId === team.id) add('runnerUp', '準優勝', 1, latest.runnerUpBonus)
  if (awards.thirdPlaceTeamId === team.id) add('thirdPlace', '3位', 1, latest.thirdPlaceBonus)
  if (awards.mvpTeamId === team.id) add('mvp', 'MVP', 1, latest.mvpBonus)
  if (awards.topScorerTeamId === team.id) add('topScorer', '得点王', 1, latest.topScorerBonus)

  const subtotal = components.reduce((sum, component) => sum + component.points, 0)
  let total = subtotal
  if (team.id === 'japan' && latest.japanMultiplier !== 1 && (subtotal >= 0 || latest.doubleJapanNegative !== false)) {
    const bonus = roundPoint(subtotal * (latest.japanMultiplier - 1))
    components.push({ key: 'japan', label: `日本${latest.japanMultiplier}倍`, count: 1, points: bonus })
    total = roundPoint(subtotal * latest.japanMultiplier)
  }

  return {
    total: roundPoint(total),
    components,
    standing,
    tallies: { hatTricks, yellowCards, redCards, ownGoals },
  }
}

function applyMatch(
  home: MutableStanding,
  away: MutableStanding,
  match: Match,
  rules: Rules,
  oddsByFixture?: Record<string, Record<string, number>>,
) {
  const result = match.result
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
  applyEventPoints(home, result.homeHatTricks, result.homeYellowCards, result.homeRedCards, result.homeOwnGoals, result.homeSixGoals, rules)
  applyEventPoints(away, result.awayHatTricks, result.awayYellowCards, result.awayRedCards, result.awayOwnGoals, result.awaySixGoals, rules)

  const matchOdds = oddsByFixture?.[match.id]
  const homePenaltyWinner = Boolean(result.homePenaltyWin && !result.awayPenaltyWin)
  const awayPenaltyWinner = Boolean(result.awayPenaltyWin && !result.homePenaltyWin)
  if (homeScore > awayScore || homePenaltyWinner) {
    applyWin(home, away, rules, Math.abs(homeScore - awayScore), homePenaltyWinner, matchOdds?.[home.team.id])
  } else if (awayScore > homeScore || awayPenaltyWinner) {
    applyWin(away, home, rules, Math.abs(homeScore - awayScore), awayPenaltyWinner, matchOdds?.[away.team.id])
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

function applyWin(
  winner: MutableStanding,
  loser: MutableStanding,
  rules: Rules,
  margin: number,
  penaltyWin: boolean,
  winnerOdds?: number,
) {
  winner.wins += 1
  loser.losses += 1
  winner.fifaPoints += 3
  if (penaltyWin) {
    winner.fantasyPoints += rules.penaltyWin
    return
  }
  let winPoints = rules.win
  if (rules.oddsMultiplier === true && winnerOdds && winnerOdds > 0) winPoints *= winnerOdds
  winner.fantasyPoints += winPoints
  if (margin >= 3) winner.fantasyPoints += rules.goalMargin3Bonus
}

function applyEventPoints(
  row: MutableStanding,
  hatTricks = 0,
  yellowCards = 0,
  redCards = 0,
  ownGoals = 0,
  sixGoals = 0,
  rules: Rules,
) {
  const ht = Math.max(0, hatTricks)
  const htMultiplier = rules.doubleHatTrickOnSix !== false && sixGoals > 0 ? 2 : 1
  row.fantasyPoints += ht * rules.hatTrickBonus * htMultiplier
  row.fantasyPoints += Math.floor(Math.max(0, yellowCards) / 4) * rules.yellowCardsFourPenalty
  const rc = Math.max(0, redCards)
  const rcMultiplier = rules.doubleRedCardOnTwo !== false && rc >= 2 ? 2 : 1
  row.fantasyPoints += rc * rules.redCardPenalty * rcMultiplier
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
