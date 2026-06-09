import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, Crown, LogOut, Plus, Settings, Shuffle, Users } from 'lucide-react'
import { groups, teamNamesJa } from '../data/worldCup2026'
import { calculateTeamStandings, flagUrl } from '../logic/score'
import type { MatchProb, ProjectionMode } from '../logic/projection'
import type { AwardSettings, Group, Match, Member, Rules, TeamSelection } from '../types'
import type { PlayerStat } from '../lib/api'
import type { BracketRound } from '../lib/bracket'
import { buildRulesTimeline, currentRulesOf, normalizeRules, normalizeTimeline, type RulesUpdateMode } from '../lib/publicRules'
import { BoardView } from './BoardView'
import { RulesEditor, RulesSummary } from './RulesEditor'
import {
  createRoom,
  getRoom,
  joinRoom,
  loadRoomSession,
  revealRoom,
  saveRoomSession,
  startRoom,
  submitPicks,
  updateRoomRules,
  type RoomSession,
  type RoomState,
} from '../lib/roomsApi'

const nameJa = (id: string) => teamNamesJa[id] || id

type EntryTab = 'create' | 'join'

type RoomsPanelProps = {
  awards: AwardSettings
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
}

export function RoomsPanel({
  awards,
  liveFixtures,
  groups: boardGroups,
  qualifierIds,
  odds,
  oddsProbs,
  schedule,
  playerStats,
  bracket,
  bracketLoaded,
  projectionMode,
  onProjectionMode,
}: RoomsPanelProps) {
  const [session, setSession] = useState<RoomSession | null>(() => loadRoomSession())
  const [room, setRoom] = useState<RoomState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const rulesRequestRef = useRef(0)
  const rulesPendingRef = useRef(0)

  const setSessionPersisted = useCallback((next: RoomSession | null) => {
    saveRoomSession(next)
    setSession(next)
    if (!next) setRoom(null)
  }, [])

  // Initial load + polling. Revealed rooms keep polling so host rule edits are
  // reflected on read-only viewers without a reload.
  useEffect(() => {
    if (!session) return
    let cancelled = false
    let intervalId = 0
    const stop = () => {
      if (intervalId) window.clearInterval(intervalId)
      intervalId = 0
    }
    const tick = async () => {
      const res = await getRoom(session.code, session.token)
      if (cancelled) return
      if (res.ok && res.room) {
        if (res.room.you === null) {
          // Token no longer recognised by the room: drop the stale session.
          saveRoomSession(null)
          setSession(null)
          setRoom(null)
          stop()
        } else {
          const nextRoom = res.room
          setRoom((current) =>
            rulesPendingRef.current > 0 && current && current.code === nextRoom.code
              ? { ...nextRoom, rules: current.rules, rulesTimeline: current.rulesTimeline }
              : nextRoom,
          )
        }
      } else if (res.error && /not found/i.test(res.error)) {
        saveRoomSession(null)
        setSession(null)
        setRoom(null)
        stop()
      }
    }
    void tick()
    intervalId = window.setInterval(() => void tick(), 3500)
    return () => {
      cancelled = true
      stop()
    }
  }, [session])

  const updateRulesForRoom = useCallback(
    async (nextRules: Rules, mode: RulesUpdateMode): Promise<boolean> => {
      if (!session || !room) return false
      const requestId = rulesRequestRef.current + 1
      rulesRequestRef.current = requestId
      const previousRules = room.rules
      const previousTimeline = room.rulesTimeline
      const optimisticTimeline = buildRulesTimeline(
        normalizeTimeline(room.rulesTimeline, normalizeRules(room.rules)),
        nextRules,
        mode,
        new Date().toISOString(),
      )
      rulesPendingRef.current += 1
      setError('')
      setRoom((current) =>
        current && current.code === room.code ? { ...current, rules: nextRules, rulesTimeline: optimisticTimeline } : current,
      )
      const res = await updateRoomRules(session.code, session.token, nextRules, mode)
      rulesPendingRef.current = Math.max(0, rulesPendingRef.current - 1)
      if (requestId !== rulesRequestRef.current) return Boolean(res.ok)
      if (res.ok && res.room) {
        setRoom(res.room)
        return true
      }
      setRoom((current) =>
        current && current.code === room.code ? { ...current, rules: previousRules, rulesTimeline: previousTimeline } : current,
      )
      setError(res.error || '配点を保存できませんでした')
      return false
    },
    [room, session],
  )

  if (!session || !room) {
    return <RoomEntry busy={busy} error={error} onBusy={setBusy} onError={setError} onJoined={(s, r) => { setSessionPersisted(s); setRoom(r) }} />
  }

  const youHost = Boolean(room.you?.isHost)
  const leave = () => {
    setNotice('')
    setError('')
    setSessionPersisted(null)
  }

  return (
    <div className="room-active">
      <div className="room-head">
        <div>
          <span className="room-head-name">{room.name}</span>
          <RoomCode code={room.code} onCopied={() => setNotice('コードをコピーしました')} />
        </div>
        <button type="button" className="room-leave" onClick={leave}>
          <LogOut size={15} /> 退出
        </button>
      </div>
      {notice ? <p className="room-notice">{notice}</p> : null}
      {error ? <p className="room-error">{error}</p> : null}

      {room.status === 'lobby' ? (
        <RoomLobby room={room} youHost={youHost} busy={busy} onStart={async () => {
          if (!session) return
          setBusy(true); setError('')
          const res = await startRoom(session.code, session.token)
          setBusy(false)
          if (!res.ok) setError(res.error || '開始できませんでした')
          else if (res.room) setRoom(res.room)
        }} />
      ) : null}

      {room.status === 'picking' ? (
        <RoomPicking
          room={room}
          youHost={youHost}
          busy={busy}
          onSubmit={async (teamIds) => {
            if (!session) return
            setBusy(true); setError('')
            const res = await submitPicks(session.code, session.token, teamIds)
            setBusy(false)
            if (!res.ok) setError(res.error || '提出できませんでした')
            else if (res.room) { setRoom(res.room); setNotice('ピックを提出しました') }
          }}
          onReveal={async (force) => {
            if (!session) return
            setBusy(true); setError('')
            const res = await revealRoom(session.code, session.token, force)
            setBusy(false)
            if (!res.ok) setError(res.error || '公開できませんでした')
            else if (res.room) setRoom(res.room)
          }}
        />
      ) : null}

      {room.status === 'revealed' ? (
        <RoomReveal
          room={room}
          youHost={youHost}
          onRulesChange={updateRulesForRoom}
          awards={awards}
          liveFixtures={liveFixtures}
          groups={boardGroups}
          qualifierIds={qualifierIds}
          odds={odds}
          oddsProbs={oddsProbs}
          schedule={schedule}
          playerStats={playerStats}
          bracket={bracket}
          bracketLoaded={bracketLoaded}
          projectionMode={projectionMode}
          onProjectionMode={onProjectionMode}
        />
      ) : null}
    </div>
  )
}

