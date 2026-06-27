import type { JSONContent } from "@tiptap/react"

export type ConflictBlock = {
  /** Position in the merged output array where this block was placed */
  mergedIndex: number
  local: JSONContent
  remote: JSONContent
  /** Which version was auto-selected (higher Lamport clock wins) */
  winner: JSONContent
}

export type MergeResult = {
  content: JSONContent
  /** Non-empty when both sides changed the same block from the same base */
  conflicts: ConflictBlock[]
}

/**
 * Three-way merge at the block level.
 *
 * Rule per block position i:
 *   local == remote          → take either (no conflict)
 *   base undefined           → both added new content at same position
 *   base == local            → only remote changed; take remote
 *   base == remote           → only local changed; take local
 *   base != local != remote  → genuine conflict; higher Lamport clock wins
 *
 * Returns merged content + ConflictBlock[] for any positions where both
 * sides changed the same block (so the UI can offer manual resolution).
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
  const conflicts: ConflictBlock[] = []

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
      // Both added content beyond the base length — this is additive, not a conflict.
      // No shared base means they weren't editing the same thing; just pick deterministically.
      if (lStr === rStr) {
        if (l !== undefined) merged.push(l)
      } else if (l !== undefined && r !== undefined) {
        // Both added different blocks at the same new position; clock tiebreak, no conflict UI.
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
      const winner = localClock >= remoteClock ? l : r
      if (winner !== undefined) {
        conflicts.push({ mergedIndex: merged.length, local: l!, remote: r!, winner })
        merged.push(winner)
      }
    }
  }

  return {
    content: {
      type: "doc",
      content: merged.length > 0 ? merged : [{ type: "paragraph" }],
    },
    conflicts,
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

/**
 * Apply a user's conflict resolution choice to the merged content.
 * For each resolved conflict, replace the auto-merged block at mergedIndex
 * with the user's chosen version.
 */
export function applyResolutions(
  merged: JSONContent,
  resolutions: Map<number, JSONContent>
): JSONContent {
  if (resolutions.size === 0) return merged
  const blocks = [...(merged.content ?? [])]
  resolutions.forEach((chosen, mergedIndex) => {
    if (mergedIndex < blocks.length) {
      blocks[mergedIndex] = chosen
    }
  })
  return { type: "doc", content: blocks }
}
