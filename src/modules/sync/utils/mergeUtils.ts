import type { JSONContent } from "@tiptap/react"

/**
 * Three-way merge at the block level.
 *
 * Rule per block position i:
 *   local == remote          → take either (no conflict)
 *   base undefined           → both added new content; include both
 *   base == local            → only remote changed; take remote
 *   base == remote           → only local changed; take local
 *   base != local != remote  → genuine conflict; higher Lamport clock wins
 */
export function threeWayMerge(
  base: JSONContent,
  local: JSONContent,
  remote: JSONContent,
  localClock: number,
  remoteClock: number
): JSONContent {
  const baseBlocks   = base?.content   ?? []
  const localBlocks  = local?.content  ?? []
  const remoteBlocks = remote?.content ?? []

  const maxLen = Math.max(baseBlocks.length, localBlocks.length, remoteBlocks.length)
  const merged: JSONContent[] = []

  for (let i = 0; i < maxLen; i++) {
    const b = baseBlocks[i]
    const l = localBlocks[i]
    const r = remoteBlocks[i]

    const bStr = JSON.stringify(b ?? null)
    const lStr = JSON.stringify(l ?? null)
    const rStr = JSON.stringify(r ?? null)

    if (lStr === rStr) {
      if (l !== undefined) merged.push(l)
    } else if (b === undefined) {
      if (l !== undefined) merged.push(l)
      if (r !== undefined && rStr !== lStr) merged.push(r)
    } else if (bStr === lStr) {
      if (r !== undefined) merged.push(r)
    } else if (bStr === rStr) {
      if (l !== undefined) merged.push(l)
    } else {
      const winner = localClock >= remoteClock ? l : r
      if (winner !== undefined) merged.push(winner)
    }
  }

  return {
    type: "doc",
    content: merged.length > 0 ? merged : [{ type: "paragraph" }],
  }
}

/**
 * From a set of ops, pick the one with the highest Lamport clock.
 * Tiebreak: lexicographically higher userId wins (deterministic across clients).
 */
export function pickWinner(
  ops: Array<{ lamportClock: number; userId: string; content: unknown }>
) {
  return [...ops].sort((a, b) =>
    a.lamportClock !== b.lamportClock
      ? a.lamportClock - b.lamportClock
      : a.userId.localeCompare(b.userId)
  ).at(-1)!
}

/**
 * Advance a Lamport clock by 1. Pure — no side effects.
 */
export function nextLamportClock(current: number): number {
  return current + 1
}

/**
 * Receive a remote clock value and advance local past it.
 */
export function updateLamportClock(local: number, received: number): number {
  return Math.max(local, received) + 1
}
