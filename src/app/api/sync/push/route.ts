import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { pushOps, type IncomingOp } from "@/modules/sync/server/services/sync.service"

// Hard ceiling on raw body before any JSON parsing — blocks OOM from oversized payloads.
// 100 ops × 512 KB/op = 51.2 MB theoretical max, but we reject far below that.
const MAX_BODY_BYTES = 5 * 1024 * 1024 // 5 MB
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Read raw bytes FIRST — reject before JSON.parse allocates memory for the whole body
  let rawBody: string
  try {
    const buffer = await req.arrayBuffer()
    if (buffer.byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large (max 5 MB)" }, { status: 413 })
    }
    rawBody = new TextDecoder().decode(buffer)
  } catch {
    return NextResponse.json({ error: "Failed to read request body" }, { status: 400 })
  }

  let body: { documentId: unknown; ops: unknown }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { documentId, ops } = body

  if (typeof documentId !== "string" || !UUID_RE.test(documentId)) {
    return NextResponse.json({ error: "Invalid or missing documentId" }, { status: 400 })
  }

  if (!Array.isArray(ops)) {
    return NextResponse.json({ error: "ops must be an array" }, { status: 400 })
  }

  if (ops.length > 100) {
    return NextResponse.json({ error: "Too many ops (max 100)" }, { status: 400 })
  }

  // Validate each op's shape before passing downstream
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]
    if (!op || typeof op !== "object" || Array.isArray(op)) {
      return NextResponse.json({ error: `ops[${i}] must be an object` }, { status: 400 })
    }
    if (
      typeof (op as IncomingOp).lamportClock !== "number" ||
      !Number.isInteger((op as IncomingOp).lamportClock) ||
      (op as IncomingOp).lamportClock < 0
    ) {
      return NextResponse.json({ error: `ops[${i}].lamportClock must be a non-negative integer` }, { status: 400 })
    }
    const content = (op as IncomingOp).content
    if (!content || typeof content !== "object" || Array.isArray(content)) {
      return NextResponse.json({ error: `ops[${i}].content must be an object` }, { status: 400 })
    }
    if ((content as { type?: unknown }).type !== "doc") {
      return NextResponse.json({ error: `ops[${i}].content must be a ProseMirror doc node` }, { status: 400 })
    }
  }

  try {
    const result = await pushOps(session.user.id, documentId, ops as IncomingOp[])
    return NextResponse.json({ ok: true, synced: result.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Push failed"
    const status = message === "No write permission" ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
