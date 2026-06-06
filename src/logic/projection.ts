import type { AwardSettings, Group, Match, MatchResult, Member, Rules, Team, TeamSelection } from '../types'
import { calculateMemberStandings, calculateTeamStandings, groupStandings, matchWasPlayed } from './score'

export type MemberProjection = {
  member: Member
  current: number
  average: number
  median: number
  low: number
  high: number
  best: number
  worst: number
  averageRank: number
  medianRank: number
}

export type ProjectionMode = 'standard' | 'historyDemo'

const simulationCount = 900

export function calculateFinalProjections(
  members: Member[],
  selections: TeamSelection[],
  groups: Group[],
  fixtures: Match[],
  rules: Rules,
  awards: AwardSettings,
  mode: ProjectionMode = 'standard',
): MemberProjection[] {
  const currentTeams = calculateTeamStandings(groups, fixtures, rules, awards)
  const currentMembers = calculateMemberStandings(members, selections, currentTeams)
  const currentByMember = new Map(currentMembers.map((row) => [row.member.id, row.total]))
  const sampleByMember = new Map(members.map((member) => [member.id, [] as number[]]))
  const baseSeed = hashSeed(
    JSON.stringify({
      fixtures: fixtures.map((match) => [match.id, match.result]),
      rules,
      awards,
      selections,
    }),
  )

  for (let index = 0; index < simulationCount; index += 1) {
    const rng = createRandom(baseSeed + index * 2654435761)
    const simulatedFixtures = simulateFixtures(groups, fixtures, rng)
    const simulatedAwards = resolveAwards(groups, simulatedFixtures, rules, awards, rng)
    const teamRows = calculateTeamStandings(groups, simulatedFixtures, rules, simulatedAwards)
    const projectedTeamRows =
      mode === 'historyDemo'
        ? teamRows.map((row) => ({
            ...row,
            fantasyPoints: roundPoint(Math.max(0, row.fantasyPoints + historicalDemoAdjustment(row.team, rng))),
          }))
        : teamRows
    const memberRows = calculateMemberStandings(members, selections, projectedTeamRows)
    memberRows.forEach((row) => sampleByMember.get(row.member.id)?.push(row.total))
  }

  const projections = members.map((member) => {
    const samples = sampleByMember.get(member.id) || []
    const sorted = [...samples].sort((a, b) => a - b)
    return {
      member,
      current: currentByMember.get(member.id) || 0,
      average: roundPoint(average(sorted)),
      median: roundPoint(percentile(sorted, 0.5)),
      low: roundPoint(percentile(sorted, 0.1)),
      high: roundPoint(percentile(sorted, 0.9)),
      best: roundPoint(sorted[sorted.length - 1] || 0),
      worst: roundPoint(sorted[0] || 0),
      averageRank: 0,
      medianRank: 0,
    }
  })

  rankBy(projections, 'average', 'averageRank')
  rankBy(projections, 'median', 'medianRank')

  return projections.sort((a, b) => b.average - a.average || b.median - a.median || a.member.name.localeCompare(b.member.name, 'ja'))
}

function simulateFixtures(groups: Group[], fixtures: Match[], rng: () => number): Match[] {
  const currentRows = calculateTeamStandings(groups, fixtures, baselineRules(), emptyAwards())
  const strength = new Map(currentRows.map((row) => [row.team.id, teamStrength(row.team, row.fifaPoints, row.goalDifference)]))

  return fixtures.map((match) => {
    if (matchWasPlayed(match)) return match
    const homeStrength = strength.get(match.homeTeamId) || 50
    const awayStrength = strength.get(match.awayTeamId) || 50
    return {
      ...match,
      result: simulateResult(homeStrength, awayStrength, rng),
    }
  })
}

function simulateResult(homeStrength: number, awayStrength: number, rng: () => number): MatchResult {
  const diff = homeStrength - awayStrength
  const drawProbability = clamp(0.2 - Math.abs(diff) * 0.003, 0.08, 0.24)
  const homeWinProbability = (1 - drawProbability) * sigmoid(diff / 12)
  const roll = rng()

  if (roll < drawProbability) {
    const score = weightedPick(
      [
        [0, 0.28],
        [1, 0.48],
        [2, 0.2],
        [3, 0.04],
      ],
      rng,
    )
    return withEvents({ home: score, away: score }, rng)
  }

  const homeWins = roll < drawProbability + homeWinProbability
  const winnerGoals = weightedPick(
    [
      [1, 0.26],
      [2, 0.43],
      [3, 0.22],
      [4, 0.08],
      [5, 0.01],
    ],
    rng,
  )
  let loserGoals = weightedPick(
    [
      [0, 0.48],
      [1, 0.4],
      [2, 0.12],
    ],
    rng,
  )
  const winnerFinalGoals = Math.max(winnerGoals, loserGoals + 1)
  if (winnerFinalGoals >= 4 && rng() < 0.35) loserGoals = Math.max(0, loserGoals - 1)

  return withEvents(homeWins ? { home: winnerFinalGoals, away: loserGoals } : { home: loserGoals, away: winnerFinalGoals }, rng)
}

function withEvents(result: MatchResult, rng: () => number): MatchResult {
  return {
    ...result,
    homeHatTricks: result.home !== null && result.home >= 3 && rng() < 0.16 ? 1 : 0,
    awayHatTricks: result.away !== null && result.away >= 3 && rng() < 0.16 ? 1 : 0,
    homeYellowCards: yellowCards(rng),
    awayYellowCards: yellowCards(rng),
    homeRedCards: rng() < 0.045 ? 1 : 0,
    awayRedCards: rng() < 0.045 ? 1 : 0,
    homeOwnGoals: rng() < 0.035 ? 1 : 0,
    awayOwnGoals: rng() < 0.035 ? 1 : 0,
  }
}

