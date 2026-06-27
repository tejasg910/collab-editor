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
import type { ConflictBlock } from "@/modules/sync/utils/mergeUtils"
import type { JSONContent } from "@tiptap/react"

interface SyncEngineOptions {
  documentId: string
  role: "owner" | "editor" | "viewer"
  // Must be true before sync runs — prevents syncing before IDB load completes.
  enabled: boolean
  onSyncStart: () => void
  onSyncComplete: (mergedContent: JSONContent, lastSyncedAt: number, conflicts: ConflictBlock[]) => void
  onSyncError: () => void
}

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] }

export function useSyncEngine({
  documentId,
  role,
  enabled,
  onSyncStart,
  onSyncComplete,
  onSyncError,
}: SyncEngineOptions) {
  const isOnline = useOnlineStatus()
  const syncingRef = useRef(false)
  // True when a sync was requested while another was in flight.
  // After the current sync finishes, we run one more to pick up any missed events.
  const pendingSyncRef = useRef(false)
  // Stable ref to always call the latest sync function (avoids stale closure in retry).
  const syncFnRef = useRef<() => Promise<void>>(async () => {})

  const onSyncStartRef = useRef(onSyncStart)
  const onSyncCompleteRef = useRef(onSyncComplete)
  const onSyncErrorRef = useRef(onSyncError)
  useEffect(() => { onSyncStartRef.current = onSyncStart }, [onSyncStart])
  useEffect(() => { onSyncCompleteRef.current = onSyncComplete }, [onSyncComplete])
  useEffect(() => { onSyncErrorRef.current = onSyncError }, [onSyncError])

  const isOnlineRef = useRef(isOnline)
  useEffect(() => { isOnlineRef.current = isOnline }, [isOnline])

  const enabledRef = useRef(enabled)
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  const sync = useCallback(async () => {
    if (!isOnlineRef.current) return
    if (!enabledRef.current) return
    if (syncingRef.current) {
      // Another sync is in flight — queue a retry so we don't drop this event.
      pendingSyncRef.current = true
      return
    }
    syncingRef.current = true
    onSyncStartRef.current()

    try {
      // ── 1. PUSH ──────────────────────────────────────────────────
      // Capture local op clock BEFORE push clears pending ops from IDB.
      // This is the true "how recent is local" value for the merge winner decision.
      const unsyncedOps = await getUnsyncedOps(documentId)
      const maxLocalOpClock = unsyncedOps.reduce((m, op) => Math.max(m, op.lamportClock), 0)

      if (role !== "viewer") {
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
      // localClock = max of sync base clock and highest local op clock.
      const localClock = Math.max(meta.lastSyncedClock, maxLocalOpClock)

      // Use server createdAt timestamp as pull cursor, NOT Lamport clock.
      // Lamport clocks diverge across clients (e.g., one at 57, other at 62)
      // causing each client to miss the other's ops. Server timestamps are
      // monotonically increasing and independent of any client's clock.
      const sinceMs = meta.lastSeenOpAt ?? 0

      const pullRes = await fetch(
        `/api/sync/pull?documentId=${documentId}&sinceMs=${sinceMs}`
      )
      if (!pullRes.ok) {
        const { error } = await pullRes.json()
        throw new Error(error ?? "Pull failed")
      }

      const { ops: remoteOps } = await pullRes.json()
      console.log(`[sync] pull sinceMs=${sinceMs} → ${remoteOps.length} remote ops`)
      const now = Date.now()

      // Advance the cursor past the latest createdAt we received.
      // +1ms ensures strict progression even when Postgres timestamps have sub-ms
      // precision (µs) — without it, same ops re-match on every pull.
      const maxSeenOpAt = remoteOps.length > 0
        ? Math.max(...(remoteOps as Array<{ createdAt: string }>).map(
            (op) => new Date(op.createdAt).getTime()
          )) + 1
        : sinceMs

      // IDB is the single source of truth for local content.
      const localDoc = await getLocalDoc(documentId)
      const localContent = localDoc?.content ?? EMPTY_DOC

      if (remoteOps.length > 0) {
        // ── 3. THREE-WAY MERGE ───────────────────────────────────
        const remoteWinner = pickWinner(remoteOps)
        const remoteClock  = remoteWinner.lamportClock
        // base = last agreed state between all clients
        const base = meta.syncedContent ?? EMPTY_DOC

        const { content: merged, conflicts } = threeWayMerge(
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
          lastSeenOpAt: maxSeenOpAt,
        })

        if (conflicts.length > 0 && role !== "viewer") {
          fetch("/api/snapshots", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              documentId,
              content: merged,
              label: `Auto-resolved: ${conflicts.length} conflict${conflicts.length !== 1 ? "s" : ""}`,
              atLamportClock: maxClock + 1,
            }),
          }).catch(() => {})
        }

        onSyncCompleteRef.current(merged, now, conflicts)
      } else {
        // No remote changes — persist local content and update sync clock.
        // Only advance syncedContent (the three-way merge base) when:
        //   (a) we actually pushed ops — server now has this state, so it's the new agreed base
        //   (b) base is not yet set — first sync, establish baseline
        // Advancing it on SSE-retry syncs (nothing pushed) would corrupt the base:
        // local edits would become invisible to the next merge → silent data loss.
        if (localDoc) {
          await saveLocalDoc({ ...localDoc, content: localContent, syncedAt: now })
        }
        const shouldAdvanceBase = unsyncedOps.length > 0 || !meta.syncedContent
        await saveSyncMeta({
          ...meta,
          lastSyncedAt: now,
          ...(shouldAdvanceBase ? { syncedContent: localContent } : {}),
          lastSeenOpAt: maxSeenOpAt,
        })
        onSyncCompleteRef.current(localContent, now, [])
      }
    } catch {
      onSyncErrorRef.current()
    } finally {
      syncingRef.current = false
      // A sync event arrived while we were busy — run one more cycle now.
      if (pendingSyncRef.current) {
        pendingSyncRef.current = false
        setTimeout(() => syncFnRef.current(), 0)
      }
    }
  }, [documentId, role])

  // Keep syncFnRef current so the retry closure always calls the latest version.
  useEffect(() => { syncFnRef.current = sync }, [sync])

  // Sync whenever we come online OR IDB finishes loading — whichever is last.
  useEffect(() => {
    if (isOnline && enabled) sync()
  }, [isOnline, enabled, sync])

  // Real-time: SSE stream receives pg_notify from the server after each push.
  // EventSource auto-reconnects on drop — no manual retry logic needed.
  useEffect(() => {
    if (!isOnline) return

    const es = new EventSource(`/api/sync/stream?documentId=${documentId}`)

    es.onopen = () => console.log("[SSE] connected", documentId)
    es.onerror = (e) => console.error("[SSE] error", e)

    es.onmessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data as string) as { type: string; reason?: string }
        console.log("[SSE] event", data)
        if (data.type === "update") sync()
        if (data.type === "error") console.error("[SSE] server error:", data.reason)
      } catch {
        // malformed event — ignore
      }
    }

    return () => es.close()
  }, [documentId, isOnline, sync])

  // Polling fallback: pull every 10s even when SSE is silent.
  // Guards against Neon pooler dropping LISTEN/NOTIFY or any SSE gap.
  useEffect(() => {
    if (!isOnline || !enabled) return
    const id = setInterval(() => syncFnRef.current(), 10_000)
    return () => clearInterval(id)
  }, [isOnline, enabled])

  return { sync, isOnline }
}
