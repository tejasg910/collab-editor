import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect, notFound } from "next/navigation"
import { getDocumentById } from "@/modules/documents/server/services/document.service"
import { DocumentEditor } from "@/modules/editor/ui/components/DocumentEditor"
import { Sidebar } from "@/components/layout/Sidebar"
import { getDocumentsForUser } from "@/modules/documents/server/services/document.service"

interface DocumentViewProps {
  documentId: string
}

export async function DocumentView({ documentId }: DocumentViewProps) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const [doc, allDocs] = await Promise.all([
    getDocumentById(documentId, session.user.id),
    getDocumentsForUser(session.user.id),
  ])

  if (!doc) notFound()

  return (
    <div className="flex h-screen bg-ink overflow-hidden">
      <Sidebar
        userName={session.user.name}
        userEmail={session.user.email}
        documents={allDocs}
      />

      {/* Editor shell — client takes over from here */}
      <div className="flex-1 flex flex-col min-w-0 pt-14 lg:pt-0">
        <DocumentEditor
          documentId={documentId}
          userId={session.user.id}
          serverTitle={doc.title}
          role={doc.role}
        />
      </div>
    </div>
  )
}
