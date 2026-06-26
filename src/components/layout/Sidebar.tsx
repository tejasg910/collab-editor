"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogOut, Menu, FileText } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SyncOrb } from "@/modules/sync/ui/components/SyncOrb"
import { authClient } from "@/lib/auth-client"
import type { DocumentWithMeta } from "@/modules/documents/types/document.types"

interface SidebarProps {
  userName: string
  userEmail: string
  documents: DocumentWithMeta[]
  children?: React.ReactNode
}

function SidebarContent({
  userName,
  userEmail,
  documents,
  children,
  onNavigate,
}: SidebarProps & { onNavigate?: () => void }) {
  const router = useRouter()
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  async function handleSignOut() {
    await authClient.signOut()
    router.push("/login")
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Logo */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-white/[0.06] shrink-0">
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2">
          <span className="font-podium text-lg tracking-wider uppercase text-white leading-none">
            Collab<span className="text-red-500">·</span>Editor
          </span>
        </Link>
        <SyncOrb />
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-0.5">
        <p className="text-white/40 text-[9px] px-2 mb-2 tracking-[0.2em] uppercase font-inter font-medium">
          Documents
        </p>
        {documents.length === 0 && (
          <p className="text-white/50 text-xs px-2 py-1 font-inter">No documents yet</p>
        )}
        {documents.map((doc) => (
          <Link
            key={doc.id}
            href={`/documents/${doc.id}`}
            onClick={onNavigate}
            className="flex items-center gap-2 px-2 py-1.5 text-white/55 hover:text-white hover:bg-white/[0.04] transition-colors text-sm group font-inter"
          >
            <FileText className="w-3.5 h-3.5 shrink-0 opacity-60 group-hover:opacity-100 group-hover:text-red-400 transition-colors" />
            <span className="truncate">{doc.title}</span>
          </Link>
        ))}
      </div>

      {/* Create button slot */}
      <div className="px-3 pb-3">{children}</div>

      {/* User footer */}
      <div className="border-t border-white/[0.06] p-3 shrink-0">
        <div className="flex items-center gap-2.5 group">
          <Avatar className="w-7 h-7 shrink-0">
            <AvatarFallback className="bg-red-950/40 text-red-400 text-xs font-medium border border-red-500/20">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate leading-tight font-inter">{userName}</p>
            <p className="text-white/50 text-[11px] truncate leading-tight font-inter">{userEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="text-white/40 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function Sidebar(props: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-56 xl:w-60 shrink-0 h-screen sticky top-0 border-r border-white/[0.06] flex-col">
        <SidebarContent {...props} />
      </aside>

      {/* Mobile: top bar + sheet */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-[#0a0a0a] border-b border-white/[0.06] flex items-center justify-between px-4">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger className="text-white/40 hover:text-white transition-colors">
            <Menu className="w-5 h-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-[#0a0a0a] border-white/[0.06] [&>button]:hidden">
            <SidebarContent {...props} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <Link href="/dashboard" className="flex items-center">
          <span className="font-podium text-lg tracking-wider uppercase text-white leading-none">
            Collab<span className="text-red-500">·</span>Editor
          </span>
        </Link>

        <SyncOrb />
      </div>
    </>
  )
}
