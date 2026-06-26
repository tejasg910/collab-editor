"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { JSONContent } from "@tiptap/react"
import {
  getLocalDoc,
  saveLocalDoc,
  appendOp,
  nextLamportClock,
  getSyncMeta,
} from "@/lib/db/local"
import type { LocalDocument } from "@/modules/editor/types/editor.types"

const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
}

type UseDocumentReturn = {
  doc: LocalDocument | null
  loading: boolean
  fromCache: boolean
  lamportClock: number
  updateContent: (content: JSONContent, userId: string) => Promise<void>
  updateTitle: (title: string) => Promise<void>
  setDocContent: (content: JSONContent) => void
}

export function useDocument(docId: string, serverTitle?: string): UseDocumentReturn {
  const [doc, setDoc] = useState<LocalDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [fromCache, setFromCache] = useState(false)
  const [lamportClock, setLamportClock] = useState(0)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load from IndexedDB on mount
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const existing = await getLocalDoc(docId)
        if (cancelled) return

        if (existing) {
          setFromCache(true)
          setDoc(existing)
          const meta = await getSyncMeta(docId)
          if (!cancelled) setLamportClock(meta.lastSyncedClock)
        } else {
          // First time opening this doc — seed from server title
          const fresh: LocalDocument = {
            id: docId,
            title: serverTitle ?? "Untitled",
            content: EMPTY_DOC,
            updatedAt: Date.now(),
            syncedAt: 0,
          }
          await saveLocalDoc(fresh)
          setDoc(fresh)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [docId, serverTitle])

  // Debounced content save + op append
  const updateContent = useCallback(
    async (content: JSONContent, userId: string) => {
      if (!doc) return

      const updated: LocalDocument = {
        ...doc,
        content,
        updatedAt: Date.now(),
      }

      setDoc(updated)

      // Debounce IDB write 300ms — avoids thrashing on every keystroke
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        await saveLocalDoc(updated)

        // Append op to pending queue
        const clock = await nextLamportClock(docId)
        setLamportClock(clock)
        await appendOp({
          documentId: docId,
          userId,
          content,
          lamportClock: clock,
          timestamp: Date.now(),
        })
      }, 300)
    },
    [doc, docId]
  )

  const updateTitle = useCallback(
    async (title: string) => {
      if (!doc) return
      const updated: LocalDocument = { ...doc, title, updatedAt: Date.now() }
      setDoc(updated)
      await saveLocalDoc(updated)
    },
    [doc]
  )

  // Called by sync engine after pulling remote content
  const setDocContent = useCallback(
    (content: JSONContent) => {
      setDoc((prev) => prev ? { ...prev, content, syncedAt: Date.now() } : prev)
    },
    []
  )

  return { doc, loading, fromCache, lamportClock, updateContent, updateTitle, setDocContent }
}
