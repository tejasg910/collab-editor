"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Check } from "lucide-react"
import type { JSONContent } from "@tiptap/react"

interface SaveVersionTrayProps {
  open: boolean
  onClose: () => void
  documentId: string
  content: JSONContent
  atLamportClock: number
  onSaved: () => void
}

export function SaveVersionTray({
  open,
  onClose,
  documentId,
  content,
  atLamportClock,
  onSaved,
}: SaveVersionTrayProps) {
  const [label, setLabel] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, content, label: label.trim() || null, atLamportClock }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }

      // Show success state briefly, then close
      setSaved(true)
      onSaved()
      setTimeout(() => {
        setSaved(false)
        setLabel("")
        onClose()
      }, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save version")
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    if (saving) return
    setLabel("")
    setError(null)
    setSaved(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={handleClose}
          />

          {/* Tray */}
          <motion.div
            key="tray"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d0d0d] border-t border-white/[0.08] p-6 max-w-lg mx-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold text-sm font-inter">Save version</h2>
              <button onClick={handleClose} disabled={saving} className="text-white/40 hover:text-white transition-colors disabled:opacity-40">
                <X className="w-4 h-4" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {saved ? (
                /* ── Success state ── */
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="flex flex-col items-center gap-3 py-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.05 }}
                    className="w-12 h-12 rounded-full bg-confirmed/20 flex items-center justify-center"
                  >
                    <Check className="w-5 h-5 text-confirmed" />
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-sm font-medium text-white font-inter"
                  >
                    Version saved
                  </motion.p>
                  {label.trim() && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-xs text-white/50 font-inter"
                    >
                      &ldquo;{label.trim()}&rdquo;
                    </motion.p>
                  )}
                </motion.div>
              ) : (
                /* ── Form state ── */
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <input
                    type="text"
                    placeholder="Label (optional) — e.g. Before redesign"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSave()}
                    autoFocus
                    maxLength={80}
                    className="w-full bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-red-500 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition-colors mb-4 font-inter"
                  />

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-red-400 mb-3"
                    >
                      {error}
                    </motion.p>
                  )}

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-3 text-sm font-medium transition-colors relative overflow-hidden font-inter tracking-wide"
                  >
                    <AnimatePresence mode="wait">
                      {saving ? (
                        <motion.span
                          key="saving"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="flex items-center justify-center gap-2"
                        >
                          <motion.span
                            className="w-1 h-1 rounded-full bg-white/60"
                            animate={{ scale: [1, 1.5, 1] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                          />
                          <motion.span
                            className="w-1 h-1 rounded-full bg-white/60"
                            animate={{ scale: [1, 1.5, 1] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }}
                          />
                          <motion.span
                            className="w-1 h-1 rounded-full bg-white/60"
                            animate={{ scale: [1, 1.5, 1] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: 0.3 }}
                          />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="idle"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                        >
                          Save version
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
