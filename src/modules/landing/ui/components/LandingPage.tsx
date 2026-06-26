"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowUpRight, Award, Crown, X, Wifi, WifiOff, CheckCircle2, Clock, Users, Shield, Zap, ArrowRight } from "lucide-react"

const NAV_LINKS = ["Features", "How it works", "Pricing", "About"]

const STATS = [
  { value: "100%", label: "Offline Ready" },
  { value: "0ms", label: "Local Latency" },
  { value: "∞", label: "Version History" },
]

// ── Scroll reveal hook ─────────────────────────────────────────────────────────
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

// ── Reveal wrapper ─────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(36px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

// ── Offline sync animation ─────────────────────────────────────────────────────
function SyncLoop() {
  const [phase, setPhase] = useState<"offline" | "syncing" | "synced">("offline")
  useEffect(() => {
    const cycle = () => {
      setPhase("offline")
      setTimeout(() => setPhase("syncing"), 1800)
      setTimeout(() => setPhase("synced"), 3400)
      setTimeout(() => cycle(), 5200)
    }
    cycle()
  }, [])
  const map = {
    offline: { icon: <WifiOff className="w-4 h-4 text-red-400" />, label: "Offline — saving locally", color: "text-red-400 border-red-400/30" },
    syncing: { icon: <Wifi className="w-4 h-4 text-yellow-400 animate-pulse" />, label: "Reconnected — syncing…", color: "text-yellow-400 border-yellow-400/30" },
    synced:  { icon: <CheckCircle2 className="w-4 h-4 text-green-400" />, label: "All changes synced", color: "text-green-400 border-green-400/30" },
  }
  const { icon, label, color } = map[phase]
  return (
    <div className={`inline-flex items-center gap-2.5 border rounded-full px-4 py-2 text-sm font-inter transition-all duration-500 ${color}`}>
      {icon}
      <span>{label}</span>
    </div>
  )
}

