export type DocumentRole = "owner" | "editor" | "viewer"

export type DocumentWithMeta = {
  id: string
  title: string
  ownerId: string
  createdAt: Date
  updatedAt: Date
  role: DocumentRole
  collaboratorCount: number
}

export type MemberWithUser = {
  id: string
  userId: string
  name: string
  email: string
  role: DocumentRole
  invitedAt: Date
}
