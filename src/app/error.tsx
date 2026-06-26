"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="flex flex-col items-center gap-6 max-w-sm text-center"
      >
        <div className="w-12 h-12 rounded-full bg-raised flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-amber" />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-parchment font-semibold text-lg">
            Something went wrong
          </h2>
          <p className="text-muted-foreground text-sm">
            {error.message || "An unexpected error occurred."}
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground/50 font-mono">
              {error.digest}
            </p>
          )}
        </div>

        <Button
          onClick={reset}
          className="bg-signal hover:bg-signal/90 text-white"
        >
          Try again
        </Button>
      </motion.div>
    </div>
  )
}
