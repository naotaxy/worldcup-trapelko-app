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
export type KnockoutMatchEvents = {
  homeYellowCards: number
  awayYellowCards: number
  homeRedCards: number
  awayRedCards: number
  homeOwnGoals: number
  awayOwnGoals: number
  homeHatTricks: number
  awayHatTricks: number
  homeSixGoals: number
  awaySixGoals: number
}
export type BracketMatch = {
  id: string
  date: string
  status: string
  home: BracketTeam
  away: BracketTeam
  events?: KnockoutMatchEvents
}
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
          const res = await fetch(`${ESPN}/scoreboard?dates=${dt}`, { signal: AbortSignal.timeout(8000) })
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

    // 終了した決勝T試合はイベント詳細(黄/赤/OG/HT)をESPN summaryから取得して付与し、
    // 予選と同じく1試合ごとに反映する。シュートアウトのPK(period>=5)はゴール集計から除外。
    const finishedKnockout = (bracket ?? [])
      .flatMap((round) => round.matches)
      .filter((match) => match.status === 'post' && match.home.teamId && match.away.teamId)
    const eventFetches = finishedKnockout.map(async (match) => {
      try {
        const res = await fetch(`${ESPN}/summary?event=${match.id}`, { signal: AbortSignal.timeout(8000) })
        if (!res.ok) return
        const summary = await res.json()
        const events = parseKnockoutEvents(summary, match.home.teamId as string, match.away.teamId as string)
        if (events) match.events = events
      } catch {
        // ignore a single summary failure/timeout
      }
    })
    // ブラウザで summary が1件でもハングするとブラケット全体が読めず、順位が初期の
    // 不完全値のまま止まる。個別タイムアウト＋全体上限(12秒)で必ず前に進める。
    await Promise.race([Promise.all(eventFetches), new Promise((resolve) => setTimeout(resolve, 12000))])

    cache = { bracket, schedule, odds }
    return cache
  } catch {
    return empty
  }
}

type EspnSummaryEvent = {
  type?: { text?: string }
  team?: { id?: string | number }
  participants?: { athlete?: { id?: string | number } }[]
  period?: { number?: number }
}
type EspnSummaryCompetitor = { homeAway?: string; team?: { id?: string | number; abbreviation?: string } }
type EspnSummary = {
  header?: {
    competitions?: {
      status?: { type?: { completed?: boolean } }
      competitors?: EspnSummaryCompetitor[]
    }[]
  }
  keyEvents?: EspnSummaryEvent[]
}

// ESPN summary から決勝T1試合のイベント(黄/赤/OG/HT/6ゴール)を home/away 別に集計する。
// サーバー parseEspnSummary(予選)と同仕様＋シュートアウト(period>=5)のゴールは除外。
// OGは加点上「失点側(相手)」に計上(ESPNは受益側にゴールを付けるため)。
function parseKnockoutEvents(summary: unknown, homeTeamId: string, awayTeamId: string): KnockoutMatchEvents | null {
  const s = summary as EspnSummary
  const comp = s?.header?.competitions?.[0]
  if (!comp?.status?.type?.completed) return null
  const competitors = comp.competitors || []
  const sideByEspnId = new Map<string, 'home' | 'away'>()
  for (const c of competitors) {
    const ourId = teamByAbbr.get(c?.team?.abbreviation || '')?.id
    if (ourId === homeTeamId) sideByEspnId.set(String(c?.team?.id), 'home')
    else if (ourId === awayTeamId) sideByEspnId.set(String(c?.team?.id), 'away')
  }
  const tally = {
    home: { goals: new Map<string, number>(), yellow: 0, red: 0, own: 0 },
    away: { goals: new Map<string, number>(), yellow: 0, red: 0, own: 0 },
  }
  for (const ev of s?.keyEvents || []) {
    const text = ev?.type?.text || ''
    const side = sideByEspnId.get(String(ev?.team?.id))
    if (!side) continue
    if (/own goal/i.test(text)) {
      const conceding = side === 'home' ? 'away' : 'home'
      tally[conceding].own += 1
      continue
    }
    const period = ev?.period?.number ?? 0
    if ((/goal/i.test(text) || /penalty - scored/i.test(text)) && !/disallow|no goal|cancell?ed|var/i.test(text) && period < 5) {
      const scorer = String(ev?.participants?.[0]?.athlete?.id ?? `anon-${Math.random()}`)
      tally[side].goals.set(scorer, (tally[side].goals.get(scorer) || 0) + 1)
      continue
    }
    if (/red card/i.test(text)) {
      tally[side].red += 1
      continue
    }
    if (/yellow card/i.test(text)) {
      tally[side].yellow += 1
    }
  }
  const ht = (g: Map<string, number>) => [...g.values()].filter((n) => n >= 3).length
  const six = (g: Map<string, number>) => [...g.values()].filter((n) => n >= 6).length
  return {
    homeYellowCards: tally.home.yellow,
    awayYellowCards: tally.away.yellow,
    homeRedCards: tally.home.red,
    awayRedCards: tally.away.red,
    homeOwnGoals: tally.home.own,
    awayOwnGoals: tally.away.own,
    homeHatTricks: ht(tally.home.goals),
    awayHatTricks: ht(tally.away.goals),
    homeSixGoals: six(tally.home.goals),
    awaySixGoals: six(tally.away.goals),
  }
}

