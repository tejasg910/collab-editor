import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { createSnapshot, listSnapshots } from "@/modules/versions/server/services/snapshot.service"

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const documentId = new URL(req.url).searchParams.get("documentId")
  if (!documentId) return NextResponse.json({ error: "Missing documentId" }, { status: 400 })

  try {
    const snapshots = await listSnapshots(session.user.id, documentId)
    return NextResponse.json({ snapshots })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 })
  }
}

const MAX_SNAPSHOT_BYTES = 1 * 1024 * 1024 // 1 MB — a single doc snapshot, not a batch
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let rawBody: string
  try {
    const buffer = await req.arrayBuffer()
    if (buffer.byteLength > MAX_SNAPSHOT_BYTES) {
      return NextResponse.json({ error: "Payload too large (max 1 MB)" }, { status: 413 })
    }
    rawBody = new TextDecoder().decode(buffer)
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 })
  }

  let body: { documentId: unknown; content: unknown; label?: unknown; atLamportClock?: unknown }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { documentId, content, label, atLamportClock } = body

  if (typeof documentId !== "string" || !UUID_RE.test(documentId)) {
    return NextResponse.json({ error: "Invalid or missing documentId" }, { status: 400 })
  }
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return NextResponse.json({ error: "content must be an object" }, { status: 400 })
  }

  try {
    const snapshot = await createSnapshot(
      session.user.id,
      documentId as string,
      content as never,
      typeof label === "string" ? label : null,
      typeof atLamportClock === "number" ? atLamportClock : 0
    )
    return NextResponse.json({ snapshot })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed"
    return NextResponse.json({ error: msg }, { status: msg.includes("permission") ? 403 : 500 })
  }
}
