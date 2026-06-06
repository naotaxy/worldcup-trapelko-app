import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MutableRefObject, ReactNode } from 'react'
import {
  BadgeCheck,
  Bell,
  Bot,
  ExternalLink,
  Flag,
  Gauge,
  Link2,
  LockKeyhole,
  Medal,
  RotateCcw,
  Save,
  Settings,
  Shield,
  Shuffle,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import './App.css'
import { CountrySlot, type SlotCountry } from './components/CountrySlot'
import { TournamentScene } from './components/TournamentScene'
import { squads, squadSource, squadWarnings } from './data/squads'
import { playerNamesJa } from './data/playerNamesJa'
import {
  contentLeads,
  defaultRules,
  demoMembers,
  demoSelections,
  fixtures,
  groups,
  previewResults,
  teamNamesJa,
  teams,
} from './data/worldCup2026'
import {
  calculateMemberStandings,
  calculateTeamBreakdown,
  calculateTeamStandings,
  flagUrl,
  groupStandings,
  matchWasPlayed,
  type TeamBreakdown,
} from './logic/score'
import { calculateFinalProjections, type MemberProjection, type ProjectionMode } from './logic/projection'
import type { AwardSettings, GroupCode, Match, MatchResult, Rules, SquadPlayer, Team, TeamSelection, TeamStanding } from './types'
import { fetchBootstrap, fetchSharedState, linkLineMember, pushResult, pushRules, type Bootstrap } from './lib/api'
import { getLineProfile, type LineProfile } from './lib/liff'
import { loadLocalState, saveLocalState } from './lib/persistence'

const ruleFields: Array<{ key: keyof Rules; label: string; min: number; max: number; step: number }> = [
  { key: 'win', label: '勝ち', min: 0, max: 10, step: 1 },
  { key: 'penaltyWin', label: 'PK勝ち', min: 0, max: 10, step: 1 },
  { key: 'draw', label: '引分', min: 0, max: 5, step: 1 },
  { key: 'goalMargin3Bonus', label: '3点差勝ち', min: 0, max: 10, step: 1 },
  { key: 'hatTrickBonus', label: 'ハットトリック', min: 0, max: 10, step: 1 },
  { key: 'knockoutQualifiedBonus', label: '決勝T進出', min: 0, max: 12, step: 1 },
  { key: 'thirdPlaceBonus', label: '3位', min: 0, max: 12, step: 1 },
  { key: 'runnerUpBonus', label: '準優勝', min: 0, max: 20, step: 1 },
  { key: 'championBonus', label: '優勝', min: 0, max: 25, step: 1 },
  { key: 'allLossBonus', label: '全敗', min: 0, max: 15, step: 1 },
  { key: 'mvpBonus', label: 'MVP', min: 0, max: 20, step: 1 },
  { key: 'topScorerBonus', label: '得点王', min: 0, max: 20, step: 1 },
  { key: 'yellowCardsFourPenalty', label: '黄4枚', min: -5, max: 0, step: 1 },
  { key: 'redCardPenalty', label: '赤', min: -5, max: 0, step: 1 },
  { key: 'ownGoalPenalty', label: 'OG', min: -5, max: 0, step: 1 },
  { key: 'japanMultiplier', label: '日本倍率', min: 1, max: 3, step: 0.5 },
]

const maxTeamsPerMember = 8
const maxOwnersPerTeam = 2
const draftSlotLimit = demoMembers.length * maxTeamsPerMember

const positionLabels: Record<SquadPlayer['position'], string> = {
  GK: 'GK',
  DF: 'DF',
  MF: 'MF',
  FW: 'FW',
}

const japanPlayerNamesJa: Record<string, string> = {
  'Tomoki Hayakawa': '早川友基',
  'Keisuke Osako': '大迫敬介',
  'Zion Suzuki': '鈴木彩艶',
  'Ko Itakura': '板倉滉',
  'Hiroki Ito': '伊藤洋輝',
  'Yuto Nagatomo': '長友佑都',
  'Ayumu Seko': '瀬古歩夢',
  'Yukinari Sugawara': '菅原由勢',
  'Junnosuke Suzuki': '鈴木淳之介',
  'Shogo Taniguchi': '谷口彰悟',
  'Takehiro Tomiyasu': '冨安健洋',
  'Tsuyoshi Watanabe': '渡辺剛',
  'Ritsu Doan': '堂安律',
  'Wataru Endo': '遠藤航',
  'Junya Ito': '伊東純也',
  'Daichi Kamada': '鎌田大地',
  'Takefusa Kubo': '久保建英',
  'Keito Nakamura': '中村敬斗',
  'Kaishu Sano': '佐野海舟',
  'Ao Tanaka': '田中碧',
  'Keisuke Goto': '後藤啓介',
  'Daizen Maeda': '前田大然',
  'Koki Ogawa': '小川航基',
  'Kento Shiogai': '塩貝健人',
  'Yuito Suzuki': '鈴木唯人',
  'Ayase Ueda': '上田綺世',
}

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
  const [activeGroup, setActiveGroup] = useState<GroupCode>('F')
  const [rules, setRules] = useState<Rules>(() => initialLocalState()?.rules ?? defaultRules)
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
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null)
  const [lineProfile, setLineProfile] = useState<LineProfile | null>(null)
  const [resultSaveLabel, setResultSaveLabel] = useState('結果を保存')
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)

  useEffect(() => {
    return () => clearSlotTimer(slotTimerRef)
  }, [])

  // Device-local state is loaded via the lazy initializers above. Here we pull
  // the shared backend state when Supabase is configured (Render), otherwise
  // these calls resolve to null and the seed/local state stays in place.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [boot, shared] = await Promise.all([fetchBootstrap(), fetchSharedState()])
      if (cancelled) return
      if (boot) setBootstrap(boot)
      if (shared) {
        if (shared.rules) setRules(shared.rules)
        if (shared.awards) setAwards(shared.awards)
        if (shared.selections && shared.selections.length > 0) setDraftSelections(shared.selections)
        if (shared.results) setLiveFixtures((current) => applyResultMap(current, shared.results!))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Mirror mutable board state to this device so reloads keep edits even with
  // no backend.
  useEffect(() => {
    saveLocalState({ rules, awards, selections: draftSelections, results: extractResultMap(liveFixtures) })
  }, [rules, awards, draftSelections, liveFixtures])

  const teamStandings = useMemo(() => calculateTeamStandings(groups, liveFixtures, rules, awards), [awards, liveFixtures, rules])
  const memberStandings = useMemo(
    () => calculateMemberStandings(demoMembers, draftSelections, teamStandings),
    [draftSelections, teamStandings],
  )
  const memberProjections = useMemo(
    () => calculateFinalProjections(demoMembers, draftSelections, groups, liveFixtures, rules, awards, projectionMode),
    [awards, draftSelections, liveFixtures, projectionMode, rules],
  )
  const projectionLeader = memberProjections[0]
  const activeRows = useMemo(() => groupStandings(teamStandings, activeGroup), [teamStandings, activeGroup])
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
  }, [draftSelections])

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
  const activeGroupMeta = groups.find((group) => group.code === activeGroup) || groups[0]
  const activeSquadCount = activeGroupMeta.teams.reduce((sum, team) => sum + (squads[team.id]?.length || 0), 0)

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

  const updateRule = (key: keyof Rules, rawValue: string) => {
    const value = Number(rawValue)
    setRules((current) => ({ ...current, [key]: Number.isFinite(value) ? value : current[key] }))
    setSaveLabel('未保存')
  }

  const updateAward = (key: keyof AwardSettings, teamId: string) => {
    setAwards((current) => ({ ...current, [key]: teamId }))
    setSaveLabel('未保存')
  }

  const saveRules = async () => {
    setSaveLabel('保存中')
    const ok = await pushRules(rules, awards)
    setSaveLabel(ok ? 'クラウド保存済み' : 'この端末に保存済み')
  }

  const saveSelectedResult = async () => {
    setResultSaveLabel('保存中')
    const ok = await pushResult(selectedMatch.id, selectedMatch.result)
    setResultSaveLabel(ok ? '通知＆保存済み' : 'この端末に保存済み')
    window.setTimeout(() => setResultSaveLabel('結果を保存'), 2600)
  }

  const handleLineLogin = async () => {
    const profile = await getLineProfile(bootstrap?.liffId ?? null)
    if (!profile) return
    setLineProfile(profile)
    await linkLineMember({
      lineUserId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
    })
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
    const validation = validateSelection(draftSelections, draftMember.id, slotResultTeam.id)
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
    const validation = validateSelection(draftSelections, manualMember.id, manualTeam.id)
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

    const eligibleMemberIds = conflictMemberIds.filter((memberId) => validateSelection(draftSelections, memberId, conflictTeam.id) === null)
    if (eligibleMemberIds.length === 0) {
      setConflictMessage('登録できる候補者がいません')
      return
    }

    const winners = shuffleIds(eligibleMemberIds).slice(0, Math.min(conflictOpenSlots, eligibleMemberIds.length))
    setDraftSelections((current) => [...current, ...winners.map((memberId) => ({ memberId, teamId: conflictTeam.id }))])
    setConflictResultMemberIds(winners)
    setConflictMessage(`${teamNameJa(conflictTeam.id)}は${memberNames(winners)}に決定しました`)
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
      <TournamentScene activeGroup={activeGroup} />

      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">26</div>
          <div>
            <p className="eyebrow">LINEグループ用カップボード</p>
            <h1>W杯ドラフト</h1>
          </div>
        </div>
        <div className="top-actions">
          {lineProfile ? (
            <span className="line-profile-chip" title={`${lineProfile.displayName}でログイン中`}>
              {lineProfile.pictureUrl ? <img src={lineProfile.pictureUrl} alt={lineProfile.displayName} /> : <Users size={14} />}
              {lineProfile.displayName}
            </span>
          ) : (
            <button
              type="button"
              className="icon-button"
              title={bootstrap?.liffId ? 'LINEでログイン' : 'LINEログインは公開後に有効'}
              onClick={handleLineLogin}
            >
              <LockKeyhole size={18} />
            </button>
          )}
          <button type="button" className="icon-button" title="トラペル子通知">
            <Bot size={18} />
          </button>
        </div>
      </header>

      <section className="score-strip" aria-label="overview">
        <Metric icon={<Flag size={18} />} label="組数" value="12組 x 4" />
        <Metric icon={<Users size={18} />} label="参加者" value={`${demoMembers.length}人`} />
        <Metric icon={<Gauge size={18} />} label="決定済み" value={`${draftSelections.length}/${draftSlotLimit}`} />
        <Metric icon={<Shield size={18} />} label="予想首位" value={projectionLeader ? `${projectionLeader.member.name} ${projectionLeader.average}` : '計算中'} />
      </section>

      <nav className="group-tabs" aria-label="groups">
        {groups.map((group) => (
          <button
            key={group.code}
            type="button"
            className={group.code === activeGroup ? 'active' : ''}
            style={{ '--group-color': group.color } as CSSProperties}
            onClick={() => {
              setActiveGroup(group.code)
              setSelectedMatchId(`${group.code}-1`)
            }}
          >
            {group.code}
          </button>
        ))}
      </nav>

      <nav className="mobile-section-tabs" aria-label="mobile sections">
        <a href="#match-desk">
          <Bell size={15} />
          試合
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
        <a href="#squad-panel">
          <Users size={15} />
          代表
        </a>
        <a href="#draft-slot">
          <Shuffle size={15} />
          救済
        </a>
        <a href="#rules-lab">
          <Settings size={15} />
          ルール
        </a>
      </nav>

      <section className="hero-band">
        <div>
          <p className="eyebrow">Group {activeGroup}</p>
          <h2>{activeGroupMeta.headline}</h2>
        </div>
        <div className="hero-flags">
          {activeGroupMeta.teams.map((team) => (
            <img key={team.id} src={flagUrl(team.flag)} alt={`${teamNameJa(team.id)}の国旗`} />
          ))}
        </div>
      </section>

      <section className="line-bridge-band" aria-label="LINE group policy">
        <div>
          <Bot size={18} />
          <strong>WC☆2026 専用</strong>
        </div>
        <p>秘書トラペル子はこのLINEグループではW杯の結果、順位、集計だけを担当します。ウイコレ関連の発言と機能は無効です。</p>
      </section>

      <section className="dashboard-grid">
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

        <section className="panel group-panel" id="group-standings">
          <PanelTitle icon={<Trophy size={18} />} title={`グループ${activeGroup}`} note="順位表" />
          <div className="table-shell">
            <table className="standings-table">
              <thead>
                <tr>
                  <th>代表</th>
                  <th>持ち主</th>
                  <th>試</th>
                  <th>W</th>
                  <th>D</th>
                  <th>L</th>
                  <th>GD</th>
                  <th>勝点</th>
                  <th>遊びPt</th>
                </tr>
              </thead>
              <tbody>
                {activeRows.map((row) => (
                  <tr key={row.team.id}>
                    <td>
                      <TeamCell row={row} />
                    </td>
                    <td>{teamOwnersByTeam.get(row.team.id) || '未決定'}</td>
                    <td>{row.played}</td>
                    <td>{row.wins}</td>
                    <td>{row.draws}</td>
                    <td>{row.losses}</td>
                    <td>{formatSigned(row.goalDifference)}</td>
                    <td>{row.fifaPoints}</td>
                    <td>{row.fantasyPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel leaderboard-panel" id="member-ranking">
          <PanelTitle icon={<Medal size={18} />} title="参加者ランキング" note="遊びポイント" />
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

        <section className="panel projection-panel" id="projection-panel">
          <PanelTitle
            icon={<Gauge size={18} />}
            title="最終予想グラフ"
            note={projectionMode === 'historyDemo' ? '過去デモ / 平均値 / 中央値' : '標準 / 平均値 / 中央値'}
          />
          <ProjectionGraph projections={memberProjections} mode={projectionMode} onModeChange={setProjectionMode} />
        </section>

        <section className="panel squad-panel" id="squad-panel">
          <PanelTitle
            icon={<Users size={18} />}
            title="代表メンバー"
            note={`${activeGroupMeta.teams.length}代表 / ${activeSquadCount}人登録`}
          />
          <div className="squad-grid">
            {activeGroupMeta.teams.map((team) => (
              <SquadCard key={team.id} team={team} players={squads[team.id] || []} />
            ))}
          </div>
          <div className="squad-source">
            <a href={squadSource} target="_blank" rel="noreferrer">
              登録メンバー出典
              <ExternalLink size={13} />
            </a>
            {squadWarnings.length > 0 ? <span>一部チームは公開記事上の人数差を検知済み</span> : null}
          </div>
        </section>

        <section className="panel match-panel" id="match-desk">
          <PanelTitle icon={<Bell size={18} />} title="試合・結果" note="Google風カード / LINE通知対象" />
          <div className="google-match-list">
            {activeMatches.map((match) => (
              <GoogleMatchCard
                key={match.id}
                match={match}
                selected={selectedMatch.id === match.id}
                onSelect={() => setSelectedMatchId(match.id)}
              />
            ))}
          </div>
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
              {teamShort(selectedMatch.homeTeamId)}
            </button>
            <button
              type="button"
              className={selectedMatch.result.awayPenaltyWin ? 'active' : ''}
              onClick={() => setPenaltyWinner('away')}
            >
              {teamShort(selectedMatch.awayTeamId)}
            </button>
          </div>
          <div className="event-editor">
            <EventNumber label={`${teamShort(selectedMatch.homeTeamId)} HT`} value={selectedMatch.result.homeHatTricks} onChange={(value) => updateMatchNumber('homeHatTricks', value)} />
            <EventNumber label={`${teamShort(selectedMatch.awayTeamId)} HT`} value={selectedMatch.result.awayHatTricks} onChange={(value) => updateMatchNumber('awayHatTricks', value)} />
            <EventNumber label={`${teamShort(selectedMatch.homeTeamId)} 黄`} value={selectedMatch.result.homeYellowCards} onChange={(value) => updateMatchNumber('homeYellowCards', value)} />
            <EventNumber label={`${teamShort(selectedMatch.awayTeamId)} 黄`} value={selectedMatch.result.awayYellowCards} onChange={(value) => updateMatchNumber('awayYellowCards', value)} />
            <EventNumber label={`${teamShort(selectedMatch.homeTeamId)} 赤`} value={selectedMatch.result.homeRedCards} onChange={(value) => updateMatchNumber('homeRedCards', value)} />
            <EventNumber label={`${teamShort(selectedMatch.awayTeamId)} 赤`} value={selectedMatch.result.awayRedCards} onChange={(value) => updateMatchNumber('awayRedCards', value)} />
            <EventNumber label={`${teamShort(selectedMatch.homeTeamId)} OG`} value={selectedMatch.result.homeOwnGoals} onChange={(value) => updateMatchNumber('homeOwnGoals', value)} />
            <EventNumber label={`${teamShort(selectedMatch.awayTeamId)} OG`} value={selectedMatch.result.awayOwnGoals} onChange={(value) => updateMatchNumber('awayOwnGoals', value)} />
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
        </section>

        <section className="panel rules-panel" id="rules-lab">
          <PanelTitle icon={<Settings size={18} />} title="ルール編集" note={saveLabel} />
          <div className="rule-grid">
            {ruleFields.map((field) => (
              <label key={field.key} className="rule-control">
                <span>
                  {field.label}
                  <strong>{rules[field.key]}</strong>
                </span>
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={rules[field.key]}
                  onChange={(event) => updateRule(field.key, event.target.value)}
                />
              </label>
            ))}
          </div>
          <div className="award-grid">
            <AwardSelect label="優勝" value={awards.championTeamId} onChange={(teamId) => updateAward('championTeamId', teamId)} />
            <AwardSelect label="準優勝" value={awards.runnerUpTeamId} onChange={(teamId) => updateAward('runnerUpTeamId', teamId)} />
            <AwardSelect label="3位" value={awards.thirdPlaceTeamId} onChange={(teamId) => updateAward('thirdPlaceTeamId', teamId)} />
            <AwardSelect label="MVP" value={awards.mvpTeamId} onChange={(teamId) => updateAward('mvpTeamId', teamId)} />
            <AwardSelect label="得点王" value={awards.topScorerTeamId} onChange={(teamId) => updateAward('topScorerTeamId', teamId)} />
          </div>
          <button type="button" className="text-button" onClick={saveRules}>
            <Save size={16} />
            ルール保存
          </button>
        </section>

        <section className="panel selection-panel" id="team-draft">
          <PanelTitle icon={<Users size={18} />} title="チーム選択" note={`1人${maxTeamsPerMember}チーム`} />
          <div className="selection-grid">
            {demoMembers.map((member) => {
              const owned = draftSelections
                .filter((selection) => selection.memberId === member.id)
                .map((selection) => teams.find((team) => team.id === selection.teamId))
                .filter((team): team is (typeof teams)[number] => Boolean(team))

              return (
                <article key={member.id} className="selection-card">
                  <div className="selection-head">
                    <div className="member-avatar" style={{ '--avatar-color': member.accent } as CSSProperties}>
                      {member.avatar}
                    </div>
                    <div>
                      <strong>{member.name}</strong>
                      <span>@{member.lineName}</span>
                    </div>
                  </div>
                  <div className="selection-flags">
                    {owned.length > 0 ? (
                      owned.map((team) => <img key={team.id} src={flagUrl(team.flag)} alt={teamNameJa(team.id)} />)
                    ) : (
                      <span className="empty-selection">未獲得</span>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="panel content-panel" id="match-pulse">
          <PanelTitle icon={<Link2 size={18} />} title="ニュース・ハイライト" note="リンク誘導のみ" />
          <div className="content-list">
            {contentLeads.map((lead) => (
              <a key={lead.id} href={lead.url} target="_blank" rel="noreferrer" className="content-lead">
                <span>{lead.label}</span>
                <strong>{lead.match}</strong>
                <p>{lead.summary}</p>
                <small>
                  {lead.source}
                  <ExternalLink size={13} />
                </small>
              </a>
            ))}
          </div>
        </section>
      </section>

      {selectedTeamId
        ? (() => {
            const team = teams.find((entry) => entry.id === selectedTeamId)
            if (!team) return null
            const unplayed = liveFixtures
              .filter((match) => match.homeTeamId === team.id || match.awayTeamId === team.id)
              .filter((match) => !(match.result.home !== null && match.result.away !== null))
              .sort((a, b) => a.date.localeCompare(b.date))
            const upcoming = unplayed[0]
            const nextMatch = upcoming
              ? {
                  date: upcoming.date,
                  opponentName: teamNameJa(upcoming.homeTeamId === team.id ? upcoming.awayTeamId : upcoming.homeTeamId),
                  home: upcoming.homeTeamId === team.id,
                }
              : null
            return (
              <TeamDetailModal
                team={team}
                breakdown={calculateTeamBreakdown(team, groups, liveFixtures, rules, awards)}
                owners={teamOwnersByTeam.get(team.id) || '未決定'}
                players={squads[team.id] || []}
                remaining={unplayed.length}
                nextMatch={nextMatch}
                onClose={() => setSelectedTeamId(null)}
              />
            )
          })()
        : null}
    </main>
  )
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function PanelTitle({ icon, title, note }: { icon: ReactNode; title: string; note: string }) {
  return (
    <div className="panel-title">
      <div>
        {icon}
        <h3>{title}</h3>
      </div>
      <span>{note}</span>
    </div>
  )
}

function TeamCell({ row }: { row: TeamStanding }) {
  return (
    <div className="team-cell">
      <img src={flagUrl(row.team.flag)} alt={`${teamNameJa(row.team.id)}の国旗`} />
      <div>
        <strong>{teamNameJa(row.team.id)}</strong>
        <span>{row.team.confederation}</span>
      </div>
    </div>
  )
}

function GoogleMatchCard({ match, selected, onSelect }: { match: Match; selected: boolean; onSelect: () => void }) {
  const homeTeam = teams.find((team) => team.id === match.homeTeamId) || teams[0]
  const awayTeam = teams.find((team) => team.id === match.awayTeamId) || teams[0]
  const played = matchWasPlayed(match)

  return (
    <button type="button" className={selected ? 'google-match-card active' : 'google-match-card'} onClick={onSelect}>
      <div className="google-match-meta">
        <span>{formatDateJa(match.date)}</span>
        <strong>グループ{match.group}</strong>
        <em>{played ? '終了' : '試合前'}</em>
      </div>
      <TeamScoreLine team={homeTeam} score={match.result.home} winner={played && isMatchWinner(match, 'home')} />
      <TeamScoreLine team={awayTeam} score={match.result.away} winner={played && isMatchWinner(match, 'away')} />
      <div className="google-match-links">
        <a href={match.highlightUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
          ハイライト
        </a>
        <a href={match.newsUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
          ニュース
        </a>
      </div>
    </button>
  )
}

function TeamScoreLine({ team, score, winner }: { team: Team; score: number | null; winner: boolean }) {
  return (
    <div className={winner ? 'team-score-line winner' : 'team-score-line'}>
      <span>
        <img src={flagUrl(team.flag)} alt={`${teamNameJa(team.id)}の国旗`} />
        {teamNameJa(team.id)}
      </span>
      <strong>{score ?? '-'}</strong>
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

function ProjectionGraph({
  projections,
  mode,
  onModeChange,
}: {
  projections: MemberProjection[]
  mode: ProjectionMode
  onModeChange: (mode: ProjectionMode) => void
}) {
  const maxValue = Math.max(1, ...projections.map((projection) => projection.high))
  const leaderAverage = projections[0]?.average || 0

  return (
    <div className="projection-list">
      <div className="projection-mode-controls">
        <button type="button" className={mode === 'standard' ? 'active' : ''} onClick={() => onModeChange('standard')}>
          標準予想
        </button>
        <button type="button" className={mode === 'historyDemo' ? 'active' : ''} onClick={() => onModeChange('historyDemo')}>
          過去デモ予想
        </button>
        <p>
          {mode === 'historyDemo'
            ? '前回Excelルールの点差感を参考に、全48カ国へ仮の上振れ/下振れポイントを入れて計算中。'
            : '入力済みの試合結果を固定し、残り試合と大会ボーナスをシード強度ベースで計算中。'}
        </p>
      </div>
      {projections.map((projection) => {
        const averageWidth = `${normalizeProjectionValue(projection.average, maxValue)}%`
        const medianLeft = `${normalizeProjectionValue(projection.median, maxValue)}%`
        const lowLeft = `${normalizeProjectionValue(projection.low, maxValue)}%`
        const rangeWidth = `${Math.max(1, normalizeProjectionValue(projection.high - projection.low, maxValue))}%`
        const gap = roundPoint(projection.average - leaderAverage)

        return (
          <article key={projection.member.id} className="projection-row">
            <div className="projection-head">
              <div className="member-avatar" style={{ '--avatar-color': projection.member.accent } as CSSProperties}>
                {projection.member.avatar}
              </div>
              <div>
                <strong>
                  {projection.averageRank}. {projection.member.name}
                </strong>
                <span>
                  現在 {projection.current} / 予想差 {gap === 0 ? '首位' : gap}
                </span>
              </div>
            </div>
            <div className="projection-chart">
              <div className="projection-track">
                <div className="projection-range" style={{ left: lowLeft, width: rangeWidth }} />
                <div className="projection-average" style={{ width: averageWidth }} />
                <div className="projection-median" style={{ left: medianLeft }} />
              </div>
              <div className="projection-values">
                <span>平均 {projection.average}</span>
                <strong>中央値 {projection.median}</strong>
                <span>
                  10-90% {projection.low}-{projection.high}
                </span>
              </div>
            </div>
          </article>
        )
      })}
      <div className="projection-note">
        <span>平均</span>
        <strong>中央値</strong>
        <em>
          薄い帯は10-90%レンジ。{mode === 'historyDemo' ? '過去デモ予想は全チームへ仮の上振れ/下振れを入れています。' : '標準予想は未入力の試合と大会ボーナスだけを推定します。'}
          900回シミュレーションです。
        </em>
      </div>
    </div>
  )
}

function SquadCard({ team, players }: { team: Team; players: SquadPlayer[] }) {
  const grouped = {
    GK: players.filter((player) => player.position === 'GK'),
    DF: players.filter((player) => player.position === 'DF'),
    MF: players.filter((player) => player.position === 'MF'),
    FW: players.filter((player) => player.position === 'FW'),
  }

  return (
    <details className="squad-card" open={team.id === 'japan'}>
      <summary>
        <span>
          <img src={flagUrl(team.flag)} alt={`${teamNameJa(team.id)}の国旗`} />
          <strong>{teamNameJa(team.id)}</strong>
        </span>
        <em>{players.length}人</em>
      </summary>
      <div className="squad-positions">
        {(Object.keys(grouped) as SquadPlayer['position'][]).map((position) => (
          <div key={position} className="squad-position">
            <span>{positionLabels[position]}</span>
            <p>{grouped[position].map((player) => playerName(player, team.id)).join('、') || '未登録'}</p>
          </div>
        ))}
      </div>
    </details>
  )
}

const confederationJa: Record<string, string> = {
  UEFA: '欧州 (UEFA)',
  CONMEBOL: '南米 (CONMEBOL)',
  CAF: 'アフリカ (CAF)',
  AFC: 'アジア (AFC)',
  Concacaf: '北中米カリブ (Concacaf)',
  OFC: 'オセアニア (OFC)',
}

function TeamDetailModal({
  team,
  breakdown,
  owners,
  players,
  remaining,
  nextMatch,
  onClose,
}: {
  team: Team
  breakdown: TeamBreakdown
  owners: string
  players: SquadPlayer[]
  remaining: number
  nextMatch: { date: string; opponentName: string; home: boolean } | null
  onClose: () => void
}) {
  const standing = breakdown.standing
  const maxAbs = Math.max(1, ...breakdown.components.map((component) => Math.abs(component.points)))
  const grouped = {
    GK: players.filter((player) => player.position === 'GK'),
    DF: players.filter((player) => player.position === 'DF'),
    MF: players.filter((player) => player.position === 'MF'),
    FW: players.filter((player) => player.position === 'FW'),
  }
  const { hatTricks, yellowCards, redCards, ownGoals } = breakdown.tallies

  return (
    <div className="team-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="team-modal" onClick={(event) => event.stopPropagation()}>
        <header className="team-modal-head">
          <div>
            <img src={flagUrl(team.flag)} alt={`${teamNameJa(team.id)}の国旗`} />
            <div>
              <strong>{teamNameJa(team.id)}</strong>
              <span>
                {confederationJa[team.confederation] || team.confederation} / グループ{team.group} / 第{team.seed}シード
              </span>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="閉じる">
            <X size={18} />
          </button>
        </header>

        <div className="team-modal-score">
          <span>現在の総ポイント</span>
          <strong>{breakdown.total}</strong>
          <em>保有: {owners}</em>
        </div>

        {standing ? (
          <div className="team-modal-standing">
            <span>{standing.played}試</span>
            <span>{standing.wins}勝</span>
            <span>{standing.draws}分</span>
            <span>{standing.losses}敗</span>
            <span>得失{formatSigned(standing.goalDifference)}</span>
            <span>勝点{standing.fifaPoints}</span>
          </div>
        ) : null}

        <div className="team-modal-schedule">
          <span>残り試合 {remaining}</span>
          {nextMatch ? (
            <span>
              次戦 {formatDateJa(nextMatch.date)} {nextMatch.home ? 'vs' : '@'} {nextMatch.opponentName}
            </span>
          ) : (
            <span>予選日程は終了</span>
          )}
        </div>

        <div className="team-modal-tallies" aria-label="自動取得イベント実績">
          <span>ハットトリック {hatTricks}</span>
          <span>黄 {yellowCards}</span>
          <span className={redCards ? 'danger' : ''}>赤 {redCards}</span>
          <span className={ownGoals ? 'danger' : ''}>OG {ownGoals}</span>
        </div>

        <section className="team-modal-breakdown">
          <h4>ポイント内訳</h4>
          {breakdown.components.length > 0 ? (
            breakdown.components.map((component) => (
              <div key={component.key} className="breakdown-row">
                <span className="breakdown-label">
                  {component.label}
                  {component.count > 1 ? ` ×${component.count}` : ''}
                </span>
                <div className="breakdown-bar-track">
                  <div
                    className={component.points < 0 ? 'breakdown-bar negative' : 'breakdown-bar'}
                    style={{ width: `${(Math.abs(component.points) / maxAbs) * 100}%` }}
                  />
                </div>
                <strong className={component.points < 0 ? 'negative' : ''}>
                  {component.points > 0 ? `+${component.points}` : component.points}
                </strong>
              </div>
            ))
          ) : (
            <p className="breakdown-empty">まだ加点なし（試合前）</p>
          )}
        </section>

        <section className="team-modal-squad">
          <h4>代表メンバー ({players.length}人)</h4>
          {(Object.keys(grouped) as SquadPlayer['position'][]).map((position) => (
            <div key={position} className="team-modal-squad-line">
              <span>{positionLabels[position]}</span>
              <p>{grouped[position].map((player) => playerName(player, team.id)).join('、') || '未登録'}</p>
            </div>
          ))}
          <a className="team-modal-source" href={squadSource} target="_blank" rel="noreferrer">
            選手データ出典
            <ExternalLink size={12} />
          </a>
        </section>
      </div>
    </div>
  )
}

function teamName(teamId: string): string {
  return teamNameJa(teamId)
}

function teamShort(teamId: string): string {
  return teams.find((team) => team.id === teamId)?.shortName || teamId
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
    demoMembers.findIndex((member) => member.id === currentId),
  )

  for (let offset = 1; offset <= demoMembers.length; offset += 1) {
    const member = demoMembers[(currentIndex + offset) % demoMembers.length]
    const pickCount = memberPickCountOf(selections, member.id)
    if (pickCount < maxTeamsPerMember) return member.id
  }

  return currentId
}

function validateSelection(selections: TeamSelection[], memberId: string, teamId: string): string | null {
  const member = demoMembers.find((entry) => entry.id === memberId)
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

function memberNames(memberIds: string[]): string {
  return memberIds
    .map((memberId) => demoMembers.find((member) => member.id === memberId)?.name || memberId)
    .join('、')
}

function clearSlotTimer(timerRef: MutableRefObject<number | null>) {
  if (timerRef.current === null) return
  window.clearTimeout(timerRef.current)
  timerRef.current = null
}

function playerName(player: SquadPlayer, teamId: string): string {
  // Japan uses the hand-curated map first (exact kanji), everyone else uses the
  // Wikidata-sourced katakana; fall back to the original name when unknown.
  if (teamId === 'japan') return japanPlayerNamesJa[player.name] || playerNamesJa[player.name] || player.name
  return playerNamesJa[player.name] || player.name
}

function isMatchWinner(match: Match, side: 'home' | 'away'): boolean {
  if (!matchWasPlayed(match) || match.result.home === null || match.result.away === null) return false
  if (side === 'home') return match.result.home > match.result.away || Boolean(match.result.homePenaltyWin)
  return match.result.away > match.result.home || Boolean(match.result.awayPenaltyWin)
}

function formatDateJa(date: string): string {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(parsed)
}

function formatSigned(value: number): string {
  if (value > 0) return `+${value}`
  return String(value)
}

function normalizeProjectionValue(value: number, maxValue: number): number {
  return Math.min(100, Math.max(0, (value / maxValue) * 100))
}

function roundPoint(value: number): number {
  return Math.round(value * 10) / 10
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
