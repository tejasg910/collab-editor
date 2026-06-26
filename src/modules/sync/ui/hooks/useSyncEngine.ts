"use client"

import { useEffect, useRef, useCallback } from "react"
import { useOnlineStatus } from "./useOnlineStatus"
import {
  getUnsyncedOps,
  markOpsSynced,
  clearSyncedOps,
  getSyncMeta,
  saveSyncMeta,
  updateLamportClock,
  getLocalDoc,
  saveLocalDoc,
} from "@/lib/db/local"
import type { JSONContent } from "@tiptap/react"

interface SyncEngineOptions {
  documentId: string
  userId: string
  role: "owner" | "editor" | "viewer"
  onSyncStart: () => void
  onSyncComplete: (mergedContent: JSONContent, lastSyncedAt: number) => void
  onSyncError: () => void
}

// Deterministic merge: sort by lamportClock, break ties by userId (alphabetical)
// Highest clock = last writer = wins
function pickWinner(ops: Array<{ lamportClock: number; userId: string; content: unknown }>) {
  return [...ops].sort((a, b) =>
    a.lamportClock !== b.lamportClock
      ? a.lamportClock - b.lamportClock
      : a.userId.localeCompare(b.userId)
  ).at(-1)!
}

export function useSyncEngine({
  documentId,
  userId,
  role,
  onSyncStart,
  onSyncComplete,
  onSyncError,
}: SyncEngineOptions) {
  const isOnline = useOnlineStatus()
  const syncingRef = useRef(false)

  const sync = useCallback(async () => {
    // viewers cannot push — they can still pull
    if (syncingRef.current) return
    syncingRef.current = true
    onSyncStart()

    try {
      // ── 1. PUSH: send unsynced local ops to server ─────────────────
      if (role !== "viewer") {
        const unsyncedOps = await getUnsyncedOps(documentId)

        if (unsyncedOps.length > 0) {
          const res = await fetch("/api/sync/push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documentId, ops: unsyncedOps }),
          })

          if (!res.ok) {
            const { error } = await res.json()
            throw new Error(error ?? "Push failed")
          }

          await markOpsSynced(unsyncedOps.map((op) => op.opId))
          await clearSyncedOps(documentId)
        }
      }

      // ── 2. PULL: fetch remote ops since last sync ───────────────────
      const meta = await getSyncMeta(documentId)
      const pullRes = await fetch(
        `/api/sync/pull?documentId=${documentId}&since=${meta.lastSyncedClock}`
      )

      if (!pullRes.ok) {
        const { error } = await pullRes.json()
        throw new Error(error ?? "Pull failed")
      }

      const { ops: remoteOps } = await pullRes.json()
      const now = Date.now()

      if (remoteOps.length > 0) {
        // ── 3. MERGE: last writer wins by lamport clock ─────────────
        const winner = pickWinner(remoteOps)
        const maxClock = winner.lamportClock

        // Update local lamport clock to be ahead of received ops
        await updateLamportClock(documentId, maxClock)

        // Persist merged content to IndexedDB
        const localDoc = await getLocalDoc(documentId)
        if (localDoc) {
          await saveLocalDoc({
            ...localDoc,
            content: winner.content as JSONContent,
            syncedAt: now,
          })
        }

        await saveSyncMeta({ documentId, lastSyncedClock: maxClock, lastSyncedAt: now })
        onSyncComplete(winner.content as JSONContent, now)
      } else {
        // No remote changes — still update lastSyncedAt
        await saveSyncMeta({ ...meta, lastSyncedAt: now })
        const localDoc = await getLocalDoc(documentId)
        onSyncComplete(localDoc?.content ?? { type: "doc", content: [] }, now)
      }
    } catch {
      onSyncError()
    } finally {
      syncingRef.current = false
    }
  }, [documentId, userId, role, onSyncStart, onSyncComplete, onSyncError])

  // Sync immediately on reconnect
  useEffect(() => {
    if (isOnline) sync()
  }, [isOnline]) // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic sync every 30s while online
  useEffect(() => {
    if (!isOnline) return
    const id = setInterval(sync, 30_000)
    return () => clearInterval(id)
  }, [isOnline, sync])

  return { sync, isOnline }
}
