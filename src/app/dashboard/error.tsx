"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="flex h-screen bg-ink items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="w-10 h-10 rounded-full bg-raised flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-amber" />
        </div>
        <div>
          <p className="text-parchment font-medium">Failed to load dashboard</p>
          <p className="text-muted-foreground text-sm mt-1">{error.message}</p>
        </div>
        <Button onClick={reset} className="bg-signal hover:bg-signal/90 text-white">
          Try again
        </Button>
      </div>
    </div>
  )
}
