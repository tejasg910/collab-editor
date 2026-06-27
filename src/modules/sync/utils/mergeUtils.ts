import type { JSONContent } from "@tiptap/react"

export type MergeResult = {
  content: JSONContent
  conflictCount: number
}

/**
 * Three-way merge at the block level.
 *
 * Rule per block position i:
 *   local == remote          → take either (no conflict)
 *   base undefined           → both added new content; include both
 *   base == local            → only remote changed; take remote
 *   base == remote           → only local changed; take local
 *   base != local != remote  → genuine conflict; higher Lamport clock wins
 *
 * Returns merged content + how many blocks had genuine conflicts (both sides
 * changed the same block from the same base). Callers use conflictCount to
 * show a toast and auto-save a snapshot so the user can recover either version.
 */
export function threeWayMerge(
  base: JSONContent,
  local: JSONContent,
  remote: JSONContent,
  localClock: number,
  remoteClock: number
): MergeResult {
  const baseBlocks   = base?.content   ?? []
  const localBlocks  = local?.content  ?? []
  const remoteBlocks = remote?.content ?? []

  const maxLen = Math.max(baseBlocks.length, localBlocks.length, remoteBlocks.length)
  const merged: JSONContent[] = []
  let conflictCount = 0

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
      // Both users added blocks beyond the base length.
      if (lStr === rStr) {
        // Identical addition — push once
        if (l !== undefined) merged.push(l)
      } else if (l !== undefined && r !== undefined) {
        // Both added DIFFERENT content at the same new position.
        // Push-both creates an extra block that cascades into bad merges on the
        // next sync cycle. Use clock tiebreak instead — deterministic, no phantom block.
        conflictCount++
        const winner = localClock >= remoteClock ? l : r
        merged.push(winner)
      } else if (l !== undefined) {
        merged.push(l)
      } else if (r !== undefined) {
        merged.push(r)
      }
    } else if (bStr === lStr) {
      if (r !== undefined) merged.push(r)
    } else if (bStr === rStr) {
      if (l !== undefined) merged.push(l)
    } else {
      // Genuine conflict — both changed same block from same base
      conflictCount++
      const winner = localClock >= remoteClock ? l : r
      if (winner !== undefined) merged.push(winner)
    }
  }

  return {
    content: {
      type: "doc",
      content: merged.length > 0 ? merged : [{ type: "paragraph" }],
    },
    conflictCount,
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