function RoomCode({ code, onCopied }: { code: string; onCopied: () => void }) {
  return (
    <button
      type="button"
      className="room-code"
      onClick={() => {
        void navigator.clipboard?.writeText(code).then(onCopied).catch(() => undefined)
      }}
      title="ルームコードをコピー"
    >
      <span>{code}</span>
      <Copy size={14} />
    </button>
  )
}

function RoomEntry({
  busy,
  error,
  onBusy,
  onError,
  onJoined,
}: {
  busy: boolean
  error: string
  onBusy: (v: boolean) => void
  onError: (v: string) => void
  onJoined: (session: RoomSession, room: RoomState) => void
}) {
  const [tab, setTab] = useState<EntryTab>('create')
  const [nickname, setNickname] = useState('')
  const [roomName, setRoomName] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [picksPerPlayer, setPicksPerPlayer] = useState(8)
  const [maxPlayers, setMaxPlayers] = useState(8)
  const [joinCode, setJoinCode] = useState('')

  const doCreate = async () => {
    if (!nickname.trim() || !roomName.trim()) {
      onError('ニックネームとルーム名を入力してください')
      return
    }
    onBusy(true); onError('')
    const res = await createRoom({
      name: roomName.trim(),
      nickname: nickname.trim(),
      passphrase: passphrase.trim() || undefined,
      picksPerPlayer,
      maxPlayers,
    })
    onBusy(false)
    if (res.ok && res.code && res.token && res.room) onJoined({ code: res.code, token: res.token }, res.room)
    else onError(res.error || 'ルームを作成できませんでした')
  }

  const doJoin = async () => {
    if (!nickname.trim() || !joinCode.trim()) {
      onError('ルームコードとニックネームを入力してください')
      return
    }
    onBusy(true); onError('')
    const code = joinCode.trim().toUpperCase()
    const res = await joinRoom(code, { nickname: nickname.trim(), passphrase: passphrase.trim() || undefined })
    onBusy(false)
    if (res.ok && res.token && res.room) onJoined({ code, token: res.token }, res.room)
    else onError(res.error || '参加できませんでした')
  }

  return (
    <div className="room-entry">
      <div className="room-tabs">
        <button type="button" className={tab === 'create' ? 'active' : ''} onClick={() => setTab('create')}>
          ルームを作る
        </button>
        <button type="button" className={tab === 'join' ? 'active' : ''} onClick={() => setTab('join')}>
          参加する
        </button>
      </div>

      <label className="room-field">
        <span>ニックネーム</span>
        <input value={nickname} maxLength={24} onChange={(e) => setNickname(e.target.value)} placeholder="表示名" />
      </label>

      {tab === 'create' ? (
        <>
          <label className="room-field">
            <span>ルーム名</span>
            <input value={roomName} maxLength={40} onChange={(e) => setRoomName(e.target.value)} placeholder="例: 金曜ドラフト" />
          </label>
          <label className="room-field">
            <span>合言葉 (任意)</span>
            <input value={passphrase} maxLength={64} onChange={(e) => setPassphrase(e.target.value)} placeholder="空欄なら誰でも参加可" />
          </label>
          <label className="room-field">
            <span>人数（最大）</span>
            <select value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}>
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n}人
                </option>
              ))}
            </select>
          </label>
          <label className="room-field">
            <span>1人の選択数</span>
            <select value={picksPerPlayer} onChange={(e) => setPicksPerPlayer(Number(e.target.value))}>
              {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                <option key={n} value={n}>
                  {n}か国
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="room-primary" disabled={busy} onClick={doCreate}>
            <Plus size={16} /> ルームを作成
          </button>
        </>
      ) : (
        <>
          <label className="room-field">
            <span>ルームコード</span>
            <input value={joinCode} maxLength={8} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="6文字のコード" />
          </label>
          <label className="room-field">
            <span>合言葉 (必要なら)</span>
            <input value={passphrase} maxLength={64} onChange={(e) => setPassphrase(e.target.value)} placeholder="設定されている場合のみ" />
          </label>
          <button type="button" className="room-primary" disabled={busy} onClick={doJoin}>
            <Users size={16} /> 参加する
          </button>
        </>
      )}
      {error ? <p className="room-error">{error}</p> : null}
    </div>
  )
}

