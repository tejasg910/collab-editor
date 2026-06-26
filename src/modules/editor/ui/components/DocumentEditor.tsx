"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { motion } from "framer-motion"
import { useDocument } from "@/modules/documents/ui/hooks/useDocument"
import { useSyncEngine } from "@/modules/sync/ui/hooks/useSyncEngine"
import { SaveVersionTray } from "@/modules/versions/ui/components/SaveVersionTray"
import { VersionHistory } from "@/modules/versions/ui/components/VersionHistory"
import { AIPanel } from "@/modules/ai/ui/components/AIPanel"
import { Toolbar } from "./Toolbar"
import { Editor } from "./Editor"
import { StatusBar } from "@/modules/sync/ui/components/StatusBar"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import type { DocumentRole } from "@/modules/documents/types/document.types"
import type { JSONContent } from "@tiptap/react"


interface DocumentEditorProps {
  documentId: string
  userId: string
  serverTitle: string
  role: DocumentRole
}

export function DocumentEditor({
  documentId,
  userId,
  serverTitle,
  role,
}: DocumentEditorProps) {
  const editable = role !== "viewer"
  const { doc, loading, fromCache, lamportClock, updateContent, updateTitle, setDocContent } = useDocument(
    documentId,
    serverTitle
  )
  // Tracks whether the last doc.content change came from the editor itself.
  // If true, skip setContent in the sync effect — calling it would wipe the redo stack.
  const localChangeRef = useRef(false)
  // Ref so handleSyncComplete can access latest editor without being in deps
  const editorRef = useRef<ReturnType<typeof useEditor>>(null)

  const [syncing, setSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | undefined>()
  const [saveTrayOpen, setSaveTrayOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  // syncedOnce: true after first sync completes (needed for fresh docs with no IDB entry)
  const [syncedOnce, setSyncedOnce] = useState(false)
  // Offline fallback: if no sync within 3s, show whatever we have anyway
  const [syncTimedOut, setSyncTimedOut] = useState(false)

  useEffect(() => {
    if (loading || fromCache || syncedOnce) return
    const t = setTimeout(() => setSyncTimedOut(true), 3000)
    return () => clearTimeout(t)
  }, [loading, fromCache, syncedOnce])

  const handleSyncComplete = useCallback((merged: JSONContent, syncedAt: number) => {
    // Skip if editor already has this exact content — preserves undo stack
    const current = editorRef.current
    if (current) {
      const same = JSON.stringify(current.getJSON()) === JSON.stringify(merged)
      if (!same) setDocContent(merged)
    } else {
      setDocContent(merged)
    }
    setSyncing(false)
    setLastSyncedAt(syncedAt)
    setSyncedOnce(true)
  }, [setDocContent])

  useSyncEngine({
    documentId,
    userId,
    role,
    onSyncStart: () => setSyncing(true),
    onSyncComplete: handleSyncComplete,
    onSyncError: () => setSyncing(false),
  })

  const [titleEditing, setTitleEditing] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Start writing…" }),
    ],
    content: doc?.content ?? { type: "doc", content: [{ type: "paragraph" }] },
    editable,
    immediatelyRender: false,
    onUpdate({ editor }) {
      localChangeRef.current = true
      updateContent(editor.getJSON(), userId)
    },
  })

  // Keep ref in sync so handleSyncComplete always sees latest editor
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  // Push content into editor only when it changed from OUTSIDE (sync/load), not from typing.
  // Calling setContent from a local change would wipe ProseMirror's redo stack.
  useEffect(() => {
    if (!editor || !doc?.content) return
    if (localChangeRef.current) {
      localChangeRef.current = false
      return
    }
    const current = JSON.stringify(editor.getJSON())
    const incoming = JSON.stringify(doc.content)
    if (current !== incoming) {
      editor.commands.setContent(doc.content)
    }
  }, [doc?.content, editor])

  // Sync editable flag (role can change without remount)
  useEffect(() => {
    if (!editor) return
    editor.setEditable(editable)
  }, [editable, editor])

  // Show loader until:
  // - IDB read done AND
  // - Either: doc was in IDB (fromCache), first sync completed, or 3s offline fallback
  const isReady = !loading && (fromCache || syncedOnce || syncTimedOut)

  if (!isReady) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-red-500"
          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      </div>
    )
  }

  const currentLamportClock = lamportClock

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <Toolbar
          editor={editor}
          editable={editable}
          onSaveVersion={editable ? () => setSaveTrayOpen(true) : undefined}
          onShowHistory={() => setHistoryOpen(true)}
          onToggleAI={() => setAiOpen((o) => !o)}
          aiOpen={aiOpen}
        />

        {/* AI Panel — slides in below toolbar */}
        <AIPanel
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          editor={editor}
        />

        {/* Editor body */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-10 lg:px-8">
            {/* Title */}
            {titleEditing ? (
              <input
                ref={titleRef}
                defaultValue={doc?.title}
                onBlur={async (e) => {
                  setTitleEditing(false)
                  const val = e.target.value.trim()
                  if (val && val !== doc?.title) await updateTitle(val)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") {
                    e.currentTarget.blur()
                  }
                }}
                autoFocus
                className="w-full bg-transparent text-parchment text-3xl font-semibold font-[family-name:var(--font-display)] outline-none mb-8 border-b border-edge pb-2"
              />
            ) : (
              <h1
                onClick={() => editable && setTitleEditing(true)}
                className={`text-3xl font-semibold font-[family-name:var(--font-display)] text-parchment mb-8 leading-tight ${
                  editable
                    ? "cursor-text hover:opacity-80 transition-opacity"
                    : ""
                }`}
              >
                {doc?.title || "Untitled"}
              </h1>
            )}

            {/* Content */}
            <div className="font-[family-name:var(--font-editor)]">
              <Editor editor={editor} />
            </div>

            {role === "viewer" && (
              <div className="mt-6 text-xs text-white/50 border border-white/10 px-3 py-2 inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                View only
              </div>
            )}
          </div>
        </div>

        {/* Status bar */}
        <StatusBar syncing={syncing} lastSyncedAt={lastSyncedAt} />
      </div>

      {/* Version panels — outside flex column so they overlay */}
      <SaveVersionTray
        open={saveTrayOpen}
        onClose={() => setSaveTrayOpen(false)}
        documentId={documentId}
        content={doc?.content ?? { type: "doc", content: [] }}
        atLamportClock={currentLamportClock}
        onSaved={() => setHistoryOpen(false)}
      />
      <VersionHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        documentId={documentId}
        onRestore={(content) => {
          setDocContent(content)
          setHistoryOpen(false)
        }}
      />
    </ErrorBoundary>
  )
}
