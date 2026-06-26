-- ─────────────────────────────────────────────────────────────────
-- Row Level Security Policies
-- Run this in Neon SQL Editor (neon.tech → your project → SQL Editor)
-- ─────────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_snapshots ENABLE ROW LEVEL SECURITY;

-- ─── documents ────────────────────────────────────────────────────
-- Users can only see documents they are a member of

CREATE POLICY "documents_select" ON documents
  FOR SELECT
  USING (
    id IN (
      SELECT document_id FROM document_members
      WHERE user_id = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "documents_insert" ON documents
  FOR INSERT
  WITH CHECK (
    owner_id = current_setting('app.current_user_id', true)
  );

CREATE POLICY "documents_update" ON documents
  FOR UPDATE
  USING (
    id IN (
      SELECT document_id FROM document_members
      WHERE user_id = current_setting('app.current_user_id', true)
        AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "documents_delete" ON documents
  FOR DELETE
  USING (
    owner_id = current_setting('app.current_user_id', true)
  );

-- ─── document_members ─────────────────────────────────────────────
-- Users can see members of documents they belong to
-- Only owners can insert/update/delete members

CREATE POLICY "members_select" ON document_members
  FOR SELECT
  USING (
    document_id IN (
      SELECT document_id FROM document_members dm2
      WHERE dm2.user_id = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "members_insert" ON document_members
  FOR INSERT
  WITH CHECK (
    document_id IN (
      SELECT document_id FROM document_members dm2
      WHERE dm2.user_id = current_setting('app.current_user_id', true)
        AND dm2.role = 'owner'
    )
  );

CREATE POLICY "members_delete" ON document_members
  FOR DELETE
  USING (
    document_id IN (
      SELECT document_id FROM document_members dm2
      WHERE dm2.user_id = current_setting('app.current_user_id', true)
        AND dm2.role = 'owner'
    )
  );

-- ─── sync_operations ──────────────────────────────────────────────
-- Members can read ops for their documents
-- Only owners/editors can insert ops (viewers blocked)

CREATE POLICY "sync_ops_select" ON sync_operations
  FOR SELECT
  USING (
    document_id IN (
      SELECT document_id FROM document_members
      WHERE user_id = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "sync_ops_insert" ON sync_operations
  FOR INSERT
  WITH CHECK (
    user_id = current_setting('app.current_user_id', true)
    AND document_id IN (
      SELECT document_id FROM document_members
      WHERE user_id = current_setting('app.current_user_id', true)
        AND role IN ('owner', 'editor')
    )
  );

-- ─── document_snapshots ───────────────────────────────────────────
-- Members can read snapshots for their documents
-- Only owners/editors can create snapshots

CREATE POLICY "snapshots_select" ON document_snapshots
  FOR SELECT
  USING (
    document_id IN (
      SELECT document_id FROM document_members
      WHERE user_id = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "snapshots_insert" ON document_snapshots
  FOR INSERT
  WITH CHECK (
    created_by = current_setting('app.current_user_id', true)
    AND document_id IN (
      SELECT document_id FROM document_members
      WHERE user_id = current_setting('app.current_user_id', true)
        AND role IN ('owner', 'editor')
    )
  );
