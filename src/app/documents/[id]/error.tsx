"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function DocumentError({
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
        <p className="text-parchment font-medium">Failed to load document</p>
        <p className="text-muted-foreground text-sm">{error.message}</p>
        <div className="flex gap-3">
          <Button onClick={reset} className="bg-signal hover:bg-signal/90 text-white">
            Try again
          </Button>
          <Link href="/dashboard">
            <Button variant="ghost" className="text-muted-foreground">
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
