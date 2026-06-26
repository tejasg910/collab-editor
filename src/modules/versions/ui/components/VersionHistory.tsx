"use client"

import { useEffect, useState, startTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, RotateCcw, Clock } from "lucide-react"
import type { Snapshot } from "@/modules/versions/types/version.types"
import type { JSONContent } from "@tiptap/react"

interface VersionHistoryProps {
  open: boolean
  onClose: () => void
  documentId: string
  onRestore: (content: JSONContent) => void
}

function timeAgo(date: Date | string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function VersionHistory({ open, onClose, documentId, onRestore }: VersionHistoryProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    startTransition(() => setLoading(true))
    fetch(`/api/snapshots?documentId=${documentId}`)
      .then((r) => r.json())
      .then(({ snapshots }) => setSnapshots(snapshots ?? []))
      .catch(() => setSnapshots([]))
      .finally(() => setLoading(false))
  }, [open, documentId])

  async function handleRestore(snapshot: Snapshot) {
    setRestoringId(snapshot.id)
    try {
      const res = await fetch(`/api/snapshots/${snapshot.id}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      })
      if (!res.ok) throw new Error()
      const { content } = await res.json()
      onRestore(content)
      onClose()
    } catch {
      // restore failed silently — could add toast here
    } finally {
      setRestoringId(null)
      setConfirmId(null)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop (click to close) */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-30"
            onClick={onClose}
          />

          {/* Panel slides in from right */}
          <motion.div
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-72 z-40 bg-[#0d0d0d] border-l border-white/[0.08] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-white/50" />
                <h2 className="text-sm font-semibold text-white font-inter">Version history</h2>
              </div>
              <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-signal"
                    animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                </div>
              ) : snapshots.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-white/60 font-inter">No saved versions yet.</p>
                  <p className="text-xs text-white/40 font-inter mt-1">Use &ldquo;Save version&rdquo; to checkpoint your work.</p>
                </div>
              ) : (
                <ul className="divide-y divide-white/[0.06]">
                  {snapshots.map((snap, i) => (
                    <motion.li
                      key={snap.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white truncate font-inter">
                            {snap.label ?? `Version ${snapshots.length - i}`}
                          </p>
                          <p className="text-xs text-white/45 mt-0.5 font-inter">
                            {timeAgo(snap.createdAt)}
                          </p>
                        </div>

                        {/* Restore — confirm on first click */}
                        {confirmId === snap.id ? (
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => setConfirmId(null)}
                              className="text-xs text-white/40 hover:text-white px-2 py-1 transition-colors font-inter"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleRestore(snap)}
                              disabled={restoringId === snap.id}
                              className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2 py-1 transition-colors disabled:opacity-50 font-inter"
                            >
                              {restoringId === snap.id ? "…" : "Confirm"}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmId(snap.id)}
                            className="shrink-0 text-white/40 hover:text-white transition-colors p-1 hover:bg-white/[0.05]"
                            title="Restore this version"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
