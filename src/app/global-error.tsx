"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  // global-error replaces root layout — must include <html> and <body>
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          backgroundColor: "#0D0D0D",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#E9E4DB",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 360, padding: "0 16px" }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⚠</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>
            Application error
          </h2>
          <p style={{ margin: "0 0 24px", color: "#A0A0A8", fontSize: 14 }}>
            {error.message || "A critical error occurred."}
          </p>
          <button
            onClick={reset}
            style={{
              padding: "10px 20px",
              background: "#3B82F6",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
