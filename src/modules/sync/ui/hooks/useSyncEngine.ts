"use client"

import { useEffect, useRef, useCallback } from "react"
import { useOnlineStatus } from "./useOnlineStatus"
import { getBrowserClient } from "@/lib/supabase"
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
import type { RefObject } from "react"

interface SyncEngineOptions {
  documentId: string
  role: "owner" | "editor" | "viewer"
  // Ref to the live editor content — updated on every keystroke in DocumentEditor.
  // Passed here so the merge uses what the user is currently seeing, not the
  // potentially-stale IDB snapshot (which lags behind by the 300ms debounce).
  liveContentRef: RefObject<JSONContent | null>
  onSyncStart: () => void
  onSyncComplete: (mergedContent: JSONContent, lastSyncedAt: number, conflictCount: number) => void
  onSyncError: () => void
}

const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] }

export function useSyncEngine({
  documentId,
  role,
  liveContentRef,
  onSyncStart,
  onSyncComplete,
  onSyncError,
}: SyncEngineOptions) {
  const isOnline = useOnlineStatus()
  const syncingRef = useRef(false)

  const onSyncStartRef = useRef(onSyncStart)
  const onSyncCompleteRef = useRef(onSyncComplete)
  const onSyncErrorRef = useRef(onSyncError)
  useEffect(() => { onSyncStartRef.current = onSyncStart }, [onSyncStart])
  useEffect(() => { onSyncCompleteRef.current = onSyncComplete }, [onSyncComplete])
  useEffect(() => { onSyncErrorRef.current = onSyncError }, [onSyncError])

  const isOnlineRef = useRef(isOnline)
  useEffect(() => { isOnlineRef.current = isOnline }, [isOnline])

  const sync = useCallback(async () => {
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

      // Use live editor content as "local" — this is what the user currently
      // sees, including any keystrokes not yet flushed to IDB by the debounce.
      const localDoc = await getLocalDoc(documentId)
      // meta.syncedContent = last agreed state, updated after every sync cycle.
      // Prefer it over localDoc.content which can be stale (EMPTY_DOC) because
      // setDocContent only updates React state, not IDB documents store.
      const localContent = liveContentRef.current ?? meta.syncedContent ?? localDoc?.content ?? EMPTY_DOC

      if (remoteOps.length > 0) {
        // ── 3. THREE-WAY MERGE ───────────────────────────────────
        const remoteWinner = pickWinner(remoteOps)
        const remoteClock  = remoteWinner.lamportClock
        const base = meta.syncedContent ?? EMPTY_DOC

        const { content: merged, conflictCount } = threeWayMerge(
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

        // Update in-memory ref immediately — do not wait for the React chain
        // (setDocContent → doc.content → useEffect → editor.setContent → onUpdate).
        // If a Supabase notification fires in that window, the next sync() must
        // see the merged content as "local", not the stale pre-merge content.
        liveContentRef.current = merged

        // Auto-save a snapshot when conflicts were auto-resolved so the user
        // can open version history and recover either side
        if (conflictCount > 0 && role !== "viewer") {
          fetch("/api/snapshots", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              documentId,
              content: merged,
              label: `Auto-resolved: ${conflictCount} conflict${conflictCount !== 1 ? "s" : ""}`,
              atLamportClock: maxClock + 1,
            }),
          }).catch(() => {}) // fire-and-forget — not critical
        }

        onSyncCompleteRef.current(merged, now, conflictCount)
      } else {
        // No remote changes — local is already correct, just update meta
        if (localDoc) {
          await saveLocalDoc({ ...localDoc, content: localContent, syncedAt: now })
        }
        await saveSyncMeta({
          ...meta,
          lastSyncedAt: now,
          syncedContent: localContent,
        })
        liveContentRef.current = localContent
        onSyncCompleteRef.current(localContent, now, 0)
      }
    } catch {
      onSyncErrorRef.current()
    } finally {
      syncingRef.current = false
    }
  }, [documentId, role, liveContentRef])

  // Sync when coming back online (covers the offline-then-reconnect case)
  useEffect(() => {
    if (isOnline) sync()
  }, [isOnline, sync])

  // Real-time: subscribe to Supabase postgres_changes on sync_operations.
  // When another user pushes an op for this document, Supabase notifies all
  // subscribed clients instantly — no polling, no SSE endpoint needed.
  useEffect(() => {
    if (!isOnline) return

    const supabase = getBrowserClient()
    const channel = supabase
      .channel(`doc-${documentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sync_operations",
          filter: `document_id=eq.${documentId}`,
        },
        () => sync()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [documentId, isOnline, sync])

  return { sync, isOnline }
}
