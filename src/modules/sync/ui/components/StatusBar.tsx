"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Wifi, WifiOff, RefreshCw } from "lucide-react"

interface StatusBarProps {
  online: boolean
  syncing?: boolean
  lastSyncedAt?: number
  onSync?: () => void
}

export function StatusBar({ online, syncing = false, lastSyncedAt, onSync }: StatusBarProps) {
  // offline always wins — never show syncing/synced when disconnected
  const status = !online ? "offline" : syncing ? "syncing" : "online"

  const config = {
    online: {
      icon: <Wifi className="w-3 h-3" />,
      label: lastSyncedAt ? `Synced ${timeAgo(lastSyncedAt)}` : "Online",
      color: "text-confirmed",
      dot: "bg-confirmed",
    },
    syncing: {
      icon: <RefreshCw className="w-3 h-3 animate-spin" />,
      label: "Syncing…",
      color: "text-signal",
      dot: "bg-signal",
    },
    offline: {
      icon: <WifiOff className="w-3 h-3" />,
      label: "Offline — changes saved locally",
      color: "text-amber",
      dot: "bg-amber",
    },
  }[status]

  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.06] bg-[#0a0a0a]">
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2 }}
          transition={{ duration: 0.15 }}
          className={`flex items-center gap-1.5 text-xs ${config.color}`}
        >
          <motion.div
            className={`w-1.5 h-1.5 rounded-full ${config.dot}`}
            animate={syncing ? { scale: [1, 1.3, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1 }}
          />
          {config.icon}
          <span>{config.label}</span>
        </motion.div>
      </AnimatePresence>

      {onSync && online && (
        <button
          onClick={onSync}
          disabled={syncing}
          title="Sync now"
          className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
          <span>Sync</span>
        </button>
      )}
    </div>
  )
}

function timeAgo(ms: number) {
  const diff = Date.now() - ms
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}
