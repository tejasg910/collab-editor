"use client"

import { useActionState, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { FileText, Trash2, Users, Share2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { deleteDocumentAction } from "@/modules/documents/server/actions/document.actions"
import { ShareDialog } from "@/modules/documents/ui/components/ShareDialog"
import type { DocumentWithMeta } from "@/modules/documents/types/document.types"

const ROLE_STYLES: Record<string, string> = {
  owner:  "bg-red-500/10 text-red-400 border-red-500/20",
  editor: "bg-green-500/10 text-green-400 border-green-500/20",
  viewer: "bg-white/5 text-white/40 border-white/10",
}

function timeAgo(date: Date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function DocumentCard({
  doc,
  index = 0,
}: {
  doc: DocumentWithMeta
  index?: number
}) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(deleteDocumentAction, {})
  const [shareOpen, setShareOpen] = useState(false)

  return (
    <motion.div
      layoutId={`doc-${doc.id}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 28,
        delay: index * 0.04,
      }}
      whileHover={{ y: -2, borderColor: "rgba(220,38,38,0.5)" }}
      className="group relative bg-[#0f0f0f] border border-white/[0.06] overflow-hidden cursor-pointer transition-colors"
      onClick={() => !shareOpen && router.push(`/documents/${doc.id}`)}
    >
      {/* Left red accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-red-500/0 group-hover:bg-red-500/70 transition-all duration-300" />

      {/* Top thin red line always visible */}
      <div className="h-px w-full bg-gradient-to-r from-red-500/40 via-red-500/20 to-transparent" />

      <div className="p-4 flex flex-col gap-3 pl-5">
        {/* Icon + title row */}
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 border border-white/15 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-red-500/40 transition-colors">
            <FileText className="w-3.5 h-3.5 text-white/50 group-hover:text-red-400 transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-inter font-medium text-sm leading-snug line-clamp-2">
              {doc.title}
            </p>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge
              className={`text-[10px] px-1.5 py-0 h-4 border font-inter font-medium rounded-none ${ROLE_STYLES[doc.role]}`}
            >
              {doc.role}
            </Badge>
            {doc.collaboratorCount > 1 && (
              <div className="flex items-center gap-1 text-white/50">
                <Users className="w-3 h-3" />
                <span className="text-[11px] tabular-nums font-inter">
                  {doc.collaboratorCount}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] text-white/40 font-inter">
              {timeAgo(doc.updatedAt)}
            </span>

            {doc.role === "owner" && (
              <div
                className="flex items-center gap-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setShareOpen(true)}
                  className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-red-400 hover:bg-red-500/10"
                  title="Share"
                >
                  <Share2 className="w-3 h-3" />
                </Button>
                <form action={formAction}>
                  <input type="hidden" name="documentId" value={doc.id} />
                  <Button
                    type="submit"
                    size="icon"
                    variant="ghost"
                    disabled={pending}
                    className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity text-white/30 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>

        {state.error && (
          <p className="text-[11px] text-destructive">{state.error}</p>
        )}
      </div>

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        documentId={doc.id}
      />
    </motion.div>
  )
}
