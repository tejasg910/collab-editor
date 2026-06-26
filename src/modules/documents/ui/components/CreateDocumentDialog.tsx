"use client"

import { useActionState, useState, useEffect, startTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createDocumentAction } from "@/modules/documents/server/actions/document.actions"

export function CreateDocumentDialog() {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(createDocumentAction, {})

  // close tray on success (redirect handles nav, but close if error)
  useEffect(() => {
    if (!pending && !state.error) startTransition(() => setOpen(false))
  }, [pending, state.error])

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="w-full bg-red-600 hover:bg-red-500 text-white gap-2 h-9 rounded-none font-inter text-xs tracking-widest uppercase"
      >
        <Plus className="w-4 h-4" />
        New document
      </Button>

      {/* Tray overlay — Family Values pattern: one action, origin-aware */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setOpen(false)}
            />

            <motion.div
              key="tray"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-sm"
            >
              <div className="bg-[#0f0f0f] border border-white/10 rounded-none p-6 flex flex-col gap-5 relative">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                <div className="flex items-center justify-between">
                  <h2 className="text-white font-semibold text-sm font-inter">
                    New document
                  </h2>
                  <button
                    onClick={() => setOpen(false)}
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form action={formAction} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="title"
                      className="text-white/60 text-xs tracking-widest uppercase font-inter"
                    >
                      Title
                    </Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="Untitled"
                      autoFocus
                      className="bg-white/[0.04] border-white/10 hover:border-white/20 focus-visible:border-red-500 focus-visible:ring-0 text-white placeholder:text-white/35 h-10 rounded-none font-inter"
                    />
                  </div>

                  {state.error && (
                    <p className="text-xs text-destructive">{state.error}</p>
                  )}

                  <Button
                    type="submit"
                    disabled={pending}
                    className="bg-red-600 hover:bg-red-500 text-white h-10 rounded-none font-inter text-xs tracking-widest uppercase"
                  >
                    {pending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Create"
                    )}
                  </Button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
