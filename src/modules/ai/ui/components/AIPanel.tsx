"use client"

import { useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, X, Loader2, CornerDownLeft, Replace } from "lucide-react"
import type { Editor } from "@tiptap/react"

interface AIPanelProps {
  open: boolean
  onClose: () => void
  editor: Editor | null
}

const ACTIONS = [
  { id: "improve",   label: "Improve"   },
  { id: "grammar",   label: "Fix Grammar" },
  { id: "continue",  label: "Continue"  },
  { id: "summarize", label: "Summarize" },
  { id: "shorten",   label: "Shorten"   },
  { id: "expand",    label: "Expand"    },
] as const

type ActionId = typeof ACTIONS[number]["id"]

function getEditorText(editor: Editor) {
  return editor.getText()
}

function getSelection(editor: Editor): { text: string; hasSelection: boolean } {
  const { from, to, empty } = editor.state.selection
  if (empty) return { text: "", hasSelection: false }
  return {
    text: editor.state.doc.textBetween(from, to, "\n"),
    hasSelection: true,
  }
}

export function AIPanel({ open, onClose, editor }: AIPanelProps) {
  const [action, setAction] = useState<ActionId>("improve")
  const [result, setResult] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasResult, setHasResult] = useState(false)

  const run = useCallback(async (selectedAction: ActionId) => {
    if (!editor) return
    setAction(selectedAction)
    setResult("")
    setError(null)
    setHasResult(false)
    setLoading(true)

    const { text: selection, hasSelection } = getSelection(editor)
    const content = getEditorText(editor)

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: selectedAction,
          content,
          selection: hasSelection ? selection : undefined,
        }),
      })

      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || "AI request failed")
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk
        setResult(accumulated)
      }

      setHasResult(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [editor])

  function insertAtCursor() {
    if (!editor || !result) return
    editor.chain().focus().insertContentAt(editor.state.selection.anchor, result).run()
    dismiss()
  }

  function replaceSelection() {
    if (!editor || !result) return
    const { hasSelection } = getSelection(editor)
    if (hasSelection) {
      editor.chain().focus().insertContent(result).run()
    } else {
      editor.chain().focus().selectAll().insertContent(result).run()
    }
    dismiss()
  }

  function dismiss() {
    setResult("")
    setError(null)
    setHasResult(false)
    setLoading(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="ai-panel"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          className="overflow-hidden border-b border-white/[0.06] bg-[#0a0a0a]"
        >
          <div className="px-4 py-3 flex flex-col gap-3">
            {/* Header + action row */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-red-400 shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-xs font-inter font-medium tracking-wide uppercase">AI</span>
              </div>

              <div className="h-3.5 w-px bg-white/10 shrink-0" />

              {/* Action buttons */}
              <div className="flex items-center gap-1 flex-wrap">
                {ACTIONS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => run(a.id)}
                    disabled={loading}
                    className={`px-2.5 py-1 text-[11px] font-inter transition-colors disabled:opacity-40 ${
                      action === a.id && (loading || hasResult)
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : "text-white/50 hover:text-white border border-white/10 hover:border-white/20"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              <button
                onClick={dismiss}
                className="ml-auto text-white/30 hover:text-white transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Output area */}
            <AnimatePresence>
              {(loading || result || error) && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-2"
                >
                  {/* Result text */}
                  <div className="bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 max-h-48 overflow-y-auto">
                    {loading && !result && (
                      <div className="flex items-center gap-2 text-white/40">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="text-xs font-inter">Generating…</span>
                      </div>
                    )}
                    {result && (
                      <p className="text-sm text-white/80 font-inter leading-relaxed whitespace-pre-wrap">
                        {result}
                        {loading && (
                          <span className="inline-block w-0.5 h-4 bg-red-400 ml-0.5 animate-pulse align-text-bottom" />
                        )}
                      </p>
                    )}
                    {error && (
                      <p className="text-xs text-red-400 font-inter">{error}</p>
                    )}
                  </div>

                  {/* Insert actions — only after complete */}
                  {hasResult && !loading && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2"
                    >
                      <button
                        onClick={insertAtCursor}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-inter transition-colors"
                      >
                        <CornerDownLeft className="w-3 h-3" />
                        Insert at cursor
                      </button>
                      <button
                        onClick={replaceSelection}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 hover:border-white/20 text-white/60 hover:text-white text-xs font-inter transition-colors"
                      >
                        <Replace className="w-3 h-3" />
                        Replace
                      </button>
                      <button
                        onClick={() => { setResult(""); setHasResult(false) }}
                        className="text-white/30 hover:text-white text-xs font-inter transition-colors ml-auto"
                      >
                        Discard
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
