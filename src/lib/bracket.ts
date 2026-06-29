// Knockout bracket, fetched directly from ESPN's free (CORS-enabled) API. ESPN
// already publishes the full 2026 bracket with placeholder slots (e.g. "Group A
// 2nd Place", "Round of 32 1 Winner") and fills in real teams + scores as the
// tournament progresses. Works on both the Render and static (Pages) builds.
// Explicit .ts extensions so this module is importable both by Vite (frontend)
// and by the Node runtime type-stripping the server uses (extensionless value
// imports do not resolve to .ts at runtime).
import { flagUrl } from '../logic/score.ts'
import { fixtures, teamNamesJa, teams } from '../data/worldCup2026.ts'

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'
const ROUND_ORDER = ['round-of-32', 'round-of-16', 'quarterfinals', 'semifinals', '3rd-place-match', 'final']
const ROUND_JA: Record<string, string> = {
  'round-of-32': 'ラウンド32',
  'round-of-16': 'ラウンド16',
  quarterfinals: '準々決勝',
  semifinals: '準決勝',
  '3rd-place-match': '3位決定戦',
  final: '決勝',
}

export type BracketTeam = { name: string; flag: string | null; score: number | null; winner: boolean; teamId: string | null; pk: number | null }
export type BracketMatch = { id: string; date: string; status: string; home: BracketTeam; away: BracketTeam }
export type BracketRound = { slug: string; label: string; matches: BracketMatch[] }

const teamByAbbr = new Map(teams.map((t) => [t.shortName, t]))

function translatePlaceholder(name: string): string {
  let m: RegExpMatchArray | null
  if ((m = name.match(/^Group ([A-L]) Winner$/))) return `${m[1]}組1位`
  if ((m = name.match(/^Group ([A-L]) 2nd Place$/))) return `${m[1]}組2位`
  if ((m = name.match(/^Third Place Group ([A-L/]+)$/))) return `3位(${m[1]})`
  if ((m = name.match(/^Round of 32 (\d+) Winner$/))) return `R32-${m[1]}勝者`
  if ((m = name.match(/^Round of 16 (\d+) Winner$/))) return `R16-${m[1]}勝者`
  if ((m = name.match(/^Quarterfinal (\d+) Winner$/))) return `準々決勝${m[1]}勝者`
  if ((m = name.match(/^Semifinal (\d+) Winner$/))) return `準決勝${m[1]}勝者`
  return name
}

type EspnCompetitor = {
  homeAway?: string
  winner?: boolean
  score?: string | number
  shootoutScore?: number
  team?: { abbreviation?: string; displayName?: string }
}

type EspnMoneylineLeg = {
  close?: { odds?: string | number | null }
  open?: { odds?: string | number | null }
}

type EspnMoneyline = {
  home?: EspnMoneylineLeg
  away?: EspnMoneylineLeg
  draw?: EspnMoneylineLeg
}

function toTeam(competitor: EspnCompetitor | undefined): BracketTeam {
  const abbr = competitor?.team?.abbreviation || ''
  const real = teamByAbbr.get(abbr)
  const rawScore = competitor?.score
  return {
    name: real ? teamNamesJa[real.id] || real.name : translatePlaceholder(competitor?.team?.displayName || abbr || 'TBD'),
    flag: real ? flagUrl(real.flag) : null,
    score: rawScore !== undefined && rawScore !== null && rawScore !== '' ? Number(rawScore) : null,
    winner: Boolean(competitor?.winner),
    teamId: real?.id ?? null,
    pk: typeof competitor?.shootoutScore === 'number' ? competitor.shootoutScore : null,
  }
}

// schedule: our group fixtureId -> real kickoff ISO (for JST display).
// odds: fixtureId -> { [teamId]: decimalOdds, draw: decimalOdds } (moneyline).
export type Tournament = {
  bracket: BracketRound[] | null
  schedule: Record<string, string>
  odds: Record<string, Record<string, number>>
}

// American odds -> decimal odds (倍率). e.g. -125 -> 1.80, +350 -> 4.50.
function toDecimalOdds(raw: string | number | undefined | null): number | null {
  if (raw === undefined || raw === null || raw === '') return null
  const a = Number(raw)
  if (!a || Number.isNaN(a)) return null
  const dec = a > 0 ? a / 100 + 1 : 100 / Math.abs(a) + 1
  return Math.round(dec * 100) / 100
}

function oddsEntryFromMoneyline(
  moneyline: EspnMoneyline | undefined | null,
  homeTeamId: string,
  awayTeamId: string,
): Record<string, number> | null {
  if (!moneyline) return null
  const homeDec = toDecimalOdds(moneyline.home?.close?.odds ?? moneyline.home?.open?.odds)
  const awayDec = toDecimalOdds(moneyline.away?.close?.odds ?? moneyline.away?.open?.odds)
  const drawDec = toDecimalOdds(moneyline.draw?.close?.odds ?? moneyline.draw?.open?.odds)
  const entry: Record<string, number> = {}
  if (homeDec != null) entry[homeTeamId] = homeDec
  if (awayDec != null) entry[awayTeamId] = awayDec
  if (drawDec != null) entry.draw = drawDec
  return Object.keys(entry).length > 0 ? entry : null
}

const fixturePairKey = (a: string, b: string) => [a, b].sort().join('|')
const fixtureByPair = new Map(fixtures.map((f) => [fixturePairKey(f.homeTeamId, f.awayTeamId), f.id]))

