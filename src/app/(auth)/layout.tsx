import type { ReactNode } from "react"
import Link from "next/link"
import { Wifi, Clock, Shield } from "lucide-react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black flex font-inter">

      {/* ── Left panel — brand (hidden on mobile) ─────────────────── */}
      <div className="hidden lg:flex w-[480px] xl:w-[520px] shrink-0 flex-col justify-between p-12 relative overflow-hidden border-r border-white/[0.06]">
        {/* Red glow top-left */}
        <div
          className="absolute top-0 left-0 w-96 h-96 pointer-events-none"
          style={{ background: "radial-gradient(circle at 0% 0%, rgba(220,38,38,0.18) 0%, transparent 65%)" }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Top: brand */}
        <div className="relative">
          <Link href="/">
            <span className="font-podium text-3xl tracking-wider uppercase text-white leading-none">
              Collab<span className="text-red-500">·</span>Editor
            </span>
          </Link>
        </div>

        {/* Middle: big tagline */}
        <div className="relative">
          <p className="font-podium text-6xl xl:text-7xl uppercase leading-[0.9] tracking-tight text-white mb-6">
            Write.<br />
            Sync.<br />
            <span className="text-red-500">Conquer.</span>
          </p>
          <p className="font-inter text-sm text-white/40 leading-relaxed max-w-xs">
            A local-first document editor. Works offline, syncs deterministically, built for teams.
          </p>
        </div>

        {/* Bottom: 3 feature bullets */}
        <div className="relative space-y-4">
          {[
            { icon: Wifi,     label: "Offline-capable",       sub: "IndexedDB keeps work safe" },
            { icon: Clock,    label: "Version history",        sub: "Snapshot & restore any point" },
            { icon: Shield,   label: "Role-based access",      sub: "Owner · Editor · Viewer" },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-8 h-8 border border-white/10 flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-red-400" />
              </div>
              <div>
                <p className="text-white text-xs font-medium font-inter">{label}</p>
                <p className="text-white/30 text-[11px] font-inter">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — form ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative">
        {/* Red glow top-center */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-64 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.10) 0%, transparent 70%)" }}
        />

        {/* Mobile brand (shown only on small screens) */}
        <div className="lg:hidden mb-10 self-start">
          <Link href="/">
            <span className="font-podium text-2xl tracking-wider uppercase text-white">
              Collab<span className="text-red-500">·</span>Editor
            </span>
          </Link>
        </div>

        {/* Form container */}
        <div className="relative w-full max-w-sm">
          {children}
        </div>

        <p className="absolute bottom-6 text-center text-[10px] text-white/15 tracking-widest uppercase font-inter">
          Local-First · Offline-Capable · Real-Time Sync
        </p>
      </div>
    </div>
  )
}