function PlayerChips({ room }: { room: RoomState }) {
  return (
    <ul className="room-players">
      {room.players.map((p) => (
        <li key={p.id} className="room-player">
          <span className="room-avatar" style={{ background: p.accent }}>
            {p.avatar}
          </span>
          <span className="room-player-name">
            {p.nickname}
            {p.isHost ? <Crown size={12} className="room-host-mark" /> : null}
          </span>
          {room.status === 'picking' ? (
            <span className={p.picksSubmitted ? 'room-ready done' : 'room-ready'}>{p.picksSubmitted ? <Check size={13} /> : '…'}</span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

function RoomLobby({ room, youHost, busy, onStart }: { room: RoomState; youHost: boolean; busy: boolean; onStart: () => void }) {
  return (
    <div className="room-lobby">
      <p className="room-step">
        待機中 ({room.players.length}/{room.maxPlayers}人)。コードを共有して仲間を集めましょう。
      </p>
      <PlayerChips room={room} />
      {youHost ? (
        <button type="button" className="room-primary" disabled={busy || room.players.length < 2} onClick={onStart}>
          ピックを開始 ({room.players.length < 2 ? 'あと' + (2 - room.players.length) + '人' : 'OK'})
        </button>
      ) : (
        <p className="room-wait">ホストの開始を待っています…</p>
      )}
    </div>
  )
}

function RoomPicking({
  room,
  youHost,
  busy,
  onSubmit,
  onReveal,
}: {
  room: RoomState
  youHost: boolean
  busy: boolean
  onSubmit: (teamIds: string[]) => void
  onReveal: (force: boolean) => void
}) {
  const [picks, setPicks] = useState<string[]>(room.yourPicks || [])
  const [editing, setEditing] = useState(!room.you?.picksSubmitted)

  const limit = room.picksPerPlayer
  const toggle = (teamId: string) => {
    setPicks((cur) => {
      if (cur.includes(teamId)) return cur.filter((id) => id !== teamId)
      if (cur.length >= limit) return cur
      return [...cur, teamId]
    })
  }

  const submitted = room.you?.picksSubmitted
  const allIn = room.submittedCount === room.players.length

  return (
    <div className="room-picking">
      <p className="room-step">
        各自で{limit}か国を秘密に選択。全員が提出したら公開。 提出 {room.submittedCount}/{room.players.length}
      </p>
      <PlayerChips room={room} />

      {submitted && !editing ? (
        <div className="room-submitted">
          <p className="room-ready-msg">
            <Check size={16} /> 提出済み ({picks.length}か国)
          </p>
          <button type="button" className="room-secondary" onClick={() => setEditing(true)} disabled={busy}>
            選び直す
          </button>
        </div>
      ) : (
        <>
          <div className="room-pick-count">
            選択 <strong>{picks.length}</strong> / {limit}
          </div>
          <div className="room-pick-grid">
            {groups.map((group) => (
              <div key={group.code} className="room-pick-group">
                <span className="room-pick-group-code">{group.code}組</span>
                <div className="room-pick-teams">
                  {group.teams.map((team) => {
                    const on = picks.includes(team.id)
                    return (
                      <button
                        key={team.id}
                        type="button"
                        className={on ? 'room-team on' : 'room-team'}
                        onClick={() => toggle(team.id)}
                        disabled={!on && picks.length >= limit}
                      >
                        <img src={flagUrl(team.flag)} alt="" />
                        <span>{nameJa(team.id)}</span>
                        {on ? <Check size={12} /> : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="room-primary"
            disabled={busy || picks.length !== limit}
            onClick={() => {
              onSubmit(picks)
              setEditing(false)
            }}
          >
            この{limit}か国で提出
          </button>
        </>
      )}

      {youHost ? (
        <div className="room-host-reveal">
          <button type="button" className="room-reveal-btn" disabled={busy || room.submittedCount < 2} onClick={() => onReveal(!allIn)}>
            <Shuffle size={16} /> {allIn ? '公開してルーレット' : `未提出ありでも公開 (${room.submittedCount}/${room.players.length})`}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function RoomReveal({
  room,
  youHost,
  onRulesChange,
  awards,
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
}: {
  room: RoomState
  youHost: boolean
  onRulesChange: (rules: Rules, mode: RulesUpdateMode) => Promise<boolean>
  awards: AwardSettings
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
}) {
  const [rulesLabel, setRulesLabel] = useState(youHost ? 'ホストのみ編集' : '閲覧のみ')
  const assignments = useMemo(() => room.assignments || [], [room.assignments])
  const roulette = assignments.filter((a) => a.source === 'roulette')
  const roomTimeline = useMemo(
    () => normalizeTimeline(room.rulesTimeline, normalizeRules(room.rules)),
    [room.rulesTimeline, room.rules],
  )
  const roomRules = useMemo(() => currentRulesOf(roomTimeline), [roomTimeline])
  const teamStandings = useMemo(
    () => calculateTeamStandings(groups, liveFixtures, roomTimeline, awards, qualifierIds, odds, schedule),
    [awards, groups, liveFixtures, odds, qualifierIds, roomTimeline, schedule],
  )
  const members = useMemo<Member[]>(
    () =>
      room.players.map((p) => ({
        id: p.id,
        name: p.nickname,
        lineName: p.nickname,
        avatar: p.avatar,
        accent: p.accent,
      })),
    [room.players],
  )
  const selections = useMemo<TeamSelection[]>(
    () => assignments.map((a) => ({ memberId: a.playerId, teamId: a.teamId })),
    [assignments],
  )

  const nicknameOf = (playerId: string) => room.players.find((p) => p.id === playerId)?.nickname || '—'
  const updateRules = (nextRules: Rules, mode: RulesUpdateMode) => {
    if (!youHost) return
    setRulesLabel('保存中')
    void onRulesChange(nextRules, mode).then((ok) => setRulesLabel(ok ? '保存済み' : '保存失敗'))
  }

  return (
    <div className="room-revealed">
      {roulette.length > 0 ? (
        <div className="room-roulette">
          <h4>
            <Shuffle size={15} /> ルーレット結果 (3人以上が被った国)
          </h4>
          <ul>
            {roulette.map((a, i) => (
              <li key={`${a.playerId}-${a.teamId}-${i}`}>
                <strong>{nicknameOf(a.playerId)}</strong>
                <span className="room-roulette-flow">
                  {a.originalTeamId ? nameJa(a.originalTeamId) : '?'} → {nameJa(a.teamId)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="room-step">被り3人以上はなし。全員が選んだ国を確保しました。</p>
      )}

      <details className="panel rules-panel room-rules-panel" id="room-rules-lab">
        <summary className="rescue-summary">
          <span>
            <Settings size={18} />
            <strong>配点調整</strong>
          </span>
          <em>{rulesLabel}</em>
        </summary>
        {youHost ? (
          <RulesEditor rules={roomRules} onApply={(nextRules, mode) => updateRules(nextRules, mode)} />
        ) : (
          <RulesSummary rules={roomRules} />
        )}
      </details>

      <BoardView
        members={members}
        selections={selections}
        rules={roomTimeline}
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
        onProjectionMode={onProjectionMode}
        isPublic
      />
    </div>
  )
}