// ── Feature card ───────────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, body, delay }: { icon: React.ElementType; title: string; body: string; delay: number }) {
  const { ref, inView } = useInView()
  return (
    <div
      ref={ref}
      className="border border-white/10 p-6 lg:p-8 group hover:border-red-500/40 transition-all duration-300 bg-white/[0.02] hover:bg-red-950/10"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(40px)",
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s, border-color 0.3s, background 0.3s`,
      }}
    >
      <div className="w-10 h-10 border border-red-500/30 flex items-center justify-center mb-5 group-hover:border-red-500 group-hover:bg-red-500/10 transition-all duration-300">
        <Icon className="w-4.5 h-4.5 text-red-400" />
      </div>
      <h3 className="font-podium text-xl lg:text-2xl tracking-wide uppercase text-white mb-3">{title}</h3>
      <p className="font-inter text-sm text-white/50 leading-relaxed">{body}</p>
    </div>
  )
}

// ── Step ───────────────────────────────────────────────────────────────────────
function Step({ num, title, body, delay }: { num: string; title: string; body: string; delay: number }) {
  const { ref, inView } = useInView()
  return (
    <div
      ref={ref}
      className="flex gap-5 lg:gap-7"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateX(0)" : "translateX(-32px)",
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
      }}
    >
      <div className="shrink-0 font-podium text-5xl lg:text-6xl leading-none text-red-500/30 select-none">{num}</div>
      <div className="pt-1.5">
        <h4 className="font-podium text-xl lg:text-2xl uppercase tracking-wide text-white mb-2">{title}</h4>
        <p className="font-inter text-sm text-white/50 leading-relaxed">{body}</p>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", handler)
    return () => window.removeEventListener("scroll", handler)
  }, [])

  return (
    <div className="bg-black text-white font-inter overflow-x-hidden">

      {/* ── Fixed nav ───────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 lg:px-16 py-5 lg:py-6 transition-all duration-300 ${
          scrolled ? "bg-black/90 backdrop-blur-md border-b border-white/10" : "bg-transparent"
        }`}
      >
        <span className="font-podium text-2xl sm:text-3xl tracking-wider uppercase text-white">
          Collab<span className="text-red-500">·</span>Editor
        </span>

        <nav className="hidden md:flex items-center gap-8 lg:gap-10">
          {NAV_LINKS.map((link) => (
            <a key={link} href="#" className="font-inter text-sm text-white/60 tracking-widest uppercase hover:text-white transition-colors">
              {link}
            </a>
          ))}
        </nav>

        <Link
          href="/register"
          className="hidden md:flex items-center gap-2 border border-white/25 hover:border-red-500/70 px-5 py-2.5 text-xs tracking-widest uppercase text-white hover:bg-red-500/10 transition-all duration-200"
        >
          Get Started <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>

        <button className="md:hidden flex flex-col space-y-1.5" onClick={() => setMenuOpen(true)} aria-label="Open menu">
          <div className="w-6 h-0.5 bg-white" />
          <div className="w-6 h-0.5 bg-white" />
          <div className="w-4 h-0.5 bg-white" />
        </button>
      </header>

      {/* ── Mobile menu ─────────────────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-50 bg-black backdrop-blur-sm transition-all duration-500 ${
          menuOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <span className="font-podium text-2xl tracking-wider uppercase text-white">
            Collab<span className="text-red-500">·</span>Editor
          </span>
          <button onClick={() => setMenuOpen(false)} className="text-white/60 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center h-[calc(100%-80px)] gap-6">
          {NAV_LINKS.map((link, i) => (
            <a
              key={link}
              href="#"
              onClick={() => setMenuOpen(false)}
              className="font-podium text-4xl sm:text-5xl text-white uppercase tracking-wider hover:text-red-400"
              style={{
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? "translateY(0)" : "translateY(20px)",
                transition: `opacity 0.4s ease ${i * 80 + 100}ms, transform 0.4s ease ${i * 80 + 100}ms, color 0.2s`,
              }}
            >
              {link}
            </a>
          ))}
          <Link
            href="/register"
            onClick={() => setMenuOpen(false)}
            className="mt-6 border border-white/30 hover:border-red-500 px-8 py-4 text-sm tracking-widest uppercase hover:bg-red-500/10 transition-all"
            style={{
              opacity: menuOpen ? 1 : 0,
              transform: menuOpen ? "translateY(0)" : "translateY(20px)",
              transition: `opacity 0.4s ease ${NAV_LINKS.length * 80 + 100}ms, transform 0.4s ease ${NAV_LINKS.length * 80 + 100}ms`,
            }}
          >
            Get Started →
          </Link>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── HERO (full viewport) ───────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="relative h-screen flex flex-col">
        {/* Video */}
        <video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover z-0">
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260606_154941_df1a96e1-a06f-450c-bd02-d863414cc1a0.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/75 via-black/40 to-black/85" />
        <div className="absolute inset-0 z-[1] bg-red-950/15" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center flex-1 px-6 sm:px-10 lg:px-16 pt-24">
          {/* Tagline */}
          <div className="flex items-center gap-2.5 mb-6 lg:mb-8 animate-fade-up">
            <Crown className="w-4 h-4 text-red-400" />
            <span className="font-inter text-xs sm:text-sm text-white/60 tracking-[0.3em] uppercase">
              Local-First Document Platform
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-podium uppercase leading-[0.92] tracking-tight animate-fade-up-d1"
            style={{ fontSize: "clamp(3rem, 10vw, 8.5rem)" }}
          >
            <span className="block text-white">Write.</span>
            <span className="block text-white">Sync.</span>
            <span className="block text-red-500">Conquer.</span>
          </h1>

          {/* Sub */}
          <p className="font-inter text-sm sm:text-base text-white/55 leading-relaxed max-w-md mt-6 lg:mt-8 animate-fade-up-d2">
            A document editor that keeps your work safe — online or offline.
            <br className="hidden sm:block" />
            Changes merge deterministically.{" "}
            <span className="text-white font-semibold">Your data, always.</span>
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-8 lg:mt-10 animate-fade-up-d3">
            <Link
              href="/register"
              className="group flex items-center gap-2 bg-red-600 hover:bg-red-500 px-5 sm:px-7 py-3 sm:py-4 text-[11px] sm:text-xs tracking-widest uppercase text-white transition-colors duration-200"
            >
              Start Writing Free
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>

            <div className="hidden sm:flex items-center gap-3">
              <Award className="w-7 h-7 text-white/35" />
              <div>
                <p className="text-white/40 text-[9px] tracking-widest uppercase">Offline-Ready</p>
                <p className="text-white/40 text-[9px] tracking-widest uppercase">Document Studio</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-6 sm:gap-12 lg:gap-16 mt-8 sm:mt-10 lg:mt-12 animate-fade-up-d4">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <p className="font-inter text-white text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight">{value}</p>
                <p className="text-white/35 text-[9px] sm:text-xs tracking-widest uppercase mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="relative z-10 flex justify-center pb-8 animate-fade-in">
          <div className="flex flex-col items-center gap-2">
            <span className="font-inter text-[9px] tracking-[0.3em] uppercase text-white/30">Scroll</span>
            <div className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── FEATURES ──────────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="bg-[#080808] border-t border-white/10 py-24 lg:py-32 px-6 sm:px-10 lg:px-16">
        <div className="max-w-6xl mx-auto">
          <Reveal className="mb-16 lg:mb-20">
            <p className="font-inter text-xs tracking-[0.3em] uppercase text-red-500 mb-4">Everything you need</p>
            <h2
              className="font-podium uppercase leading-[0.9] text-white"
              style={{ fontSize: "clamp(2.5rem, 6vw, 5.5rem)" }}
            >
              Built for teams
              <br />
              <span className="text-white/25">who can&apos;t afford</span>
              <br />
              to lose work.
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10">
            <FeatureCard
              icon={Wifi}
              title="Offline First"
              body="Every keystroke hits IndexedDB instantly. The network is optional. Work anywhere, anytime — the server catches up when you reconnect."
              delay={0}
            />
            <FeatureCard
              icon={Users}
              title="Real-Time Collaboration"
              body="Invite teammates as editors or viewers. Roles enforced server-side. Viewers can never push changes. Share by email, revoke any time."
              delay={0.1}
            />
            <FeatureCard
              icon={Clock}
              title="Version History"
              body="Snapshot your document at any moment with a custom label. Restore any past version without corrupting the live document for others."
              delay={0.2}
            />
            <FeatureCard
              icon={Shield}
              title="Role-Based Access"
              body="Owner, Editor, Viewer. Three roles, no ambiguity. Owners control membership. Editors write. Viewers read. Clean and enforceable."
              delay={0.3}
            />
            <FeatureCard
              icon={Zap}
              title="Deterministic Sync"
              body="Conflicts resolved by Lamport clock — a logical counter, not a timestamp. Same inputs always produce the same merged result. No surprises."
              delay={0.4}
            />
            <FeatureCard
              icon={CheckCircle2}
              title="Payload Validation"
              body="Every sync operation is validated server-side with a 512KB guard. Malformed or oversized payloads are rejected before they reach the database."
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="bg-black border-t border-white/10 py-24 lg:py-32 px-6 sm:px-10 lg:px-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left */}
          <div>
            <Reveal>
              <p className="font-inter text-xs tracking-[0.3em] uppercase text-red-500 mb-4">How it works</p>
              <h2
                className="font-podium uppercase leading-[0.9] text-white mb-8"
                style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)" }}
              >
                The internet
                <br />
                goes down.
                <br />
                <span className="text-white/25">Your work doesn&apos;t.</span>
              </h2>
            </Reveal>
            <Reveal delay={0.15}>
              <SyncLoop />
            </Reveal>
          </div>

          {/* Right — steps */}
          <div className="space-y-10">
            <Step num="01" title="You type" body="Keystroke saved to IndexedDB in the browser. Zero latency. No server required. Works on a plane, in a tunnel, anywhere." delay={0} />
            <Step num="02" title="Network drops" body="App keeps working. All changes queue locally in an unsynced ops log. The cursor never freezes, the document never breaks." delay={0.1} />
            <Step num="03" title="You reconnect" body="Pending ops push to the server. Remote changes pull back. No manual intervention needed — it just works." delay={0.2} />
            <Step num="04" title="Merge" body="Lamport clocks order all ops deterministically. Higher clock wins. Equal clocks tie-break by userId. Same result every time, everywhere." delay={0.3} />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── QUOTE BREAK ───────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="bg-red-600 py-16 lg:py-20 px-6 sm:px-10 lg:px-16">
        <Reveal>
          <div className="max-w-4xl mx-auto text-center">
            <p
              className="font-podium uppercase leading-[0.95] text-white"
              style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}
            >
              "Your documents survive every outage, every conflict, every teammate."
            </p>
          </div>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── CTA ───────────────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="bg-[#080808] border-t border-white/10 py-28 lg:py-36 px-6 sm:px-10 lg:px-16 text-center">
        <Reveal>
          <p className="font-inter text-xs tracking-[0.3em] uppercase text-red-500 mb-5">Start today</p>
          <h2
            className="font-podium uppercase leading-[0.92] text-white mb-8"
            style={{ fontSize: "clamp(3rem, 8vw, 7rem)" }}
          >
            Ready to write
            <br />
            <span className="text-red-500">without limits?</span>
          </h2>
          <p className="font-inter text-white/50 text-base max-w-md mx-auto mb-10 leading-relaxed">
            Free to start. Works offline immediately. Your documents stay yours — always.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="group flex items-center gap-2 bg-red-600 hover:bg-red-500 px-8 py-4 text-sm tracking-widest uppercase text-white transition-colors"
            >
              Create Your First Document
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="font-inter text-sm text-white/40 hover:text-white/70 tracking-widest uppercase transition-colors"
            >
              Already have an account →
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── FOOTER ────────────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <footer className="bg-black border-t border-white/10 px-6 sm:px-10 lg:px-16 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="font-podium text-xl tracking-wider uppercase text-white">
              Collab<span className="text-red-500">·</span>Editor
            </span>
            <span className="text-white/20 text-sm">·</span>
            <span className="font-inter text-xs text-white/30 tracking-wider uppercase">Built by Tejas · House of Edtech</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com/tejasg910" target="_blank" rel="noopener noreferrer"
              className="font-inter text-xs text-white/30 hover:text-white/60 tracking-widest uppercase transition-colors">
              GitHub
            </a>
            <a href="https://linkedin.com/in/tejas-giri" target="_blank" rel="noopener noreferrer"
              className="font-inter text-xs text-white/30 hover:text-white/60 tracking-widest uppercase transition-colors">
              LinkedIn
            </a>
            <Link href="/login" className="font-inter text-xs text-white/30 hover:text-white/60 tracking-widest uppercase transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
