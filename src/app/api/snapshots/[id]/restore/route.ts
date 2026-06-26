import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { restoreSnapshot } from "@/modules/versions/server/services/snapshot.service"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  let body: { documentId: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.documentId) {
    return NextResponse.json({ error: "Missing documentId" }, { status: 400 })
  }

  try {
    const result = await restoreSnapshot(session.user.id, body.documentId, id)
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed"
    const status = msg.includes("permission") ? 403 : msg.includes("not found") ? 404 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
