import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MutableRefObject, ReactNode } from 'react'
import {
  BadgeCheck,
  Bell,
  Coffee,
  Gauge,
  HelpCircle,
  Lock,
  Medal,
  Network,
  RotateCcw,
  Save,
  Settings,
  Shuffle,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import './App.css'
import { BoardView } from './components/BoardView'
import { CountrySlot, type SlotCountry } from './components/CountrySlot'
import { GoogleMatchCard } from './components/GoogleMatchCard'
import { RoomsPanel } from './components/RoomsPanel'
import { RulesEditor } from './components/RulesEditor'
import { SettingsBar } from './components/SettingsBar'
import { useT } from './lib/i18n'
import {
  defaultRules,
  demoMembers as seedMembers,
  demoSelections,
  fixtures,
  groups,
  previewResults,
  teamNamesJa,
  teams,
} from './data/worldCup2026'
import {
  calculateTeamStandings,
  flagUrl,
  type RulesTimeline,
} from './logic/score'
import { type ProjectionMode } from './logic/projection'
import type { AwardSettings, GroupCode, Match, MatchResult, Member, Rules, Team, TeamSelection } from './types'
import {
  fetchAnalyticsSummary,
  fetchSharedState,
  pushResult,
  pushRules,
  recordVisit,
  unlockBoard,
  type AnalyticsSummary,
  type PlayerStat,
} from './lib/api'
import { fetchTournament, knockoutTeamIds, type BracketRound } from './lib/bracket'
import { loadLocalState, saveLocalState } from './lib/persistence'
import { buildRulesTimeline, currentRulesOf, neutralPublicRules, normalizeTimeline, type RulesUpdateMode } from './lib/publicRules'

const maxTeamsPerMember = 8
const maxOwnersPerTeam = 2

const defaultAwards: AwardSettings = {
  championTeamId: '',
  runnerUpTeamId: '',
  thirdPlaceTeamId: '',
  mvpTeamId: '',
  topScorerTeamId: '',
}

// Read this device's saved board once, used as lazy initial state below.
let cachedLocalState: ReturnType<typeof loadLocalState> | undefined
function initialLocalState() {
  if (cachedLocalState === undefined) cachedLocalState = loadLocalState()
  return cachedLocalState
}

function App() {
  const slotTimerRef = useRef<number | null>(null)
  // Insider board gate. The bundle ships placeholder member names; real names are
  // fetched from Supabase only after the passphrase is entered. `demoMembers`
  // below overlays the real names so the rest of the component is unchanged.
  const [boardUnlocked, setBoardUnlocked] = useState(false)
  const [boardError, setBoardError] = useState('')
  const [boardBusy, setBoardBusy] = useState(false)
  const [memberOverlay, setMemberOverlay] = useState<Record<string, { name: string; avatar: string }>>({})
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null)
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false)
  const demoMembers = useMemo(
    () => seedMembers.map((m) => (memberOverlay[m.id] ? { ...m, ...memberOverlay[m.id] } : m)),
    [memberOverlay],
  )
  const applyBoardKey = useCallback(async (passphrase: string): Promise<boolean> => {
    if (!passphrase) return false
    setBoardBusy(true)
    setBoardError('')
    const res = await unlockBoard(passphrase)
    setBoardBusy(false)
    if (res?.ok && Array.isArray(res.members)) {
      const overlay: Record<string, { name: string; avatar: string }> = {}
      for (const m of res.members) overlay[m.id] = { name: m.name, avatar: m.avatar || m.name.slice(0, 1) }
      setMemberOverlay(overlay)
      setBoardUnlocked(true)
      try {
        localStorage.setItem('wc-board-key', passphrase)
      } catch {
        // ignore storage failures
      }
      return true
    }
    setBoardError('合言葉が違います')
    return false
  }, [])
  // Re-unlock silently on load if this device already holds the passphrase.
  useEffect(() => {
    let cancelled = false
    let stored = ''
    try {
      stored = localStorage.getItem('wc-board-key') || ''
    } catch {
      stored = ''
    }
    if (!stored) return
    void (async () => {
      const res = await unlockBoard(stored)
      if (cancelled) return
      if (res?.ok && Array.isArray(res.members)) {
        const overlay: Record<string, { name: string; avatar: string }> = {}
        for (const m of res.members) overlay[m.id] = { name: m.name, avatar: m.avatar || m.name.slice(0, 1) }
        setMemberOverlay(overlay)
        setBoardUnlocked(true)
      } else {
        try {
          localStorage.removeItem('wc-board-key')
        } catch {
          // ignore
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])
  useEffect(() => {
    void (async () => {
      let visitorId = ''
      try {
        if (localStorage.getItem('wc-board-key')) return // 身内(合言葉解錠済みの端末)はカウントしない
        const recorded = sessionStorage.getItem('wc-visit-recorded') === '1'
        visitorId = localStorage.getItem('wc-visitor-id') || ''
        if (!visitorId) {
          visitorId = crypto.randomUUID()
          localStorage.setItem('wc-visitor-id', visitorId)
        }
        if (recorded) return
        sessionStorage.setItem('wc-visit-recorded', '1')
      } catch {
        visitorId = visitorId || crypto.randomUUID()
      }
      await recordVisit(visitorId)
    })()
  }, [])
  useEffect(() => {
    if (!boardUnlocked) return
    let cancelled = false
    void (async () => {
      let key: string
      try {
        key = localStorage.getItem('wc-board-key') ?? ''
      } catch {
        key = ''
      }
      const summary = await fetchAnalyticsSummary(key)
      if (cancelled) return
      setAnalyticsSummary(summary)
      setAnalyticsLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [boardUnlocked])
  const [activeGroup, setActiveGroup] = useState<GroupCode>('F')
  const [rules, setRules] = useState<Rules>(() => initialLocalState()?.rules ?? defaultRules)
  const [rulesTimeline, setRulesTimeline] = useState<RulesTimeline>(() =>
    normalizeTimeline(initialLocalState()?.rulesTimeline, initialLocalState()?.rules ?? defaultRules),
  )
  const t = useT()
  const [awards, setAwards] = useState<AwardSettings>(() => initialLocalState()?.awards ?? defaultAwards)
  const [projectionMode, setProjectionMode] = useState<ProjectionMode>('standard')
  const [liveFixtures, setLiveFixtures] = useState<Match[]>(() => {
    const saved = initialLocalState()?.results
    return saved ? applyResultMap(fixtures, saved) : fixtures
  })
  const [selectedMatchId, setSelectedMatchId] = useState('F-1')
  const [saveLabel, setSaveLabel] = useState('保存待ち')
  const [draftSelections, setDraftSelections] = useState<TeamSelection[]>(() => initialLocalState()?.selections ?? demoSelections)
  const [draftMemberId, setDraftMemberId] = useState(demoMembers[0].id)
  const [manualMemberId, setManualMemberId] = useState(demoMembers[0].id)
  const [manualTeamId, setManualTeamId] = useState(teams[0].id)
  const [manualMessage, setManualMessage] = useState('選挙で決まった組み合わせを手動で登録できます')
  const [conflictTeamId, setConflictTeamId] = useState(teams[0].id)
  const [conflictMemberIds, setConflictMemberIds] = useState<string[]>(demoMembers.slice(0, 3).map((member) => member.id))
  const [conflictResultMemberIds, setConflictResultMemberIds] = useState<string[]>([])
  const [conflictMessage, setConflictMessage] = useState('3人以上が同じ国を希望した時だけ回してください')
  const [slotResultId, setSlotResultId] = useState<string | null>(null)
  const [slotPendingResultId, setSlotPendingResultId] = useState<string | null>(null)
  const [slotSpinKey, setSlotSpinKey] = useState(0)
  const [slotPhase, setSlotPhase] = useState<'idle' | 'spinning' | 'ready'>('idle')
  const [slotMessage, setSlotMessage] = useState('参加者を選んでスロットを回してください')
  const [resultSaveLabel, setResultSaveLabel] = useState('結果を保存')
  const [playerStats, setPlayerStats] = useState<Record<string, PlayerStat>>({})
  const [schedule, setSchedule] = useState<Record<string, string>>({})
  const [odds, setOdds] = useState<Record<string, Record<string, number>>>({})
  const [qualifierIds, setQualifierIds] = useState<Set<string>>(() => new Set())
  const [bracket, setBracket] = useState<BracketRound[] | null>(null)
  const [bracketLoaded, setBracketLoaded] = useState(false)

  useEffect(() => {
    return () => clearSlotTimer(slotTimerRef)
  }, [])

  // Real kickoff times (JST) for every fixture, from ESPN (free, CORS).
  useEffect(() => {
    let cancelled = false
    fetchTournament().then((t) => {
      if (cancelled) return
      if (t.schedule) setSchedule(t.schedule)
      if (t.odds) setOdds(t.odds)
      setQualifierIds(knockoutTeamIds(t.bracket))
      setBracket(t.bracket)
      setBracketLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Device-local state is loaded via the lazy initializers above. Here we pull
  // the shared backend state when Supabase is configured (Render), otherwise
  // these calls resolve to null and the seed/local state stays in place.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const shared = await fetchSharedState()
      if (cancelled) return
      if (shared) {
        if (shared.rules || shared.rulesTimeline) {
          const tl = normalizeTimeline(shared.rulesTimeline, shared.rules ?? defaultRules)
          setRulesTimeline(tl)
          setRules(currentRulesOf(tl))
        }
        if (shared.awards) setAwards(shared.awards)
        if (shared.selections && shared.selections.length > 0) setDraftSelections(shared.selections)
        if (shared.results) setLiveFixtures((current) => applyResultMap(current, shared.results!))
        if (shared.playerStats) setPlayerStats(shared.playerStats)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Keep the open page live: refresh shared results + player stats every ~2.5min
  // (our own server, cheap). Editable state (rules/awards/draft) is left alone.
  useEffect(() => {
    const id = window.setInterval(() => {
      void (async () => {
        const shared = await fetchSharedState()
        if (!shared) return
        if (shared.results) setLiveFixtures((current) => applyResultMap(current, shared.results!))
        if (shared.playerStats) setPlayerStats(shared.playerStats)
      })()
    }, 150000)
    return () => window.clearInterval(id)
  }, [])

  // Refresh the ESPN tournament (schedule/odds/qualifiers/bracket) every ~6min so
  // the bracket fills and the group->knockout switch happens without a reload.
  useEffect(() => {
    const id = window.setInterval(() => {
      void (async () => {
        const t = await fetchTournament(true)
        if (Object.keys(t.schedule).length > 0) setSchedule(t.schedule)
        if (Object.keys(t.odds).length > 0) setOdds(t.odds)
        if (t.bracket) {
          setBracket(t.bracket)
          setQualifierIds(knockoutTeamIds(t.bracket))
        }
      })()
    }, 360000)
    return () => window.clearInterval(id)
  }, [])

  // Mirror mutable board state to this device so reloads keep edits even with
  // no backend.
  useEffect(() => {
    saveLocalState({ rules, rulesTimeline, awards, selections: draftSelections, results: extractResultMap(liveFixtures) })
  }, [rules, rulesTimeline, awards, draftSelections, liveFixtures])

  const teamStandings = useMemo(
    () => calculateTeamStandings(groups, liveFixtures, rulesTimeline, awards, qualifierIds, odds, schedule),
    [awards, liveFixtures, rulesTimeline, qualifierIds, odds, schedule],
  )
  const oddsProbs = useMemo(() => {
    const out: Record<string, { home: number; draw: number; away: number }> = {}
    for (const fixture of fixtures) {
      const o = odds[fixture.id]
      const h = o?.[fixture.homeTeamId]
      const a = o?.[fixture.awayTeamId]
      const d = o?.draw
      if (!h || !a || !d) continue
      const ph = 1 / h
      const pa = 1 / a
      const pd = 1 / d
      const sum = ph + pa + pd
      out[fixture.id] = { home: ph / sum, draw: pd / sum, away: pa / sum }
    }
    return out
  }, [odds])
  const activeMatches = useMemo(() => liveFixtures.filter((match) => match.group === activeGroup), [liveFixtures, activeGroup])
  const selectedMatch = useMemo<Match>(
    () => liveFixtures.find((match) => match.id === selectedMatchId) || activeMatches[0] || liveFixtures[0] || (fixtures[0] as Match),
    [activeMatches, liveFixtures, selectedMatchId],
  )

  const teamOwnersByTeam = useMemo(() => {
    const owners = new Map<string, string>()
    const ownerGroups = new Map<string, string[]>()
    draftSelections.forEach((selection) => {
      const owner = demoMembers.find((member) => member.id === selection.memberId)
      if (!owner) return
      ownerGroups.set(selection.teamId, [...(ownerGroups.get(selection.teamId) || []), owner.name])
    })
    ownerGroups.forEach((names, teamId) => owners.set(teamId, names.join(' / ')))
    return owners
  }, [demoMembers, draftSelections])

  const teamPickCounts = useMemo(() => {
    const counts = new Map<string, number>()
    draftSelections.forEach((selection) => counts.set(selection.teamId, (counts.get(selection.teamId) || 0) + 1))
    return counts
  }, [draftSelections])
  const memberPickCounts = useMemo(() => {
    const counts = new Map<string, number>()
    draftSelections.forEach((selection) => counts.set(selection.memberId, (counts.get(selection.memberId) || 0) + 1))
    return counts
  }, [draftSelections])
  const remainingTeams = useMemo(
    () => teams.filter((team) => (teamPickCounts.get(team.id) || 0) < maxOwnersPerTeam),
    [teamPickCounts],
  )
  const draftMember = demoMembers.find((member) => member.id === draftMemberId) || demoMembers[0]
  const manualMember = demoMembers.find((member) => member.id === manualMemberId) || demoMembers[0]
  const manualTeam = teams.find((team) => team.id === manualTeamId) || teams[0]
  const conflictTeam = teams.find((team) => team.id === conflictTeamId) || teams[0]
  const draftMemberPickCount = memberPickCounts.get(draftMemberId) || 0
  const manualMemberPickCount = memberPickCounts.get(manualMemberId) || 0
  const conflictOpenSlots = Math.max(0, maxOwnersPerTeam - (teamPickCounts.get(conflictTeamId) || 0))
  const slotResultTeam = slotResultId ? teams.find((team) => team.id === slotResultId) || null : null
  const slotCountries = useMemo(() => remainingTeams.map(slotCountryFromTeam), [remainingTeams])
  const slotResultCountry = slotResultTeam ? slotCountryFromTeam(slotResultTeam) : null

  const applyPreview = () => {
    setLiveFixtures((current) =>
      current.map((match) => {
        const result = previewResults[match.id]
        return result ? { ...match, result } : match
      }),
    )
  }

  const clearResults = () => {
    setLiveFixtures((current) => current.map((match) => ({ ...match, result: { home: null, away: null } })))
  }

  const updateScore = (side: 'home' | 'away', rawValue: string) => {
    const value = rawValue === '' ? null : Number(rawValue)
    setLiveFixtures((current) =>
      current.map((match) => {
        if (match.id !== selectedMatch.id) return match
        return { ...match, result: { ...match.result, [side]: Number.isFinite(value) ? value : null } }
      }),
    )
  }

  const updateMatchNumber = (key: keyof MatchResult, rawValue: string) => {
    const value = rawValue === '' ? undefined : Math.max(0, Number(rawValue))
    setLiveFixtures((current) =>
      current.map((match) => {
        if (match.id !== selectedMatch.id) return match
        return {
          ...match,
          result: {
            ...match.result,
            [key]: Number.isFinite(value) ? value : undefined,
          },
        }
      }),
    )
  }

  const setPenaltyWinner = (side: 'home' | 'away' | 'none') => {
    setLiveFixtures((current) =>
      current.map((match) => {
        if (match.id !== selectedMatch.id) return match
        return {
          ...match,
          result: {
            ...match.result,
            homePenaltyWin: side === 'home',
            awayPenaltyWin: side === 'away',
          },
        }
      }),
    )
  }

  const applyInsiderRules = async (nextRules: Rules, mode: RulesUpdateMode) => {
    const nextTimeline = buildRulesTimeline(rulesTimeline, nextRules, mode, new Date().toISOString())
    setRulesTimeline(nextTimeline)
    setRules(nextRules)
    setSaveLabel('保存中')
    const ok = await pushRules(nextRules, awards, mode)
    setSaveLabel(ok ? 'クラウド保存済み' : 'この端末に保存済み')
  }

  const updateAward = (key: keyof AwardSettings, teamId: string) => {
    setAwards((current) => ({ ...current, [key]: teamId }))
    setSaveLabel('未保存')
  }

  const saveSelectedResult = async () => {
    setResultSaveLabel('保存中')
    const ok = await pushResult(selectedMatch.id, selectedMatch.result)
    setResultSaveLabel(ok ? '通知＆保存済み' : 'この端末に保存済み')
    window.setTimeout(() => setResultSaveLabel('結果を保存'), 2600)
  }

  const spinSlot = () => {
    clearSlotTimer(slotTimerRef)
    if (slotPhase === 'spinning') return
    if (draftMemberPickCount >= maxTeamsPerMember) {
      setSlotMessage(`${draftMember.name}は${maxTeamsPerMember}チーム取得済みです`)
      return
    }
    if (remainingTeams.length === 0) {
      setSlotMessage('2人決定済みの国だけになりました')
      return
    }

    const result = remainingTeams[Math.floor(Math.random() * remainingTeams.length)]
    setSlotResultId(null)
    setSlotPendingResultId(result.id)
    setSlotSpinKey((current) => current + 1)
    setSlotPhase('spinning')
    setSlotMessage('スロット回転中')
    slotTimerRef.current = window.setTimeout(() => {
      slotTimerRef.current = null
      setSlotPhase('ready')
      setSlotPendingResultId(null)
      setSlotResultId(result.id)
      setSlotMessage(`${teamNameJa(result.id)}を確定できます`)
    }, 1550)
  }

  const confirmSlotPick = () => {
    if (!slotResultTeam || slotPhase !== 'ready') return
    const validation = validateSelection(draftSelections, draftMember.id, slotResultTeam.id, demoMembers)
    if (validation) {
      setSlotMessage(validation)
      return
    }

    const nextSelections = [...draftSelections, { memberId: draftMember.id, teamId: slotResultTeam.id }]
    setDraftSelections(nextSelections)
    setSlotPhase('idle')
    setSlotResultId(null)
    setSlotPendingResultId(null)
    setSlotMessage(`${draftMember.name}が${teamNameJa(slotResultTeam.id)}を獲得しました`)
    setDraftMemberId(nextAvailableMemberId(nextSelections, draftMember.id))
  }

  const addManualDecision = () => {
    const validation = validateSelection(draftSelections, manualMember.id, manualTeam.id, demoMembers)
    if (validation) {
      setManualMessage(validation)
      return
    }

    setDraftSelections((current) => [...current, { memberId: manualMember.id, teamId: manualTeam.id }])
    setManualMessage(`${manualMember.name}が${teamNameJa(manualTeam.id)}で決定しました`)
  }

  const runConflictRoulette = () => {
    setConflictResultMemberIds([])
    if (conflictMemberIds.length < 3) {
      setConflictMessage('3人以上の候補を選んでください')
      return
    }
    if (conflictOpenSlots <= 0) {
      setConflictMessage(`${teamNameJa(conflictTeam.id)}は2人決定済みです`)
      return
    }

    const eligibleMemberIds = conflictMemberIds.filter(
      (memberId) => validateSelection(draftSelections, memberId, conflictTeam.id, demoMembers) === null,
    )
    if (eligibleMemberIds.length === 0) {
      setConflictMessage('登録できる候補者がいません')
      return
    }

    const winners = shuffleIds(eligibleMemberIds).slice(0, Math.min(conflictOpenSlots, eligibleMemberIds.length))
    setDraftSelections((current) => [...current, ...winners.map((memberId) => ({ memberId, teamId: conflictTeam.id }))])
    setConflictResultMemberIds(winners)
    setConflictMessage(`${teamNameJa(conflictTeam.id)}は${memberNames(winners, demoMembers)}に決定しました`)
  }

  const toggleConflictMember = (memberId: string) => {
    setConflictMemberIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId],
    )
  }

  const resetSlotState = (message: string) => {
    clearSlotTimer(slotTimerRef)
    setSlotResultId(null)
    setSlotPendingResultId(null)
    setSlotPhase('idle')
    setSlotMessage(message)
  }

  return (
    <main className="app-shell">
      <div className="fifa-bg" aria-hidden="true">
        <div className="fifa-stars fifa-stars-tl">
          <span className="fifa-star" />
          <span className="fifa-star white" />
          <span className="fifa-star" />
        </div>
        <div className="fifa-stars fifa-stars-br">
          <span className="fifa-star white" />
          <span className="fifa-star" />
          <span className="fifa-star white" />
        </div>
      </div>

      <SettingsBar />

      <nav className="mobile-section-tabs" aria-label="sections">
        <a href="#rooms">
          <Users size={15} />
          {t('ルーム')}
        </a>
        <a href="#help">
          <HelpCircle size={15} />
          {t('使い方')}
        </a>
        {boardUnlocked ? (
          <>
        <a href="#match-desk">
          <Bell size={15} />
          試合
        </a>
        <a href="#bracket">
          <Network size={15} />
          組合せ
        </a>
        <a href="#group-standings">
          <Trophy size={15} />
          組
        </a>
        <a href="#member-ranking">
          <Medal size={15} />
          順位
        </a>
        <a href="#projection-panel">
          <Gauge size={15} />
          予想
        </a>
        <a href="#draft-slot">
          <Shuffle size={15} />
          救済
        </a>
        <a href="#rules-lab">
          <Settings size={15} />
          ルール
        </a>
          </>
        ) : null}
      </nav>

      <section className="dashboard-grid">
        <details className="panel room-panel" id="rooms">
          <summary className="rescue-summary">
            <span>
              <Users size={18} />
              <strong>{t('ルーム対戦')}</strong>
            </span>
            <em>{t('みんなで遊ぶ')}</em>
          </summary>
          <RoomsPanel
            awards={awards}
            liveFixtures={liveFixtures}
            groups={groups}
            qualifierIds={qualifierIds}
            odds={odds}
            oddsProbs={oddsProbs}
            schedule={schedule}
            playerStats={playerStats}
            bracket={bracket}
            bracketLoaded={bracketLoaded}
            projectionMode={projectionMode}
            onProjectionMode={setProjectionMode}
          />
        </details>
        <HelpPanel />
        <PublicRulesPanel rules={publicRules} />
        {boardUnlocked ? (
          <>
        <details className="panel slot-panel rescue-slot-panel" id="draft-slot">
          <summary className="rescue-summary">
            <span>
              <Shuffle size={18} />
              <strong>救済スロット</strong>
            </span>
            <em>予選終了後だけ使用 / 対象{remainingTeams.length}チーム</em>
          </summary>
          <p className="rescue-slot-note">
            予選敗退国を多く持った参加者の救済用です。予選通過国のうち、まだ2人決定していない国だけを回します。
          </p>
          <div className="slot-draft-layout">
            <CountrySlot
              countries={slotCountries}
              resultCountry={slotPendingResultId ? null : slotResultCountry}
              spinKey={slotSpinKey}
              spinning={slotPhase === 'spinning'}
            />
            <div className="slot-controls">
              <label className="slot-member-select">
                <span>参加者</span>
                <select value={draftMemberId} onChange={(event) => setDraftMemberId(event.target.value)}>
                  {demoMembers.map((member) => {
                    const count = memberPickCounts.get(member.id) || 0
                    return (
                      <option key={member.id} value={member.id}>
                        {member.name} ({count}/{maxTeamsPerMember})
                      </option>
                    )
                  })}
                </select>
              </label>

              <div className="slot-status">
                <span>{draftMember.name}</span>
                <strong>{draftMemberPickCount}/{maxTeamsPerMember}</strong>
                <p>{slotMessage}</p>
              </div>

              {slotPhase === 'ready' && slotResultTeam ? (
                <div className="slot-result">
                  <img src={flagUrl(slotResultTeam.flag)} alt={`${teamNameJa(slotResultTeam.id)}の国旗`} />
                  <div>
                    <span>今回の出目</span>
                    <strong>{teamNameJa(slotResultTeam.id)}</strong>
                  </div>
                </div>
              ) : null}

              <div className="slot-actions">
                <button
                  type="button"
                  className="text-button"
                  onClick={spinSlot}
                  disabled={slotPhase === 'spinning' || draftMemberPickCount >= maxTeamsPerMember || remainingTeams.length === 0}
                >
                  <Shuffle size={16} />
                  回す
                </button>
                <button type="button" className="text-button" onClick={confirmSlotPick} disabled={slotPhase !== 'ready'}>
                  <BadgeCheck size={16} />
                  この国を取る
                </button>
              </div>

              <div className="slot-secondary-actions">
                <button
                  type="button"
                  className="text-button quiet"
                  onClick={() => {
                    setDraftSelections(demoSelections)
                    resetSlotState('デモ配布を反映しました')
                  }}
                >
                  デモ配布
                </button>
                <button
                  type="button"
                  className="text-button quiet"
                  onClick={() => {
                    setDraftSelections([])
                    resetSlotState('ドラフトをリセットしました')
                    setDraftMemberId(demoMembers[0].id)
                    setManualMessage('選挙で決まった組み合わせを手動で登録できます')
                    setConflictResultMemberIds([])
                    setConflictMessage('3人以上が同じ国を希望した時だけ回してください')
                  }}
                >
                  全リセット
                </button>
              </div>

              <div className="remaining-countries">
                <span>ルーレット対象 {remainingTeams.length}チーム</span>
                <div>
                  {remainingTeams.slice(0, 14).map((team) => (
                    <img key={team.id} src={flagUrl(team.flag)} alt={teamNameJa(team.id)} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="decision-lab">
            <div className="decision-card">
              <div className="decision-card-title">
                <strong>手動決定</strong>
                <span>選挙で決まった分を登録</span>
              </div>
              <div className="decision-form">
                <label>
                  <span>参加者</span>
                  <select value={manualMemberId} onChange={(event) => setManualMemberId(event.target.value)}>
                    {demoMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({memberPickCounts.get(member.id) || 0}/{maxTeamsPerMember})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>国</span>
                  <select value={manualTeamId} onChange={(event) => setManualTeamId(event.target.value)}>
                    {teams.map((team) => {
                      const count = teamPickCounts.get(team.id) || 0
                      const alreadyOwned = draftSelections.some(
                        (selection) => selection.memberId === manualMemberId && selection.teamId === team.id,
                      )
                      return (
                        <option key={team.id} value={team.id} disabled={count >= maxOwnersPerTeam || alreadyOwned}>
                          {teamNameJa(team.id)} ({count}/{maxOwnersPerTeam})
                        </option>
                      )
                    })}
                  </select>
                </label>
                <button
                  type="button"
                  className="text-button"
                  onClick={addManualDecision}
                  disabled={manualMemberPickCount >= maxTeamsPerMember}
                >
                  <BadgeCheck size={16} />
                  決定登録
                </button>
              </div>
              <p className="decision-message">{manualMessage}</p>
            </div>

            <div className="decision-card">
              <div className="decision-card-title">
                <strong>3人以上かぶり</strong>
                <span>空き枠だけルーレット</span>
              </div>
              <div className="decision-form">
                <label>
                  <span>かぶった国</span>
                  <select
                    value={conflictTeamId}
                    onChange={(event) => {
                      setConflictTeamId(event.target.value)
                      setConflictResultMemberIds([])
                    }}
                  >
                    {teams.map((team) => {
                      const count = teamPickCounts.get(team.id) || 0
                      return (
                        <option key={team.id} value={team.id} disabled={count >= maxOwnersPerTeam}>
                          {teamNameJa(team.id)} ({count}/{maxOwnersPerTeam})
                        </option>
                      )
                    })}
                  </select>
                </label>
                <div className="candidate-grid">
                  {demoMembers.map((member) => {
                    const alreadyOwned = draftSelections.some(
                      (selection) => selection.memberId === member.id && selection.teamId === conflictTeamId,
                    )
                    const full = (memberPickCounts.get(member.id) || 0) >= maxTeamsPerMember
                    return (
                      <label key={member.id} className={conflictResultMemberIds.includes(member.id) ? 'winner' : ''}>
                        <input
                          type="checkbox"
                          checked={conflictMemberIds.includes(member.id)}
                          disabled={alreadyOwned || full}
                          onChange={() => toggleConflictMember(member.id)}
                        />
                        <span>{member.name}</span>
                      </label>
                    )
                  })}
                </div>
                <button type="button" className="text-button" onClick={runConflictRoulette} disabled={conflictOpenSlots <= 0}>
                  <Shuffle size={16} />
                  かぶりルーレット
                </button>
              </div>
              <p className="decision-message">{conflictMessage}</p>
            </div>

            <div className="decision-card decision-list-card">
              <div className="decision-card-title">
                <strong>決定済み</strong>
                <span>誰が何を取ったか</span>
              </div>
              <div className="decision-list">
                {draftSelections.length > 0 ? (
                  draftSelections.map((selection, index) => {
                    const member = demoMembers.find((entry) => entry.id === selection.memberId)
                    const team = teams.find((entry) => entry.id === selection.teamId)
                    if (!member || !team) return null
                    return (
                      <div key={`${selection.memberId}-${selection.teamId}-${index}`}>
                        <span>{member.name}</span>
                        <strong>
                          <img src={flagUrl(team.flag)} alt={teamNameJa(team.id)} />
                          {teamNameJa(team.id)}
                        </strong>
                      </div>
                    )
                  })
                ) : (
                  <p>まだ決定なし</p>
                )}
              </div>
            </div>
          </div>
        </details>

        <BoardView
          members={demoMembers}
          selections={draftSelections}
          rules={rulesTimeline}
          awards={awards}
          teamStandings={teamStandings}
          liveFixtures={liveFixtures}
          groups={groups}
          qualifierIds={qualifierIds}
          odds={odds}
          oddsProbs={oddsProbs}
          schedule={schedule}
          playerStats={playerStats}
          bracket={bracket}
          bracketLoaded={bracketLoaded}
          projectionMode={projectionMode}
          onProjectionMode={setProjectionMode}
          activeGroup={activeGroup}
          onActiveGroup={(group) => {
            setActiveGroup(group)
            setSelectedMatchId(`${group}-1`)
          }}
        />

        <section className="panel match-panel" id="match-desk">
          <PanelTitle icon={<Bell size={18} />} title="試合・結果" note="" />
          <div className="google-match-list">
            {activeMatches.map((match) => (
              <GoogleMatchCard
                key={match.id}
                match={match}
                selected={selectedMatch.id === match.id}
                onSelect={() => setSelectedMatchId(match.id)}
                kickoff={schedule[match.id]}
                homeOwner={teamOwnersByTeam.get(match.homeTeamId)}
                awayOwner={teamOwnersByTeam.get(match.awayTeamId)}
                homeOdds={odds[match.id]?.[match.homeTeamId]}
                awayOdds={odds[match.id]?.[match.awayTeamId]}
                drawOdds={odds[match.id]?.draw}
              />
            ))}
          </div>
          <details className="manual-score">
            <summary className="rescue-summary">
              <span>
                <Save size={18} />
                <strong>手動採点</strong>
              </span>
              <em>自動取得の補正用</em>
            </summary>
          <div className="match-controls">
            <select value={selectedMatch.id} onChange={(event) => setSelectedMatchId(event.target.value)}>
              {activeMatches.map((match) => (
                <option key={match.id} value={match.id}>
                  {match.id} {teamName(match.homeTeamId)} vs {teamName(match.awayTeamId)}
                </option>
              ))}
            </select>
            <div className="score-editor">
              <input
                type="number"
                min="0"
                value={selectedMatch.result.home ?? ''}
                onChange={(event) => updateScore('home', event.target.value)}
                aria-label="home score"
              />
              <span>:</span>
              <input
                type="number"
                min="0"
                value={selectedMatch.result.away ?? ''}
                onChange={(event) => updateScore('away', event.target.value)}
                aria-label="away score"
              />
            </div>
          </div>
          <div className="penalty-editor" aria-label="penalty winner">
            <span>PK決着</span>
            <button
              type="button"
              className={!selectedMatch.result.homePenaltyWin && !selectedMatch.result.awayPenaltyWin ? 'active' : ''}
              onClick={() => setPenaltyWinner('none')}
            >
              なし
            </button>
            <button
              type="button"
              className={selectedMatch.result.homePenaltyWin ? 'active' : ''}
              onClick={() => setPenaltyWinner('home')}
            >
              {teamNameJa(selectedMatch.homeTeamId)}
            </button>
            <button
              type="button"
              className={selectedMatch.result.awayPenaltyWin ? 'active' : ''}
              onClick={() => setPenaltyWinner('away')}
            >
              {teamNameJa(selectedMatch.awayTeamId)}
            </button>
          </div>
          <div className="event-editor">
            <EventNumber label={`${teamNameJa(selectedMatch.homeTeamId)} ハットトリック`} value={selectedMatch.result.homeHatTricks} onChange={(value) => updateMatchNumber('homeHatTricks', value)} />
            <EventNumber label={`${teamNameJa(selectedMatch.awayTeamId)} ハットトリック`} value={selectedMatch.result.awayHatTricks} onChange={(value) => updateMatchNumber('awayHatTricks', value)} />
            <EventNumber label={`${teamNameJa(selectedMatch.homeTeamId)} 黄カード`} value={selectedMatch.result.homeYellowCards} onChange={(value) => updateMatchNumber('homeYellowCards', value)} />
            <EventNumber label={`${teamNameJa(selectedMatch.awayTeamId)} 黄カード`} value={selectedMatch.result.awayYellowCards} onChange={(value) => updateMatchNumber('awayYellowCards', value)} />
            <EventNumber label={`${teamNameJa(selectedMatch.homeTeamId)} 赤カード`} value={selectedMatch.result.homeRedCards} onChange={(value) => updateMatchNumber('homeRedCards', value)} />
            <EventNumber label={`${teamNameJa(selectedMatch.awayTeamId)} 赤カード`} value={selectedMatch.result.awayRedCards} onChange={(value) => updateMatchNumber('awayRedCards', value)} />
            <EventNumber label={`${teamNameJa(selectedMatch.homeTeamId)} オウンゴール`} value={selectedMatch.result.homeOwnGoals} onChange={(value) => updateMatchNumber('homeOwnGoals', value)} />
            <EventNumber label={`${teamNameJa(selectedMatch.awayTeamId)} オウンゴール`} value={selectedMatch.result.awayOwnGoals} onChange={(value) => updateMatchNumber('awayOwnGoals', value)} />
            <EventNumber label={`${teamNameJa(selectedMatch.homeTeamId)} 6得点者`} value={selectedMatch.result.homeSixGoals} onChange={(value) => updateMatchNumber('homeSixGoals', value)} />
            <EventNumber label={`${teamNameJa(selectedMatch.awayTeamId)} 6得点者`} value={selectedMatch.result.awaySixGoals} onChange={(value) => updateMatchNumber('awaySixGoals', value)} />
          </div>
          <div className="button-row">
            <button type="button" className="text-button" onClick={saveSelectedResult}>
              <Save size={16} />
              {resultSaveLabel}
            </button>
            <button type="button" className="text-button quiet" onClick={applyPreview}>
              <Gauge size={16} />
              デモ結果
            </button>
            <button type="button" className="text-button quiet" onClick={clearResults}>
              <RotateCcw size={16} />
              リセット
            </button>
          </div>
          </details>
        </section>

        <details className="panel rules-panel" id="rules-lab">
          <summary className="rescue-summary">
            <span>
              <Settings size={18} />
              <strong>ルール編集</strong>
            </span>
            <em>{saveLabel}</em>
          </summary>
          <RulesEditor rules={rules} onApply={applyInsiderRules}>
            <div className="award-grid">
              <AwardSelect label="優勝" value={awards.championTeamId} onChange={(teamId) => updateAward('championTeamId', teamId)} />
              <AwardSelect label="準優勝" value={awards.runnerUpTeamId} onChange={(teamId) => updateAward('runnerUpTeamId', teamId)} />
              <AwardSelect label="3位" value={awards.thirdPlaceTeamId} onChange={(teamId) => updateAward('thirdPlaceTeamId', teamId)} />
              <AwardSelect label="MVP" value={awards.mvpTeamId} onChange={(teamId) => updateAward('mvpTeamId', teamId)} />
              <AwardSelect label="得点王" value={awards.topScorerTeamId} onChange={(teamId) => updateAward('topScorerTeamId', teamId)} />
            </div>
          </RulesEditor>
        </details>
        <AnalyticsPanel summary={analyticsSummary} loaded={analyticsLoaded} />
          </>
        ) : (
          <BoardGatePanel onSubmit={applyBoardKey} busy={boardBusy} error={boardError} />
        )}
      </section>

      <SupportBar />
    </main>
  )
}

// Public donation links (no API keys; external links only). The PayPay P2P link
// is a public receive link. Set the Stripe Payment Link URL once created in the
// Stripe Dashboard (Payment Links) — it is a public buy.stripe.com URL.
const SUPPORT_PAYPAY_URL = 'https://qr.paypay.ne.jp/p2p01_dtQeYi1ETPoCdhoi'
const SUPPORT_STRIPE_URL = ''

const publicRules: Rules = neutralPublicRules

function SupportBar() {
  const [showPaypay, setShowPaypay] = useState(false)
  if (!SUPPORT_PAYPAY_URL && !SUPPORT_STRIPE_URL) return null
  const qrSrc = `${import.meta.env.BASE_URL}paypay-qr.png`
  return (
    <>
      <footer className="support-bar">
        <div className="support-text">
          <Coffee size={16} />
          <span>運営を応援（ビールを奢る / サンクスカード・任意）</span>
        </div>
        <div className="support-actions">
          {SUPPORT_STRIPE_URL ? (
            <a className="support-btn" href={SUPPORT_STRIPE_URL} target="_blank" rel="noopener noreferrer">
              カードで応援
            </a>
          ) : null}
          {SUPPORT_PAYPAY_URL ? (
            <button type="button" className="support-btn paypay" onClick={() => setShowPaypay(true)}>
              PayPayで応援
            </button>
          ) : null}
        </div>
      </footer>
      {showPaypay ? (
        <div className="paypay-overlay" role="presentation" onClick={() => setShowPaypay(false)}>
          <div className="paypay-qr-card" role="dialog" aria-label="PayPayで応援" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="paypay-close" aria-label="閉じる" onClick={() => setShowPaypay(false)}>
              <X size={18} />
            </button>
            <h4>PayPayで応援</h4>
            <img src={qrSrc} alt="PayPay 送金QRコード" />
            <p>QRを読み取るか、スマホは下のボタンでPayPayアプリが開きます。</p>
            <a className="support-btn paypay" href={SUPPORT_PAYPAY_URL} target="_blank" rel="noopener noreferrer">
              PayPayアプリで開く
            </a>
          </div>
        </div>
      ) : null}
    </>
  )
}

const helpSteps: Array<{ img: string; title: string; body: string }> = [
  { img: 'step1.jpg', title: 'ルームを作る・参加する', body: '「ルーム対戦」を開いて、合言葉つきでルームを作成しコードを共有。仲間はコードと合言葉で参加します。' },
  { img: 'step2.jpg', title: 'ニックネームで集まる', body: '名前を入れて最大8人まで参加。全員そろったら、ホストが「ピック開始」を押します。' },
  { img: 'step3.jpg', title: '国を秘密に選ぶ', body: '各自が自分の端末で国を選んで提出。みんなの選択は公開まで見えません。' },
  { img: 'step4.jpg', title: '公開＆ルーレット', body: 'ホストが公開。3人以上が同じ国を選ぶと、その全員がルーレットでランダムな国に変わります（1国は最大2人まで）。' },
  { img: 'step5.jpg', title: '結果で自動採点', body: '本大会の試合結果で、持っている国にポイントが入り、順位はリアルタイムで更新。配点は「配点ルール」で確認できます。' },
]

function HelpPanel() {
  const t = useT()
  return (
    <details className="panel help-panel" id="help">
      <summary className="rescue-summary">
        <span>
          <HelpCircle size={18} />
          <strong>{t('使い方')}</strong>
        </span>
        <em>{t('はじめての方へ')}</em>
      </summary>
      <ol className="help-steps">
        {helpSteps.map((step, index) => (
          <li key={step.img} className="help-step">
            <div className="help-step-media">
              <img src={`${import.meta.env.BASE_URL}help/${step.img}`} alt="" loading="lazy" />
              <span className="help-step-num">{index + 1}</span>
            </div>
            <div className="help-step-text">
              <strong>{t(step.title)}</strong>
              <p>{t(step.body)}</p>
            </div>
          </li>
        ))}
      </ol>
    </details>
  )
}

function PublicRulesPanel({ rules }: { rules: Rules }) {
  const t = useT()
  const items: Array<[string, number]> = [
    ['勝ち', rules.win],
    ['PK勝ち', rules.penaltyWin],
    ['引分', rules.draw],
    ['3点差勝ち', rules.goalMargin3Bonus],
    ['ハットトリック', rules.hatTrickBonus],
    ['決勝T進出', rules.knockoutQualifiedBonus],
    ['全敗', rules.allLossBonus],
    ['優勝', rules.championBonus],
    ['準優勝', rules.runnerUpBonus],
    ['3位', rules.thirdPlaceBonus],
    ['MVP', rules.mvpBonus],
    ['得点王', rules.topScorerBonus],
    ['黄カード4枚', rules.yellowCardsFourPenalty],
    ['レッドカード', rules.redCardPenalty],
    ['オウンゴール', rules.ownGoalPenalty],
  ]
  return (
    <details className="panel rules-readonly" id="public-rules">
      <summary className="rescue-summary">
        <span>
          <Settings size={18} />
          <strong>{t('配点ルール')}</strong>
        </span>
        <em>{t('ポイントの付き方')}</em>
      </summary>
      <p className="rules-readonly-note">{t('獲得した国の成績でポイントが入り、保有国の合計があなたの得点になります。')}</p>
      <ul className="rules-readonly-list">
        {items.map(([label, value]) => (
          <li key={label}>
            <span>{t(label)}</span>
            <strong>{value > 0 ? `+${value}` : value}</strong>
          </li>
        ))}
      </ul>
    </details>
  )
}

function BoardGatePanel({
  onSubmit,
  busy,
  error,
}: {
  onSubmit: (passphrase: string) => void
  busy: boolean
  error: string
}) {
  const [value, setValue] = useState('')
  return (
    <section className="panel board-gate" id="board-gate">
      <PanelTitle icon={<Lock size={18} />} title="身内ボード" note="合言葉で表示" />
      <p className="board-gate-note">
        参加者ランキング・最終予想・救済スロットなどの身内ボードは、合言葉を入れた人だけに表示されます。
      </p>
      <form
        className="board-gate-form"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(value)
        }}
      >
        <input
          type="password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="合言葉"
          autoComplete="current-password"
        />
        <button type="submit" className="room-primary" disabled={busy || !value}>
          開く
        </button>
      </form>
      {error ? <p className="room-error">{error}</p> : null}
    </section>
  )
}

function AnalyticsPanel({ summary, loaded }: { summary: AnalyticsSummary | null; loaded: boolean }) {
  return (
    <details className="panel analytics-panel" id="analytics-panel">
      <summary className="rescue-summary">
        <span>
          <Gauge size={18} />
          <strong>アクセス分析</strong>
        </span>
        <em>合言葉限定</em>
      </summary>
      {!loaded ? (
        <p className="analytics-note">読み込み中…</p>
      ) : !summary ? (
        <p className="analytics-note">アクセス数を取得できませんでした。</p>
      ) : (
        <>
          <p className="analytics-note">集計期間 2026/6/8〜決勝(7/19)・身内をのぞく</p>
          <div className="analytics-metrics">
            <article>
              <span>累計ユニーク</span>
              <strong>{summary.uniqueVisitors.toLocaleString('ja-JP')}</strong>
            </article>
            <article>
              <span>総アクセス</span>
              <strong>{summary.totalVisits.toLocaleString('ja-JP')}</strong>
            </article>
            <article>
              <span>今日のユニーク</span>
              <strong>{summary.today.uniques.toLocaleString('ja-JP')}</strong>
            </article>
            <article>
              <span>今日のアクセス</span>
              <strong>{summary.today.visits.toLocaleString('ja-JP')}</strong>
            </article>
          </div>
        </>
      )}
    </details>
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

function EventNumber({ label, value, onChange }: { label: string; value?: number; onChange: (value: string) => void }) {
  return (
    <label>
      <span>{label}</span>
      <input type="number" min="0" inputMode="numeric" value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function AwardSelect({ label, value, onChange }: { label: string; value: string; onChange: (teamId: string) => void }) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">未設定</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {teamNameJa(team.id)}
          </option>
        ))}
      </select>
    </label>
  )
}

function teamName(teamId: string): string {
  return teamNameJa(teamId)
}

function teamNameJa(teamId: string): string {
  return teamNamesJa[teamId] || teams.find((team) => team.id === teamId)?.name || teamId
}

function slotCountryFromTeam(team: Team): SlotCountry {
  return {
    id: team.id,
    label: teamNameJa(team.id),
    shortName: team.shortName,
    flag: team.flag,
    group: team.group,
  }
}

function nextAvailableMemberId(selections: TeamSelection[], currentId: string): string {
  const currentIndex = Math.max(
    0,
    seedMembers.findIndex((member) => member.id === currentId),
  )

  for (let offset = 1; offset <= seedMembers.length; offset += 1) {
    const member = seedMembers[(currentIndex + offset) % seedMembers.length]
    const pickCount = memberPickCountOf(selections, member.id)
    if (pickCount < maxTeamsPerMember) return member.id
  }

  return currentId
}

function validateSelection(
  selections: TeamSelection[],
  memberId: string,
  teamId: string,
  members: Member[],
): string | null {
  const member = members.find((entry) => entry.id === memberId)
  const team = teams.find((entry) => entry.id === teamId)
  if (!member || !team) return '参加者または国が見つかりません'
  if (selections.some((selection) => selection.memberId === memberId && selection.teamId === teamId)) {
    return `${member.name}は${teamNameJa(teamId)}をすでに決定済みです`
  }
  if (memberPickCountOf(selections, memberId) >= maxTeamsPerMember) {
    return `${member.name}は${maxTeamsPerMember}チーム決定済みです`
  }
  if (teamPickCountOf(selections, teamId) >= maxOwnersPerTeam) {
    return `${teamNameJa(teamId)}は${maxOwnersPerTeam}人決定済みです`
  }
  return null
}

function memberPickCountOf(selections: TeamSelection[], memberId: string): number {
  return selections.filter((selection) => selection.memberId === memberId).length
}

function teamPickCountOf(selections: TeamSelection[], teamId: string): number {
  return selections.filter((selection) => selection.teamId === teamId).length
}

function shuffleIds(ids: string[]): string[] {
  return [...ids].sort(() => Math.random() - 0.5)
}

function memberNames(memberIds: string[], members: Member[]): string {
  return memberIds
    .map((memberId) => members.find((member) => member.id === memberId)?.name || memberId)
    .join('、')
}

function clearSlotTimer(timerRef: MutableRefObject<number | null>) {
  if (timerRef.current === null) return
  window.clearTimeout(timerRef.current)
  timerRef.current = null
}

function applyResultMap(base: Match[], results: Record<string, MatchResult>): Match[] {
  return base.map((match) => (results[match.id] ? { ...match, result: { ...match.result, ...results[match.id] } } : match))
}

function extractResultMap(matches: Match[]): Record<string, MatchResult> {
  const out: Record<string, MatchResult> = {}
  matches.forEach((match) => {
    if (match.result.home !== null || match.result.away !== null) out[match.id] = match.result
  })
  return out
}

export default App
