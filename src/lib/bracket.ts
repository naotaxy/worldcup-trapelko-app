// Knockout bracket, fetched directly from ESPN's free (CORS-enabled) API. ESPN
// already publishes the full 2026 bracket with placeholder slots (e.g. "Group A
// 2nd Place", "Round of 32 1 Winner") and fills in real teams + scores as the
// tournament progresses. Works on both the Render and static (Pages) builds.
import { flagUrl } from '../logic/score'
import { fixtures, teamNamesJa, teams } from '../data/worldCup2026'

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

export type BracketTeam = { name: string; flag: string | null; score: number | null; winner: boolean }
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
  team?: { abbreviation?: string; displayName?: string }
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
  }
}

// schedule: our group fixtureId -> real kickoff ISO (for JST display).
export type Tournament = { bracket: BracketRound[] | null; schedule: Record<string, string> }
const fixturePairKey = (a: string, b: string) => [a, b].sort().join('|')
const fixtureByPair = new Map(fixtures.map((f) => [fixturePairKey(f.homeTeamId, f.awayTeamId), f.id]))

let cache: Tournament | null = null

// One pass over the whole tournament (group + knockout) from ESPN. Builds the
// knockout bracket AND the real kickoff time for each of our group fixtures.
export async function fetchTournament(): Promise<Tournament> {
  if (cache) return cache
  const empty: Tournament = { bracket: null, schedule: {} }
  try {
    const dates: string[] = []
    for (let d = Date.UTC(2026, 5, 11); d <= Date.UTC(2026, 6, 19); d += 86400000) {
      const x = new Date(d)
      dates.push(`${x.getUTCFullYear()}${String(x.getUTCMonth() + 1).padStart(2, '0')}${String(x.getUTCDate()).padStart(2, '0')}`)
    }

    const byRound = new Map<string, BracketMatch[]>()
    const schedule: Record<string, string> = {}
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
            }

            // Knockout round? Add to the bracket.
            const slug = ev?.season?.slug
            if (ROUND_ORDER.includes(slug)) {
              const list = byRound.get(slug) || []
              list.push({
                id: String(ev.id),
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
    cache = { bracket, schedule }
    return cache
  } catch {
    return empty
  }
}
