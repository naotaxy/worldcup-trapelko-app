import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Copy, Crown, LogOut, Plus, Shuffle, Users } from 'lucide-react'
import { groups, teamNamesJa, teams } from '../data/worldCup2026'
import { calculateMemberStandings, flagUrl } from '../logic/score'
import type { Member, TeamSelection, TeamStanding } from '../types'
import {
  createRoom,
  getRoom,
  joinRoom,
  loadRoomSession,
  revealRoom,
  saveRoomSession,
  startRoom,
  submitPicks,
  type RoomSession,
  type RoomState,
} from '../lib/roomsApi'

const nameJa = (id: string) => teamNamesJa[id] || id
const teamById = new Map(teams.map((team) => [team.id, team]))
const flagFor = (id: string) => {
  const team = teamById.get(id)
  return team ? flagUrl(team.flag) : ''
}

type EntryTab = 'create' | 'join'

export function RoomsPanel({ teamStandings }: { teamStandings: TeamStanding[] }) {
  const [session, setSession] = useState<RoomSession | null>(() => loadRoomSession())
  const [room, setRoom] = useState<RoomState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const setSessionPersisted = useCallback((next: RoomSession | null) => {
    saveRoomSession(next)
    setSession(next)
    if (!next) setRoom(null)
  }, [])

  // Initial load + polling while the draft is live. The fetch + setters live in
  // an inline async closure (the accepted pattern here) and polling stops once
  // the room is revealed.
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
          setRoom(res.room)
          if (res.room.status === 'revealed') stop()
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

      {room.status === 'revealed' ? <RoomReveal room={room} teamStandings={teamStandings} /> : null}
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

function RoomReveal({ room, teamStandings }: { room: RoomState; teamStandings: TeamStanding[] }) {
  const assignments = useMemo(() => room.assignments || [], [room.assignments])
  const roulette = assignments.filter((a) => a.source === 'roulette')

  const standings = useMemo(() => {
    const members: Member[] = room.players.map((p) => ({
      id: p.id,
      name: p.nickname,
      lineName: p.nickname,
      avatar: p.avatar,
      accent: p.accent,
    }))
    const selections: TeamSelection[] = assignments.map((a) => ({ memberId: a.playerId, teamId: a.teamId }))
    return calculateMemberStandings(members, selections, teamStandings)
  }, [room.players, assignments, teamStandings])

  const nicknameOf = (playerId: string) => room.players.find((p) => p.id === playerId)?.nickname || '—'
  const teamsByPlayer = useMemo(() => {
    const map = new Map<string, typeof assignments>()
    for (const a of assignments) {
      const list = map.get(a.playerId) || []
      list.push(a)
      map.set(a.playerId, list)
    }
    return map
  }, [assignments])

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

      <div className="room-standings">
        <h4>ルーム順位 (現在の試合結果で計算)</h4>
        <ol>
          {standings.map((row) => (
            <li key={row.member.id}>
              <span className="room-rank">{row.rank}</span>
              <span className="room-avatar small" style={{ background: row.member.accent }}>
                {row.member.avatar}
              </span>
              <span className="room-standing-name">{row.member.name}</span>
              <span className="room-standing-pts">{row.total} pt</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="room-rosters">
        {room.players.map((p) => {
          const owned = teamsByPlayer.get(p.id) || []
          return (
            <div key={p.id} className="room-roster">
              <span className="room-roster-name">
                <span className="room-avatar small" style={{ background: p.accent }}>
                  {p.avatar}
                </span>
                {p.nickname}
              </span>
              <div className="room-roster-flags">
                {owned.map((a) => (
                  <img
                    key={a.teamId}
                    src={flagFor(a.teamId)}
                    alt={nameJa(a.teamId)}
                    title={`${nameJa(a.teamId)}${a.source === 'roulette' ? ' (ルーレット)' : ''}`}
                    className={a.source === 'roulette' ? 'roulette-won' : ''}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
