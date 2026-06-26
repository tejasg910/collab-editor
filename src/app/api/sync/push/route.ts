import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { pushOps, type IncomingOp } from "@/modules/sync/server/services/sync.service"

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { documentId: string; ops: IncomingOp[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { documentId, ops } = body

  if (!documentId || !Array.isArray(ops)) {
    return NextResponse.json({ error: "Missing documentId or ops" }, { status: 400 })
  }

  if (ops.length > 100) {
    return NextResponse.json({ error: "Too many ops (max 100)" }, { status: 400 })
  }

  try {
    const result = await pushOps(session.user.id, documentId, ops)
    return NextResponse.json({ ok: true, synced: result.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Push failed"
    const status = message === "No write permission" ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
