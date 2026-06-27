# Collab·Editor

A local-first collaborative document editor built for the House of Edtech fullstack assignment. Works fully offline, syncs deterministically on reconnect, and supports granular version history with role-based access control.

**Built by:** Tejas  
**GitHub:** [github.com/tejasg910](https://github.com/tejasg910)  
**LinkedIn:** [linkedin.com/in/tejas-giri](https://linkedin.com/in/tejas-giri)

---

## Features

- **Local-first** — IndexedDB is the primary store. Read and write with zero latency, even offline.
- **Offline sync** — Mutations queue locally while offline. On reconnect, queued ops push to the server, remote ops pull down, and a deterministic merge resolves conflicts.
- **Lamport clock conflict resolution** — Every operation carries a monotonically increasing logical clock. `pickWinner` sorts by clock, breaks ties alphabetically by `userId`. Same inputs always produce the same output.
- **Version history** — Snapshot any document state with an optional label. Browse the timeline and restore any past version without corrupting live state for other collaborators.
- **Role-based access** — Three roles: `owner`, `editor`, `viewer`. Viewers are blocked at both the UI layer and the API layer from pushing sync operations.
- **Document sharing** — Owners invite collaborators by email, assign roles, and revoke access.
- **AI writing assistant** — Powered by Groq (`llama-3.1-8b-instant`). Six actions: Improve, Fix Grammar, Continue, Summarize, Shorten, Expand. Streams output live, inserts at cursor or replaces selection.
- **Real-time sync status** — SyncOrb and StatusBar show live online/offline/syncing state.
- **Server-side payload validation** — Sync ops rejected if payload exceeds 512 KB, preventing OOM attacks.
- **Row-level security** — All DB queries scoped to the authenticated user via `withRLS`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (Base UI) |
| Database | PostgreSQL via Supabase |
| ORM | Drizzle ORM |
| Auth | Better Auth |
| Local storage | IndexedDB via `idb` |
| Rich text editor | TipTap v3 (ProseMirror) |
| AI | Vercel AI SDK v7 + Groq `llama-3.1-8b-instant` |
| Animations | Framer Motion |

---

## Architecture

```
src/
  app/              ← Next.js routes + API routes (thin shell only)
  modules/
    auth/           ← Login, register, session
    documents/      ← CRUD, sharing, roles
    editor/         ← TipTap editor, toolbar, AI panel
    sync/           ← Sync engine, push/pull, Lamport clock
    versions/       ← Snapshots, version history, restore
    ai/             ← AI panel, Groq streaming
    landing/        ← Marketing landing page
  lib/
    db/
      schema.ts     ← Drizzle schema (documents, members, sync_ops, snapshots)
      index.ts      ← Supabase DB client + RLS helper
      local.ts      ← IndexedDB store (primary source of truth)
    auth.ts         ← Better Auth server config
    auth-client.ts  ← Better Auth client
  components/
    layout/         ← Sidebar
    ui/             ← shadcn components
```

### Local-First Data Flow

```
User types
  → useDocument writes to IndexedDB immediately (0ms latency)
  → UI re-renders from local state
  → useSyncEngine queues op with nextLamportClock()

On reconnect
  → Push queued local ops to /api/sync/push
  → Pull remote ops since last clock from /api/sync/pull
  → pickWinner() merges: sort by lamportClock, tiebreak by userId
  → Winner content written to editor + IndexedDB
  → lastSyncedClock updated
```

### Database Schema

```
documents          — id, title, ownerId, createdAt, updatedAt
document_members   — documentId, userId, role (owner|editor|viewer)
sync_operations    — documentId, userId, content (JSONB), lamportClock
document_snapshots — documentId, content (JSONB), label, atLamportClock
```

---

## Setup

### Prerequisites

- Node.js 20+
- [Supabase](https://supabase.com) PostgreSQL database
- [Groq](https://console.groq.com) API key (free tier, no card required)

### Install

```bash
git clone <repo>
cd collab-editor
npm install
```

### Environment Variables

Create `.env.local`:

```env
# Neon PostgreSQL
DATABASE_URL="postgresql://..."

# Better Auth
BETTER_AUTH_SECRET="<run: openssl rand -base64 32>"
BETTER_AUTH_URL="http://localhost:3000"

# Groq AI (free tier)
GROQ_API_KEY="gsk_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Database Migration

```bash
npx drizzle-kit push
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## API Routes

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/[...all]` | Better Auth handler |
| `GET/POST/DELETE` | `/api/documents/[id]/members` | Share, list, remove members |
| `POST` | `/api/sync/push` | Push local ops to server |
| `GET` | `/api/sync/pull` | Pull remote ops since clock |
| `GET/POST` | `/api/snapshots` | List and create version snapshots |
| `POST` | `/api/snapshots/[id]/restore` | Restore a past version |
| `POST` | `/api/ai` | AI streaming completions (Groq) |

All routes require authentication. Sync push additionally requires `editor` or `owner` role.

---

## Conflict Resolution

```typescript
// pickWinner — deterministic, no randomness
function pickWinner(ops: Array<{ lamportClock: number; userId: string; content: unknown }>) {
  return [...ops].sort((a, b) =>
    a.lamportClock !== b.lamportClock
      ? a.lamportClock - b.lamportClock      // higher clock wins
      : a.userId.localeCompare(b.userId)     // tiebreak: alphabetical userId
  ).at(-1)!
}

// updateLamportClock — advances on receive (Lamport's rule)
async function updateLamportClock(docId: string, received: number) {
  const meta = await getSyncMeta(docId)
  const next = Math.max(meta.lastSyncedClock, received) + 1
  await saveSyncMeta({ ...meta, lastSyncedClock: next })
}
```

**Invariant:** Given the same set of sync operations, every client independently computes the same winner. No server arbitration needed.

---

## AI Assistant

Triggered by the ✦ sparkle button in the editor toolbar. Streams output live from Groq.

| Action | Behavior |
|---|---|
| **Improve** | Rewrites selected text or whole document for clarity |
| **Fix Grammar** | Corrects grammar and spelling in-place |
| **Continue** | Appends 2–3 sentences continuing the narrative |
| **Summarize** | Produces a 2–3 sentence summary |
| **Shorten** | Cuts length by ~50% preserving key information |
| **Expand** | Doubles length with added detail |

After generation: **Insert at cursor** or **Replace** (selection or whole doc).

---

## Security

- All API routes auth-gated via Better Auth session check
- Viewer role blocked from `/api/sync/push` at the service layer
- Sync payloads validated: `> 512 KB` rejected before DB write
- `withRLS` helper scopes all queries to the authenticated user
- No sensitive env vars exposed client-side (`NEXT_PUBLIC_` prefix only for app URL)
