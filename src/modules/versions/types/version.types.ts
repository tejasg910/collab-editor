import type { JSONContent } from "@tiptap/react"

export type Snapshot = {
  id: string
  documentId: string
  createdBy: string
  content: JSONContent
  label: string | null
  atLamportClock: number
  createdAt: Date | string
}