function resolveAwards(
  groups: Group[],
  fixtures: Match[],
  rules: Rules,
  awards: AwardSettings,
  rng: () => number,
): AwardSettings {
  const rows = calculateTeamStandings(groups, fixtures, rules, emptyAwards())
  const qualifiers = groups
    .flatMap((group) => groupStandings(rows, group.code).slice(0, 2))
    .map((row) => row.team)
  const fallback = groups.flatMap((group) => group.teams)
  const pool = qualifiers.length > 0 ? qualifiers : fallback
  const champion = awards.championTeamId || weightedTeam(pool, rng)
  const runnerUp = awards.runnerUpTeamId || weightedTeam(pool.filter((team) => team.id !== champion), rng)
  const thirdPlace = awards.thirdPlaceTeamId || weightedTeam(pool.filter((team) => team.id !== champion && team.id !== runnerUp), rng)
  const mvp = awards.mvpTeamId || (rng() < 0.7 ? champion : rng() < 0.82 ? runnerUp : weightedTeam(pool, rng))
  const topScorer =
    awards.topScorerTeamId || weightedTeam(pool.filter((team) => team.id === champion || team.id === runnerUp || team.id === thirdPlace || rng() < 0.22), rng)

  return {
    championTeamId: champion,
    runnerUpTeamId: runnerUp,
    thirdPlaceTeamId: thirdPlace,
    mvpTeamId: mvp,
    topScorerTeamId: topScorer,
  }
}

function weightedTeam(teams: Team[], rng: () => number): string {
  const pool = teams.length > 0 ? teams : []
  if (pool.length === 0) return ''
  const weighted = pool.map((team) => [team.id, Math.max(2, 28 - team.seed * 5 + confederationBonus(team.confederation))] as [string, number])
  return weightedPick(weighted, rng)
}

function teamStrength(team: Team, fifaPoints: number, goalDifference: number): number {
  return 72 - team.seed * 7 + confederationBonus(team.confederation) + fifaPoints * 3.5 + goalDifference * 1.2
}

function confederationBonus(confederation: string): number {
  if (confederation === 'UEFA') return 4
  if (confederation === 'CONMEBOL') return 4
  if (confederation === 'CAF') return 1
  if (confederation === 'AFC') return 0
  if (confederation === 'Concacaf') return 0
  return -1
}

function yellowCards(rng: () => number): number {
  return weightedPick(
    [
      [0, 0.1],
      [1, 0.3],
      [2, 0.35],
      [3, 0.17],
      [4, 0.07],
      [5, 0.01],
    ],
    rng,
  )
}

function historicalDemoAdjustment(team: Team, rng: () => number): number {
  const seedCenter = team.seed === 1 ? 8 : team.seed === 2 ? 3 : team.seed === 3 ? -1 : -3
  const confederationCenter = confederationBonus(team.confederation) * 0.8
  const spread = team.seed === 1 ? 16 : team.seed === 2 ? 18 : team.seed === 3 ? 17 : 15
  const normalish = rng() + rng() + rng() + rng() - 2
  const breakout = rng() < breakoutChance(team) ? 8 + rng() * 12 : 0
  const collapse = rng() < collapseChance(team) ? 7 + rng() * 10 : 0
  return seedCenter + confederationCenter + normalish * spread + breakout - collapse
}

function breakoutChance(team: Team): number {
  if (team.seed === 1) return 0.08
  if (team.seed === 2) return 0.12
  if (team.seed === 3) return 0.14
  return 0.1
}

function collapseChance(team: Team): number {
  if (team.seed === 1) return 0.06
  if (team.seed === 2) return 0.08
  if (team.seed === 3) return 0.1
  return 0.12
}

function weightedPick<T>(items: Array<[T, number]>, rng: () => number): T {
  const total = items.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = rng() * total
  for (const [value, weight] of items) {
    roll -= weight
    if (roll <= 0) return value
  }
  return items[items.length - 1][0]
}

function rankBy(rows: MemberProjection[], valueKey: 'average' | 'median', rankKey: 'averageRank' | 'medianRank') {
  ;[...rows]
    .sort((a, b) => b[valueKey] - a[valueKey] || a.member.name.localeCompare(b.member.name, 'ja'))
    .forEach((row, index) => {
      row[rankKey] = index + 1
    })
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function percentile(values: number[], rate: number): number {
  if (values.length === 0) return 0
  const index = (values.length - 1) * rate
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return values[lower]
  return values[lower] + (values[upper] - values[lower]) * (index - lower)
}

function hashSeed(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundPoint(value: number): number {
  return Math.round(value * 10) / 10
}

function emptyAwards(): AwardSettings {
  return {
    championTeamId: '',
    runnerUpTeamId: '',
    thirdPlaceTeamId: '',
    mvpTeamId: '',
    topScorerTeamId: '',
  }
}

function baselineRules(): Rules {
  return {
    win: 0,
    penaltyWin: 0,
    draw: 0,
    goalMargin3Bonus: 0,
    hatTrickBonus: 0,
    knockoutQualifiedBonus: 0,
    thirdPlaceBonus: 0,
    runnerUpBonus: 0,
    championBonus: 0,
    allLossBonus: 0,
    mvpBonus: 0,
    topScorerBonus: 0,
    yellowCardsFourPenalty: 0,
    redCardPenalty: 0,
    ownGoalPenalty: 0,
    japanMultiplier: 1,
  }
}
