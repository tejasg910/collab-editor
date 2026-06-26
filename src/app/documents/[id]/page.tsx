import { DocumentView } from "@/modules/documents/ui/views/DocumentView"

interface Props {
  params: Promise<{ id: string }>
}

export default async function DocumentPage({ params }: Props) {
  const { id } = await params
  return <DocumentView documentId={id} />
}
