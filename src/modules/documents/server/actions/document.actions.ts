"use server"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { withRLS } from "@/lib/db"
import {
  createDocument,
  deleteDocument,
  updateDocumentTitle,
} from "@/modules/documents/server/services/document.service"

export type DocumentFormState = { error?: string; success?: boolean }

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Unauthorized")
  await withRLS(session.user.id)
  return session
}

export async function createDocumentAction(
  _prev: DocumentFormState,
  formData: FormData
): Promise<DocumentFormState> {
  const title = (formData.get("title") as string)?.trim() || "Untitled"

  let docId: string
  try {
    const session = await getSession()
    const doc = await createDocument(session.user.id, title)
    docId = doc.id
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create document" }
  }

  redirect(`/documents/${docId}`)
}

export async function deleteDocumentAction(
  _prev: DocumentFormState,
  formData: FormData
): Promise<DocumentFormState> {
  const documentId = formData.get("documentId") as string

  try {
    const session = await getSession()
    await deleteDocument(documentId, session.user.id)
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete document" }
  }

  revalidatePath("/dashboard")
  return { success: true }
}

export async function updateDocumentTitleAction(
  _prev: DocumentFormState,
  formData: FormData
): Promise<DocumentFormState> {
  const documentId = formData.get("documentId") as string
  const title = (formData.get("title") as string)?.trim()

  if (!title) return { error: "Title cannot be empty" }

  try {
    const session = await getSession()
    await updateDocumentTitle(documentId, session.user.id, title)
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to update title" }
  }

  revalidatePath("/dashboard")
  revalidatePath(`/documents/${documentId}`)
  return {}
}
