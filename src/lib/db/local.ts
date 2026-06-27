import { openDB, type IDBPDatabase } from "idb"
import type { LocalDocument, PendingOp, SyncMeta } from "@/modules/editor/types/editor.types"
import { v4 as uuidv4 } from "uuid"

const DB_NAME = "collab-editor"
const DB_VERSION = 1

type Schema = {
  documents: {
    key: string
    value: LocalDocument
  }
  pending_ops: {
    key: string
    value: PendingOp
    indexes: {
      "by-doc-synced": [string, boolean]
      "by-doc": string
    }
  }
  sync_meta: {
    key: string
    value: SyncMeta
  }
}

let _db: IDBPDatabase<Schema> | null = null

async function getDB(): Promise<IDBPDatabase<Schema>> {
  if (_db) return _db

  _db = await openDB<Schema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // documents store
      if (!db.objectStoreNames.contains("documents")) {
        db.createObjectStore("documents", { keyPath: "id" })
      }

      // pending_ops store
      if (!db.objectStoreNames.contains("pending_ops")) {
        const ops = db.createObjectStore("pending_ops", { keyPath: "opId" })
        ops.createIndex("by-doc-synced", ["documentId", "synced"])
        ops.createIndex("by-doc", "documentId")
      }

      // sync_meta store
      if (!db.objectStoreNames.contains("sync_meta")) {
        db.createObjectStore("sync_meta", { keyPath: "documentId" })
      }
    },
  })

  return _db
}

// ─── Documents ────────────────────────────────────────────────────

export async function getLocalDoc(docId: string): Promise<LocalDocument | undefined> {
  const db = await getDB()
  return db.get("documents", docId)
}

export async function saveLocalDoc(doc: LocalDocument): Promise<void> {
  const db = await getDB()
  await db.put("documents", doc)
}

export async function deleteLocalDoc(docId: string): Promise<void> {
  const db = await getDB()
  await db.delete("documents", docId)
}

// ─── Pending Ops ──────────────────────────────────────────────────

export async function appendOp(
  op: Omit<PendingOp, "opId" | "synced">
): Promise<PendingOp> {
  const db = await getDB()
  const full: PendingOp = { ...op, opId: uuidv4(), synced: false }
  await db.put("pending_ops", full)
  return full
}

export async function getUnsyncedOps(docId: string): Promise<PendingOp[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex("pending_ops", "by-doc", docId)
  return all.filter((op) => !op.synced)
}

export async function markOpsSynced(opIds: string[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction("pending_ops", "readwrite")
  await Promise.all(
    opIds.map(async (id) => {
      const op = await tx.store.get(id)
      if (op) await tx.store.put({ ...op, synced: true })
    })
  )
  await tx.done
}

export async function clearSyncedOps(docId: string): Promise<void> {
  const db = await getDB()
  const all = await db.getAllFromIndex("pending_ops", "by-doc", docId)
  const tx = db.transaction("pending_ops", "readwrite")
  await Promise.all(
    all.filter((op) => op.synced).map((op) => tx.store.delete(op.opId))
  )
  await tx.done
}

// ─── Sync Meta ────────────────────────────────────────────────────

export async function getSyncMeta(docId: string): Promise<SyncMeta> {
  const db = await getDB()
  return (
    (await db.get("sync_meta", docId)) ?? {
      documentId: docId,
      lastSyncedClock: 0,
      lastSyncedAt: 0,
    }
  )
}

export async function saveSyncMeta(meta: SyncMeta): Promise<void> {
  const db = await getDB()
  await db.put("sync_meta", meta)
}

// ─── Lamport clock (persisted in sync_meta) ───────────────────────

export async function nextLamportClock(docId: string): Promise<number> {
  const meta = await getSyncMeta(docId)
  const pending = await getUnsyncedOps(docId)
  const maxPending = pending.reduce((m, op) => Math.max(m, op.lamportClock), 0)
  // Must exceed both the last server-confirmed clock and any existing pending op clocks.
  // Does NOT write to sync_meta — lastSyncedClock is only advanced by server sync,
  // never by local op creation (otherwise pull's "since" param gets polluted).
  return Math.max(meta.lastSyncedClock, maxPending) + 1
}

export async function updateLamportClock(
  docId: string,
  received: number
): Promise<void> {
  const meta = await getSyncMeta(docId)
  const next = Math.max(meta.lastSyncedClock, received) + 1
  await saveSyncMeta({ ...meta, lastSyncedClock: next })
}
