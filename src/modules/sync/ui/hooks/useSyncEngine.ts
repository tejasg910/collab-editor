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
import { threeWayMerge, pickWinner } from "@/modules/sync/utils/mergeUtils"
import type { JSONContent } from "@tiptap/react"

interface SyncEngineOptions {
  documentId: string
  userId: string
  role: "owner" | "editor" | "viewer"
  onSyncStart: () => void
  onSyncComplete: (mergedContent: JSONContent, lastSyncedAt: number) => void
  onSyncError: () => void
}

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] }

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
    if (syncingRef.current) return
    syncingRef.current = true
    onSyncStart()

    try {
      // ── 1. PUSH: send unsynced local ops ──────────────────────────
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

      // ── 2. PULL: fetch remote ops since last sync ──────────────────
      const meta = await getSyncMeta(documentId)
      const localClock = meta.lastSyncedClock

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
        // ── 3. MERGE: three-way merge preserving both parties' edits ──
        const remoteWinner = pickWinner(remoteOps)
        const remoteClock  = remoteWinner.lamportClock

        const base = meta.syncedContent ?? EMPTY_DOC
        const localDoc = await getLocalDoc(documentId)
        const localContent = localDoc?.content ?? EMPTY_DOC

        const merged = threeWayMerge(
          base,
          localContent,
          remoteWinner.content as JSONContent,
          localClock,
          remoteClock
        )

        const maxClock = Math.max(localClock, remoteClock)
        await updateLamportClock(documentId, maxClock)

        if (localDoc) {
          await saveLocalDoc({ ...localDoc, content: merged, syncedAt: now })
        }

        await saveSyncMeta({
          documentId,
          lastSyncedClock: maxClock + 1,
          lastSyncedAt: now,
          syncedContent: merged,
        })

        onSyncComplete(merged, now)
      } else {
        const localDoc = await getLocalDoc(documentId)
        const localContent = localDoc?.content ?? EMPTY_DOC

        await saveSyncMeta({
          ...meta,
          lastSyncedAt: now,
          syncedContent: localContent,
        })

        onSyncComplete(localContent, now)
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
