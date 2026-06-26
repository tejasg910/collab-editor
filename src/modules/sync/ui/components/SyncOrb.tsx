"use client"

import { motion } from "framer-motion"
import { useOnlineStatus } from "@/modules/sync/ui/hooks/useOnlineStatus"

export function SyncOrb() {
  const online = useOnlineStatus()

  return (
    <motion.div
      title={online ? "Online" : "Offline"}
      animate={{
        backgroundColor: online ? "#3B82F6" : "#F59E0B",
        scale: online ? [1, 1.3, 1] : 1,
      }}
      transition={
        online
          ? { scale: { duration: 0.4, ease: "easeOut" } }
          : { duration: 0.3 }
      }
      className="w-2 h-2 rounded-full"
    />
  )
}
