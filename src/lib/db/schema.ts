import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  integer,
  boolean,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core"

// ─── Enums ────────────────────────────────────────────────────────────────────

export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "editor",
  "viewer",
])

// ─── Users ────────────────────────────────────────────────────────────────────
// Managed by Better Auth — we mirror the required shape here for relations

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// ─── Documents ────────────────────────────────────────────────────────────────

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull().default("Untitled"),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// ─── Document Members (roles) ─────────────────────────────────────────────────

export const documentMembers = pgTable(
  "document_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("viewer"),
    invitedAt: timestamp("invited_at").notNull().defaultNow(),
  },
  (t) => [
    unique("document_members_unique").on(t.documentId, t.userId),
    index("document_members_doc_idx").on(t.documentId),
    index("document_members_user_idx").on(t.userId),
  ]
)

// ─── Sync Operations (append-only log) ───────────────────────────────────────

export const syncOperations = pgTable(
  "sync_operations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Full TipTap JSON snapshot at this point in time
    content: jsonb("content").notNull(),
    // Logical clock for deterministic ordering
    lamportClock: integer("lamport_clock").notNull(),
    // Wall clock for display only — never used for ordering
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("sync_ops_doc_clock_idx").on(t.documentId, t.lamportClock),
    index("sync_ops_doc_idx").on(t.documentId),
  ]
)

// ─── Document Snapshots (version history) ────────────────────────────────────

export const documentSnapshots = pgTable(
  "document_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Full TipTap JSON content at snapshot time
    content: jsonb("content").notNull(),
    // User-defined label e.g. "Before redesign"
    label: text("label"),
    // Which sync op clock this snapshot was taken at
    atLamportClock: integer("at_lamport_clock").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("snapshots_doc_idx").on(t.documentId)]
)

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect
export type Document = typeof documents.$inferSelect
export type DocumentMember = typeof documentMembers.$inferSelect
export type SyncOperation = typeof syncOperations.$inferSelect
export type DocumentSnapshot = typeof documentSnapshots.$inferSelect
export type MemberRole = "owner" | "editor" | "viewer"
