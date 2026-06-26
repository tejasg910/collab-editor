import { db, withRLS } from "@/lib/db"
import { syncOperations } from "@/lib/db/schema"
import { eq, gt, and } from "drizzle-orm"
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

  return rows
}

export async function pullOps(
  userId: string,
  documentId: string,
  sinceClock: number
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
        gt(syncOperations.lamportClock, sinceClock)
      )
    )
    .orderBy(syncOperations.lamportClock)

  return ops
}
