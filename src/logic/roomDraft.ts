// Pure draft resolution for multiplayer rooms.
//
// Rules (confirmed):
// - Each player secretly picks N teams, then everyone reveals at once.
// - Up to `maxOwnersPerTeam` (default 2) players may co-own the same team.
// - If MORE than that pick the same team, ALL of those picks for that team are
//   void and each affected player spins a roulette for a replacement.
// - The over-picked team STAYS in the roulette candidate pool (so a spinner can
//   land back on it if it still has an open slot), and the per-team owner cap is
//   always respected. Safe picks lock their slots first, then roulette fills the
//   rest sequentially in a shuffled order.

export type DraftIntent = { playerId: string; teamId: string }

export type DraftAssignment = {
  playerId: string
  teamId: string
  ownerSlot: number
  source: 'pick' | 'roulette'
  originalTeamId?: string
}

export type RouletteSpin = {
  playerId: string
  fromTeamId: string
  toTeamId: string | null
}

export type ResolveOptions = {
  allTeamIds: string[]
  maxOwnersPerTeam?: number
  rng?: () => number
}

export type ResolveResult = {
  assignments: DraftAssignment[]
  spins: RouletteSpin[]
  collisionTeamIds: string[]
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function resolveDraft(intents: DraftIntent[], options: ResolveOptions): ResolveResult {
  const maxOwners = options.maxOwnersPerTeam ?? 2
  const rng = options.rng ?? Math.random

  // Group pickers per team (dedupe defensively).
  const pickersByTeam = new Map<string, string[]>()
  for (const intent of intents) {
    const list = pickersByTeam.get(intent.teamId) || []
    if (!list.includes(intent.playerId)) list.push(intent.playerId)
    pickersByTeam.set(intent.teamId, list)
  }

  const ownerCount = new Map<string, number>()
  const playerTeams = new Map<string, Set<string>>()
  const assignments: DraftAssignment[] = []
  const spins: RouletteSpin[] = []
  const collisionTeamIds: string[] = []
  const spinTasks: Array<{ playerId: string; fromTeamId: string }> = []

  const ownerOf = (teamId: string) => ownerCount.get(teamId) || 0
  const teamsOf = (playerId: string) => {
    let set = playerTeams.get(playerId)
    if (!set) {
      set = new Set<string>()
      playerTeams.set(playerId, set)
    }
    return set
  }

  // Pass 1: safe picks (<= cap) lock their slots; over-cap picks become spins.
  for (const [teamId, pickers] of pickersByTeam) {
    if (pickers.length <= maxOwners) {
      for (const playerId of pickers) {
        const slot = ownerOf(teamId) + 1
        ownerCount.set(teamId, slot)
        teamsOf(playerId).add(teamId)
        assignments.push({ playerId, teamId, ownerSlot: slot, source: 'pick' })
      }
    } else {
      collisionTeamIds.push(teamId)
      for (const playerId of pickers) spinTasks.push({ playerId, fromTeamId: teamId })
    }
  }

  // Pass 2: roulette in shuffled order, respecting the cap and no self-duplicates.
  for (const task of shuffle(spinTasks, rng)) {
    const eligible = options.allTeamIds.filter(
      (teamId) => ownerOf(teamId) < maxOwners && !teamsOf(task.playerId).has(teamId),
    )
    if (eligible.length === 0) {
      spins.push({ playerId: task.playerId, fromTeamId: task.fromTeamId, toTeamId: null })
      continue
    }
    const picked = eligible[Math.floor(rng() * eligible.length)]
    const slot = ownerOf(picked) + 1
    ownerCount.set(picked, slot)
    teamsOf(task.playerId).add(picked)
    assignments.push({
      playerId: task.playerId,
      teamId: picked,
      ownerSlot: slot,
      source: 'roulette',
      originalTeamId: task.fromTeamId,
    })
    spins.push({ playerId: task.playerId, fromTeamId: task.fromTeamId, toTeamId: picked })
  }

  return { assignments, spins, collisionTeamIds }
}