let cache: Tournament | null = null

// One pass over the whole tournament (group + knockout) from ESPN. Builds the
// knockout bracket AND the real kickoff time for each of our group fixtures.
export async function fetchTournament(force = false): Promise<Tournament> {
  if (cache && !force) return cache
  const empty: Tournament = { bracket: null, schedule: {}, odds: {} }
  try {
    const dates: string[] = []
    for (let d = Date.UTC(2026, 5, 11); d <= Date.UTC(2026, 6, 19); d += 86400000) {
      const x = new Date(d)
      dates.push(`${x.getUTCFullYear()}${String(x.getUTCMonth() + 1).padStart(2, '0')}${String(x.getUTCDate()).padStart(2, '0')}`)
    }

    const byRound = new Map<string, BracketMatch[]>()
    const schedule: Record<string, string> = {}
    const odds: Record<string, Record<string, number>> = {}
    await Promise.all(
      dates.map(async (dt) => {
        try {
          const res = await fetch(`${ESPN}/scoreboard?dates=${dt}`)
          if (!res.ok) return
          const data = await res.json()
          for (const ev of data.events || []) {
            const comp = ev.competitions?.[0]
            const home = comp?.competitors?.find((c: EspnCompetitor) => c.homeAway === 'home')
            const away = comp?.competitors?.find((c: EspnCompetitor) => c.homeAway === 'away')
            if (!home || !away) continue

            // Group fixture? Map its real kickoff to our fixture id.
            const ah = teamByAbbr.get(home.team?.abbreviation || '')
            const aa = teamByAbbr.get(away.team?.abbreviation || '')
            if (ah && aa) {
              const fid = fixtureByPair.get(fixturePairKey(ah.id, aa.id))
              if (fid && ev.date) schedule[fid] = ev.date
              const ml = comp?.odds?.[0]?.moneyline
              const groupOdds = oddsEntryFromMoneyline(ml, ah.id, aa.id)
              if (fid && groupOdds) odds[fid] = groupOdds
            }

            // Knockout round? Add to the bracket.
            const slug = ev?.season?.slug
            if (ROUND_ORDER.includes(slug)) {
              const matchId = String(ev.id)
              const ml = comp?.odds?.[0]?.moneyline
              const knockoutOdds = ah && aa ? oddsEntryFromMoneyline(ml, ah.id, aa.id) : null
              if (knockoutOdds) odds[matchId] = knockoutOdds
              const list = byRound.get(slug) || []
              list.push({
                id: matchId,
                date: ev.date,
                status: comp?.status?.type?.state || 'pre',
                home: toTeam(home),
                away: toTeam(away),
              })
              byRound.set(slug, list)
            }
          }
        } catch {
          // ignore a single date failure
        }
      }),
    )

    const bracket =
      byRound.size === 0
        ? null
        : ROUND_ORDER.filter((s) => byRound.has(s)).map((s) => ({
            slug: s,
            label: ROUND_JA[s],
            matches: (byRound.get(s) || []).sort((a, b) => a.date.localeCompare(b.date)),
          }))
    cache = { bracket, schedule, odds }
    return cache
  } catch {
    return empty
  }
}

// 決勝Tの「終了した試合」のスコア。予選と同じく1試合ごとに加点するための入力。
// イベント(HT/カード/OG)は含まない(スコア=勝/PK/3点差のみ)。PKは同点かつ勝者ありで判定。
export type KnockoutScore = {
  homeTeamId: string
  awayTeamId: string
  kickoff: string
  homeScore: number
  awayScore: number
  homePenaltyWin: boolean
  awayPenaltyWin: boolean
}

export function knockoutScores(bracket: BracketRound[] | null): KnockoutScore[] {
  const out: KnockoutScore[] = []
  for (const round of bracket ?? []) {
    for (const match of round.matches) {
      if (match.status !== 'post') continue
      const { home, away } = match
      if (!home.teamId || !away.teamId || home.score == null || away.score == null) continue
      // 同点で終了=PK決着。勝者は winner フラグ優先、無ければPKスコアで判定。
      const draw = home.score === away.score
      let homePenaltyWin = false
      let awayPenaltyWin = false
      if (draw) {
        if (home.winner) homePenaltyWin = true
        else if (away.winner) awayPenaltyWin = true
        else if (home.pk != null && away.pk != null && home.pk !== away.pk) {
          if (home.pk > away.pk) homePenaltyWin = true
          else awayPenaltyWin = true
        }
      }
      out.push({
        homeTeamId: home.teamId,
        awayTeamId: away.teamId,
        kickoff: match.date,
        homeScore: home.score,
        awayScore: away.score,
        homePenaltyWin,
        awayPenaltyWin,
      })
    }
  }
  return out
}

// Team ids actually in the knockout stage (Round of 32). ESPN seeds the R32 with
// the real qualifiers (each group's top 2 plus the 8 best third-placed teams),
// so this is the authoritative "advanced to the knockout" set as it fills in.
export function knockoutTeamIds(bracket: BracketRound[] | null): Set<string> {
  const ids = new Set<string>()
  const r32 = bracket?.find((round) => round.slug === 'round-of-32')
  if (!r32) return ids
  for (const match of r32.matches) {
    if (match.home.teamId) ids.add(match.home.teamId)
    if (match.away.teamId) ids.add(match.away.teamId)
  }
  return ids
}
