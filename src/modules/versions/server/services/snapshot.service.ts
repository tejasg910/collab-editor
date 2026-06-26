import { db, withRLS } from "@/lib/db"
import { documentSnapshots, documentMembers, syncOperations } from "@/lib/db/schema"
import { eq, desc, max } from "drizzle-orm"
import type { JSONContent } from "@tiptap/react"

export async function createSnapshot(
  userId: string,
  documentId: string,
  content: JSONContent,
  label: string | null,
  atLamportClock: number
) {
  await withRLS(userId)

  const member = await db.query.documentMembers.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.documentId, documentId), eq(t.userId, userId)),
  })

  if (!member || member.role === "viewer") {
    throw new Error("No permission to save versions")
  }

  const [snapshot] = await db
    .insert(documentSnapshots)
    .values({ documentId, createdBy: userId, content, label, atLamportClock })
    .returning()

  return snapshot
}

export async function listSnapshots(userId: string, documentId: string) {
  await withRLS(userId)

  const member = await db.query.documentMembers.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.documentId, documentId), eq(t.userId, userId)),
  })

  if (!member) throw new Error("No access")

  return db
    .select()
    .from(documentSnapshots)
    .where(eq(documentSnapshots.documentId, documentId))
    .orderBy(desc(documentSnapshots.createdAt))
}

export async function restoreSnapshot(
  userId: string,
  documentId: string,
  snapshotId: string
) {
  await withRLS(userId)

  const member = await db.query.documentMembers.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.documentId, documentId), eq(t.userId, userId)),
  })

  if (!member || member.role === "viewer") {
    throw new Error("No permission to restore versions")
  }

  const snapshot = await db.query.documentSnapshots.findFirst({
    where: (t, { eq }) => eq(t.id, snapshotId),
  })

  if (!snapshot || snapshot.documentId !== documentId) {
    throw new Error("Snapshot not found")
  }

  // Get current max lamport clock for this doc
  const [{ maxClock }] = await db
    .select({ maxClock: max(syncOperations.lamportClock) })
    .from(syncOperations)
    .where(eq(syncOperations.documentId, documentId))

  const newClock = (maxClock ?? 0) + 1

  // Restore = new sync op with snapshot content — preserves full history
  await db.insert(syncOperations).values({
    documentId,
    userId,
    content: snapshot.content,
    lamportClock: newClock,
  })

  return { content: snapshot.content, lamportClock: newClock }
}
