import type { JSONContent } from "@tiptap/react"

export type { JSONContent }

export type LocalDocument = {
  id: string
  title: string
  content: JSONContent
  updatedAt: number
  syncedAt: number
}

export type PendingOp = {
  opId: string
  documentId: string
  userId: string
  content: JSONContent // full snapshot at this point
  lamportClock: number
  timestamp: number
  synced: boolean
}

export type SyncMeta = {
  documentId: string
  lastSyncedClock: number
  lastSyncedAt: number
  syncedContent?: JSONContent  // base snapshot for three-way merge
}
