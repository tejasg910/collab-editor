import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { documentMembers } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"
import postgres from "postgres"

// Node.js runtime required — LISTEN/NOTIFY needs a persistent TCP connection.
export const runtime = "nodejs"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const documentId = req.nextUrl.searchParams.get("documentId")
  if (!documentId || !UUID_RE.test(documentId)) {
    return NextResponse.json({ error: "Invalid documentId" }, { status: 400 })
  }

  const member = await db.query.documentMembers.findFirst({
    where: and(
      eq(documentMembers.documentId, documentId),
      eq(documentMembers.userId, session.user.id)
    ),
  })
  if (!member) return NextResponse.json({ error: "No access" }, { status: 403 })

  const encoder = new TextEncoder()
  let heartbeatId: ReturnType<typeof setInterval>

  // LISTEN/NOTIFY requires a direct (non-pooled) connection.
  // PgBouncer in transaction mode drops session-level commands like LISTEN.
  // Use DATABASE_URL_UNPOOLED if set (Neon provides this), else fall back to DATABASE_URL.
  // LISTEN/NOTIFY requires a direct (non-pooled) connection.
  // Supabase: use DIRECT_URL. Neon: use DATABASE_URL_UNPOOLED. Fallback: DATABASE_URL.
  const listenUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!
  const listenSql = postgres(listenUrl, {
    max: 1,
    idle_timeout: 0,
    connect_timeout: 10,
  })

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        } catch {
          // client already disconnected
        }
      }

      try {
        await listenSql.listen("sync_ops", (payload) => {
          if (payload !== documentId) return
          console.log(`[SSE] notify → doc ${documentId}`)
          send('{"type":"update"}')
        })
        console.log(`[SSE] LISTEN ready for doc ${documentId} user ${session.user.id}`)
      } catch (err) {
        console.error("[SSE] LISTEN failed:", err)
        send('{"type":"error","reason":"listen_failed"}')
        controller.close()
        listenSql.end({ timeout: 0 }).catch(() => {})
        return
      }

      send('{"type":"connected"}')

      // 25s heartbeat — keeps connection alive before Vercel's 30s idle timeout,
      // and also keeps the Neon compute from suspending.
      heartbeatId = setInterval(async () => {
        send('{"type":"ping"}')
        // Send a trivial query to keep Neon compute awake.
        try { await listenSql`SELECT 1` } catch { /* ignore */ }
      }, 25000)
    },

    cancel() {
      console.log(`[SSE] client disconnected doc ${documentId}`)
      clearInterval(heartbeatId)
      listenSql.end({ timeout: 0 }).catch(() => {})
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
