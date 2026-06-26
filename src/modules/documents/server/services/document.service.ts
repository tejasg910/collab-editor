import { db } from "@/lib/db"
import { documents, documentMembers, users } from "@/lib/db/schema"
import { and, eq, sql } from "drizzle-orm"
import type { DocumentWithMeta, MemberWithUser } from "@/modules/documents/types/document.types"

export async function getDocumentsForUser(userId: string): Promise<DocumentWithMeta[]> {
  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      ownerId: documents.ownerId,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
      role: documentMembers.role,
      collaboratorCount: sql<number>`(
        SELECT COUNT(*) FROM document_members dm2
        WHERE dm2.document_id = ${documents.id}
      )::int`,
    })
    .from(documents)
    .innerJoin(documentMembers, eq(documentMembers.documentId, documents.id))
    .where(eq(documentMembers.userId, userId))
    .orderBy(documents.updatedAt)

  return rows as DocumentWithMeta[]
}

export async function getDocumentById(documentId: string, userId: string) {
  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      ownerId: documents.ownerId,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
      role: documentMembers.role,
    })
    .from(documents)
    .innerJoin(documentMembers, eq(documentMembers.documentId, documents.id))
    .where(eq(documentMembers.userId, userId))
    .limit(1)

  return rows[0] ?? null
}

export async function createDocument(userId: string, title: string) {
  const [doc] = await db
    .insert(documents)
    .values({ title, ownerId: userId })
    .returning()

  await db.insert(documentMembers).values({
    documentId: doc.id,
    userId,
    role: "owner",
  })

  return doc
}

export async function deleteDocument(documentId: string, userId: string) {
  const member = await db.query.documentMembers.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.documentId, documentId), eq(t.userId, userId)),
  })

  if (!member || member.role !== "owner") {
    throw new Error("Only the owner can delete this document")
  }

  await db.delete(documents).where(eq(documents.id, documentId))
}

export async function listMembers(
  documentId: string,
  userId: string
): Promise<MemberWithUser[]> {
  const caller = await db.query.documentMembers.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.documentId, documentId), eq(t.userId, userId)),
  })
  if (!caller) throw new Error("No permission")

  const rows = await db
    .select({
      id: documentMembers.id,
      userId: documentMembers.userId,
      name: users.name,
      email: users.email,
      role: documentMembers.role,
      invitedAt: documentMembers.invitedAt,
    })
    .from(documentMembers)
    .innerJoin(users, eq(users.id, documentMembers.userId))
    .where(eq(documentMembers.documentId, documentId))
    .orderBy(documentMembers.invitedAt)

  return rows as MemberWithUser[]
}

export async function inviteMember(
  documentId: string,
  ownerUserId: string,
  inviteeEmail: string,
  role: "editor" | "viewer"
): Promise<MemberWithUser> {
  const caller = await db.query.documentMembers.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.documentId, documentId), eq(t.userId, ownerUserId)),
  })
  if (!caller || caller.role !== "owner")
    throw new Error("Only the owner can invite members")

  const invitee = await db.query.users.findFirst({
    where: (t, { eq }) => eq(t.email, inviteeEmail),
  })
  if (!invitee) throw new Error("No account found with that email")

  const existing = await db.query.documentMembers.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.documentId, documentId), eq(t.userId, invitee.id)),
  })
  if (existing) throw new Error("That user already has access")

  const [member] = await db
    .insert(documentMembers)
    .values({ documentId, userId: invitee.id, role })
    .returning()

  return {
    id: member.id,
    userId: invitee.id,
    name: invitee.name,
    email: invitee.email,
    role: member.role as "editor" | "viewer",
    invitedAt: member.invitedAt,
  }
}

export async function removeMember(
  documentId: string,
  ownerUserId: string,
  targetUserId: string
): Promise<void> {
  const caller = await db.query.documentMembers.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.documentId, documentId), eq(t.userId, ownerUserId)),
  })
  if (!caller || caller.role !== "owner")
    throw new Error("Only the owner can remove members")

  if (targetUserId === ownerUserId)
    throw new Error("Cannot remove the document owner")

  await db
    .delete(documentMembers)
    .where(
      and(
        eq(documentMembers.documentId, documentId),
        eq(documentMembers.userId, targetUserId)
      )
    )
}

export async function updateDocumentTitle(
  documentId: string,
  userId: string,
  title: string
) {
  const member = await db.query.documentMembers.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.documentId, documentId), eq(t.userId, userId)),
  })

  if (!member || member.role === "viewer") {
    throw new Error("No permission to edit this document")
  }

  const [doc] = await db
    .update(documents)
    .set({ title, updatedAt: new Date() })
    .where(eq(documents.id, documentId))
    .returning()

  return doc
}
