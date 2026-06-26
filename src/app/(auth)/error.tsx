"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function AuthError({
  error,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-parchment font-semibold">Auth error</h2>
        <p className="text-muted-foreground text-sm">
          {error.message || "Could not complete authentication."}
        </p>
      </div>
      <Link
        href="/login"
        className="text-sm text-signal underline underline-offset-4"
      >
        Back to login
      </Link>
    </div>
  )
}
