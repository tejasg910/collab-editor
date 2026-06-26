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
  role: "owner" | "editor" | "viewer"
  onSyncStart: () => void
  onSyncComplete: (mergedContent: JSONContent, lastSyncedAt: number) => void
  onSyncError: () => void
}

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] }

export function useSyncEngine({
  documentId,
  role,
  onSyncStart,
  onSyncComplete,
  onSyncError,
}: SyncEngineOptions) {
  const isOnline = useOnlineStatus()
  const syncingRef = useRef(false)

  // Store callbacks in refs so `sync` never needs them as deps.
  // Inline props change every render — putting them in deps makes `sync`
  // unstable, which resets the 30s interval on every render.
  const onSyncStartRef = useRef(onSyncStart)
  const onSyncCompleteRef = useRef(onSyncComplete)
  const onSyncErrorRef = useRef(onSyncError)
  useEffect(() => { onSyncStartRef.current = onSyncStart }, [onSyncStart])
  useEffect(() => { onSyncCompleteRef.current = onSyncComplete }, [onSyncComplete])
  useEffect(() => { onSyncErrorRef.current = onSyncError }, [onSyncError])

  const isOnlineRef = useRef(isOnline)
  useEffect(() => { isOnlineRef.current = isOnline }, [isOnline])

  const sync = useCallback(async () => {
    // Never attempt network work while offline
    if (!isOnlineRef.current) return
    if (syncingRef.current) return
    syncingRef.current = true
    onSyncStartRef.current()

    try {
      // ── 1. PUSH ──────────────────────────────────────────────────
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

      // ── 2. PULL ──────────────────────────────────────────────────
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
        // ── 3. THREE-WAY MERGE ───────────────────────────────────
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

        onSyncCompleteRef.current(merged, now)
      } else {
        const localDoc = await getLocalDoc(documentId)
        const localContent = localDoc?.content ?? EMPTY_DOC

        await saveSyncMeta({
          ...meta,
          lastSyncedAt: now,
          syncedContent: localContent,
        })

        onSyncCompleteRef.current(localContent, now)
      }
    } catch {
      onSyncErrorRef.current()
    } finally {
      syncingRef.current = false
    }
  }, [documentId, role]) // stable — callbacks and isOnline read via refs

  // Sync immediately when coming back online (not on every render)
  useEffect(() => {
    if (isOnline) sync()
  }, [isOnline, sync])

  // Periodic sync every 30s — stable because `sync` is now stable
  useEffect(() => {
    if (!isOnline) return
    const id = setInterval(sync, 30_000)
    return () => clearInterval(id)
  }, [isOnline, sync])

  return { sync, isOnline }
}
