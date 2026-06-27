import { db, withRLS } from "@/lib/db"
import { syncOperations } from "@/lib/db/schema"
import { eq, and, not, sql } from "drizzle-orm"
import type { JSONContent } from "@tiptap/react"

// 512KB per op — blocks OOM attacks from oversized payloads
const MAX_OP_BYTES = 512 * 1024

export type IncomingOp = {
  content: JSONContent
  lamportClock: number
  timestamp: number
}

export async function pushOps(
  userId: string,
  documentId: string,
  ops: IncomingOp[]
) {
  await withRLS(userId)

  const member = await db.query.documentMembers.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.documentId, documentId), eq(t.userId, userId)),
  })

  if (!member || member.role === "viewer") {
    throw new Error("No write permission")
  }

  for (const op of ops) {
    const size = JSON.stringify(op.content).length
    if (size > MAX_OP_BYTES) {
      throw new Error(`Op exceeds ${MAX_OP_BYTES} byte limit`)
    }
  }

  if (ops.length === 0) return []

  const rows = await db
    .insert(syncOperations)
    .values(
      ops.map((op) => ({
        documentId,
        userId,
        content: op.content,
        lamportClock: op.lamportClock,
      }))
    )
    .returning({
      id: syncOperations.id,
      lamportClock: syncOperations.lamportClock,
    })

  // Notify all connected SSE clients for this document that new ops are available.
  await db.execute(sql`SELECT pg_notify('sync_ops', ${documentId})`)

  return rows
}

export async function pullOps(
  userId: string,
  documentId: string,
  sinceMs: number   // epoch ms of latest op already seen; 0 = fetch all
) {
  await withRLS(userId)

  const member = await db.query.documentMembers.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.documentId, documentId), eq(t.userId, userId)),
  })

  if (!member) throw new Error("No access")

  const ops = await db
    .select()
    .from(syncOperations)
    .where(
      and(
        eq(syncOperations.documentId, documentId),
        // Use server-generated createdAt as the cursor — client Lamport clocks
        // diverge across browsers and cannot be used reliably for "since" filtering.
        sinceMs > 0
          ? sql`${syncOperations.createdAt} > ${new Date(sinceMs).toISOString()}::timestamptz`
          : undefined,
        not(eq(syncOperations.userId, userId))
      )
    )
    .orderBy(syncOperations.createdAt)

  return ops
}