// 決勝Tの「終了した試合」のスコア＋イベント。予選と同じく1試合ごとに加点するための入力。
// PKは同点かつ勝者(winner/PKスコア)で判定。イベントは match.events(summary由来)から。
export type KnockoutScore = {
  homeTeamId: string
  awayTeamId: string
  kickoff: string
  homeScore: number
  awayScore: number
  homePenaltyWin: boolean
  awayPenaltyWin: boolean
  homeYellowCards: number
  awayYellowCards: number
  homeRedCards: number
  awayRedCards: number
  homeOwnGoals: number
  awayOwnGoals: number
  homeHatTricks: number
  awayHatTricks: number
  homeSixGoals: number
  awaySixGoals: number
}

// 決勝Tでイベントパーサ(ESPN summary)が取りこぼした事象の手動補正。出典は複数ソースで確認し
// collab-logに記録。キーは `${homeTeamId}__${awayTeamId}`(決勝Tでは同一カードは一度のみ)。
// 2026決勝 spain 1-0 argentina: パレデスが試合終了後の乱闘で一発退場→アルゼンチンは赤2枚
// (エンソ2枚目退場+パレデス)。ESPN summaryは試合後カードを含まず赤1のまま→赤2に補正し
// 「1試合で赤2枚→ペナルティ2倍」ルールを正しく発火させる。
const knockoutManualCorrections: Record<string, Partial<KnockoutScore>> = {
  spain__argentina: { awayRedCards: 2 },
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
      const e = match.events
      const score: KnockoutScore = {
        homeTeamId: home.teamId,
        awayTeamId: away.teamId,
        kickoff: match.date,
        homeScore: home.score,
        awayScore: away.score,
        homePenaltyWin,
        awayPenaltyWin,
        homeYellowCards: e?.homeYellowCards ?? 0,
        awayYellowCards: e?.awayYellowCards ?? 0,
        homeRedCards: e?.homeRedCards ?? 0,
        awayRedCards: e?.awayRedCards ?? 0,
        homeOwnGoals: e?.homeOwnGoals ?? 0,
        awayOwnGoals: e?.awayOwnGoals ?? 0,
        homeHatTricks: e?.homeHatTricks ?? 0,
        awayHatTricks: e?.awayHatTricks ?? 0,
        // 「6得点でハット2倍」用のフラグは、選手別イベント集計(取りこぼしうる)ではなく
        // 権威的な最終スコアから算出する。決勝Tでイベントが不完全でも6得点判定が正しく効く。
        homeSixGoals: home.score >= 6 ? 1 : e?.homeSixGoals ?? 0,
        awaySixGoals: away.score >= 6 ? 1 : e?.awaySixGoals ?? 0,
      }
      const correction = knockoutManualCorrections[`${home.teamId}__${away.teamId}`]
      out.push(correction ? { ...score, ...correction } : score)
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
