import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { pullOps } from "@/modules/sync/server/services/sync.service"

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const documentId = searchParams.get("documentId")
  // sinceMs = epoch ms of latest op already pulled; 0 means fetch all
  const sinceMs = parseInt(searchParams.get("sinceMs") ?? "0", 10)

  if (!documentId) {
    return NextResponse.json({ error: "Missing documentId" }, { status: 400 })
  }

  try {
    const ops = await pullOps(session.user.id, documentId, sinceMs)
    return NextResponse.json({ ops })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pull failed"
    const status = message === "No access" ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
