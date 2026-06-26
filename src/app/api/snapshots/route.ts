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

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: { documentId: string; content: unknown; label?: string; atLamportClock: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { documentId, content, label, atLamportClock } = body
  if (!documentId || !content) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  // Payload size guard
  if (JSON.stringify(content).length > 512 * 1024) {
    return NextResponse.json({ error: "Content too large" }, { status: 400 })
  }

  try {
    const snapshot = await createSnapshot(
      session.user.id,
      documentId,
      content as never,
      label ?? null,
      atLamportClock ?? 0
    )
    return NextResponse.json({ snapshot })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed"
    return NextResponse.json({ error: msg }, { status: msg.includes("permission") ? 403 : 500 })
  }
}
