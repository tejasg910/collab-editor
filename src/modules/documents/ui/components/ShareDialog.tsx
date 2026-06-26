"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, UserPlus, Loader2, Crown, Pencil, Eye } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import type { MemberWithUser } from "@/modules/documents/types/document.types"

interface ShareDialogProps {
  open: boolean
  onClose: () => void
  documentId: string
}

const ROLE_CONFIG = {
  owner:  { label: "Owner",  Icon: Crown,  className: "text-red-400" },
  editor: { label: "Editor", Icon: Pencil, className: "text-green-400" },
  viewer: { label: "Viewer", Icon: Eye,    className: "text-white/40" },
} as const

export function ShareDialog({ open, onClose, documentId }: ShareDialogProps) {
  const [members, setMembers] = useState<MemberWithUser[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"editor" | "viewer">("editor")
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setLoadingMembers(true)
    fetch(`/api/documents/${documentId}/members`)
      .then((r) => r.json())
      .then(({ members }) => setMembers(members ?? []))
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false))
  }, [open, documentId])

  async function handleInvite() {
    if (!email.trim()) return
    setInviting(true)
    setInviteError(null)
    try {
      const res = await fetch(`/api/documents/${documentId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMembers((prev) => [...prev, data.member])
      setEmail("")
      emailRef.current?.focus()
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to invite")
    } finally {
      setInviting(false)
    }
  }

  async function handleRemove(userId: string) {
    setRemovingId(userId)
    try {
      await fetch(`/api/documents/${documentId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      setMembers((prev) => prev.filter((m) => m.userId !== userId))
    } finally {
      setRemovingId(null)
    }
  }

  function handleClose() {
    if (inviting) return
    setEmail("")
    setInviteError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent
        showCloseButton={false}
        className="bg-[#0f0f0f] border border-white/10 rounded-none p-0 gap-0 ring-0 max-w-md sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Red top accent line */}
        <div className="h-px w-full bg-gradient-to-r from-red-500/60 via-red-500/30 to-transparent shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <DialogTitle className="text-white font-inter font-medium text-sm tracking-wide">
            Share document
          </DialogTitle>
          <button
            onClick={handleClose}
            className="text-white/30 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Invite form */}
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <p className="text-[11px] text-white/40 font-inter uppercase tracking-widest mb-3">
            Invite by email
          </p>
          <div className="flex gap-2">
            <input
              ref={emailRef}
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              disabled={inviting}
              className="flex-1 min-w-0 bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-red-500 px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none transition-colors disabled:opacity-50 font-inter"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
              disabled={inviting}
              className="bg-[#0f0f0f] border border-white/10 hover:border-white/20 focus:border-red-500 px-2 py-2 text-sm text-white outline-none transition-colors disabled:opacity-50 cursor-pointer font-inter"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={handleInvite}
              disabled={inviting || !email.trim()}
              className="shrink-0 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white px-3 py-2 transition-colors flex items-center gap-1.5"
            >
              {inviting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UserPlus className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <AnimatePresence>
            {inviteError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-red-400 mt-2 font-inter"
              >
                {inviteError}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Members list */}
        <div className="max-h-64 overflow-y-auto px-5 py-3">
          <p className="text-[11px] text-white/40 font-inter uppercase tracking-widest mb-3">
            People with access
          </p>

          {loadingMembers ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-white/30" />
            </div>
          ) : (
            <ul className="space-y-1">
              {members.map((member, i) => {
                const cfg = ROLE_CONFIG[member.role]
                return (
                  <motion.li
                    key={member.userId}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 py-2 px-1 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="w-7 h-7 bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-medium text-white/60 font-inter">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate font-inter">
                        {member.name}
                      </p>
                      <p className="text-[11px] text-white/40 truncate font-inter">
                        {member.email}
                      </p>
                    </div>

                    <div className={`flex items-center gap-1 shrink-0 ${cfg.className}`}>
                      <cfg.Icon className="w-3 h-3" />
                      <span className="text-[11px] font-medium font-inter">{cfg.label}</span>
                    </div>

                    {member.role !== "owner" && (
                      <button
                        onClick={() => handleRemove(member.userId)}
                        disabled={removingId === member.userId}
                        className="shrink-0 text-white/30 hover:text-red-400 transition-colors p-1 hover:bg-red-400/10 disabled:opacity-40"
                        title="Remove access"
                      >
                        {removingId === member.userId ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </motion.li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="h-2 shrink-0" />
      </DialogContent>
    </Dialog>
  )
}
