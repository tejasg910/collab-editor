import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import {
  listMembers,
  inviteMember,
  removeMember,
} from "@/modules/documents/server/services/document.service"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    const members = await listMembers(id, session.user.id)
    return NextResponse.json({ members })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed"
    return NextResponse.json({ error: msg }, { status: msg.includes("permission") ? 403 : 500 })
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  let body: { email: string; role: "editor" | "viewer" }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 })
  if (!["editor", "viewer"].includes(body.role))
    return NextResponse.json({ error: "Role must be editor or viewer" }, { status: 400 })

  try {
    const member = await inviteMember(id, session.user.id, email, body.role)
    return NextResponse.json({ member })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed"
    const status = msg.includes("owner") ? 403 : msg.includes("No account") ? 404 : msg.includes("already") ? 409 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  let body: { userId: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  try {
    await removeMember(id, session.user.id, body.userId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed"
    return NextResponse.json({ error: msg }, { status: msg.includes("owner") ? 403 : 500 })
  }
}
