import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getDocumentsForUser } from "@/modules/documents/server/services/document.service"
import { DocumentCard } from "@/modules/documents/ui/components/DocumentCard"
import { CreateDocumentDialog } from "@/modules/documents/ui/components/CreateDocumentDialog"
import { Sidebar } from "@/components/layout/Sidebar"
import { FileText } from "lucide-react"

export async function DashboardView() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const documents = await getDocumentsForUser(session.user.id)

  return (
    <div className="flex h-screen bg-ink overflow-hidden">
      <Sidebar
        userName={session.user.name}
        userEmail={session.user.email}
        documents={documents}
      >
        <CreateDocumentDialog />
      </Sidebar>

      {/* Main content — offset top on mobile for fixed header */}
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="px-6 py-8 lg:px-10 lg:py-10 max-w-5xl">

          {/* Page header */}
          <div className="mb-8">
            <h1 className="font-podium text-4xl uppercase tracking-wider text-white leading-none">
              My <span className="text-red-500">Documents</span>
            </h1>
            <p className="text-white/40 text-sm mt-2 font-inter">
              {documents.length === 0
                ? "Create your first document to get started."
                : `${documents.length} document${documents.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {documents.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {documents.map((doc, i) => (
                <DocumentCard key={doc.id} doc={doc} index={i} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-5 text-center">
      <div className="w-16 h-16 bg-[#111111] border border-white/10 flex items-center justify-center">
        <FileText className="w-7 h-7 text-white/40" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-white font-medium font-inter">No documents yet</p>
        <p className="text-white/50 text-sm font-inter">
          Hit &ldquo;New document&rdquo; in the sidebar to start writing.
        </p>
      </div>
    </div>
  )
}
