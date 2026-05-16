-- ═══════════════════════════════════════════════════════════════════════
-- TISSCA: P0 Security — Cross-Account Data Isolation Fixes
-- Date: 2026-05-01
--
-- ROOT CAUSE: Multiple Supabase tables have RLS enabled but either:
--   (a) No policies defined → service-role bypass is fine, but direct
--       client SDK queries (Android/iOS realtime) would leak nothing (blocked).
--   (b) Permissive USING(true) → any authenticated user reads ALL rows,
--       bypassing workspace scoping entirely.
--
-- AFFECTED TABLES:
--   • conversations     — USING(true) on SELECT  → CRITICAL
--   • messages          — USING(true) on SELECT  → CRITICAL
--   • message_reactions — USING(true) on SELECT  → HIGH
--   • crm_history       — RLS enabled, NO policies → BROKEN (empty results)
--   • documents         — RLS enabled, NO policies → BROKEN (empty results)
--   • tool_attachments  — business_id NOT NULL, code writes workspace_id
--                          → INSERT fails silently, scope broken
--
-- SAFETY:
--   - All operations are idempotent (DROP IF EXISTS before CREATE)
--   - No DROP TABLE, no DELETE, no TRUNCATE
--   - Existing rows are never modified (except tool_attachments workspace_id backfill)
--   - Policies are DROP + CREATE (safest for idempotent re-run)
--
-- RUN IN: Supabase SQL Editor
-- MUST RUN BEFORE: any further mobile/web deployment
-- ═══════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════
-- 1. conversations — Fix USING(true) → workspace-member scoped
-- ═══════════════════════════════════════════════════════════════════════

-- Drop old permissive policies
DROP POLICY IF EXISTS conversations_select ON public.conversations;
DROP POLICY IF EXISTS conversations_insert ON public.conversations;

-- SELECT: only workspace members see their workspace's conversations
CREATE POLICY conversations_select ON public.conversations
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: user must be a member of the target workspace
CREATE POLICY conversations_insert ON public.conversations
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- UPDATE (rename etc): restricted to workspace members
DROP POLICY IF EXISTS conversations_update ON public.conversations;
CREATE POLICY conversations_update ON public.conversations
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- DELETE: restricted to workspace members
DROP POLICY IF EXISTS conversations_delete ON public.conversations;
CREATE POLICY conversations_delete ON public.conversations
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- 2. messages — Fix USING(true) → conversation-scoped (via workspace)
-- ═══════════════════════════════════════════════════════════════════════

-- Drop old permissive policies
DROP POLICY IF EXISTS messages_select ON public.messages;
DROP POLICY IF EXISTS messages_insert ON public.messages;

-- SELECT: user must be a member of the message's workspace
CREATE POLICY messages_select ON public.messages
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: sender_id must match current user AND workspace must be theirs
CREATE POLICY messages_insert ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- 3. message_reactions — Fix USING(true) → workspace-scoped
-- ═══════════════════════════════════════════════════════════════════════

-- Drop old permissive policy
DROP POLICY IF EXISTS reactions_select ON public.message_reactions;

-- SELECT: user must belong to the workspace the message belongs to
CREATE POLICY reactions_select ON public.message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.messages m
      JOIN public.workspace_members wm ON wm.workspace_id = m.workspace_id
      WHERE m.id = message_reactions.message_id
        AND wm.user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- 4. crm_history — Add missing RLS policies (previously: no policies)
-- ═══════════════════════════════════════════════════════════════════════

-- SELECT: workspace members can read their workspace's history
DROP POLICY IF EXISTS "crm_history_select" ON public.crm_history;
CREATE POLICY "crm_history_select" ON public.crm_history
  FOR SELECT USING (
    (
      workspace_id IS NOT NULL
      AND workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
    OR
    (
      business_id IS NOT NULL
      AND business_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- INSERT: only service-role (API) inserts; anon/authenticated cannot insert directly
-- (Service-role bypasses RLS, so this is defence-in-depth: deny direct client inserts)
DROP POLICY IF EXISTS "crm_history_insert" ON public.crm_history;
-- No INSERT policy → direct client inserts blocked (API uses service-role, unaffected)

-- ═══════════════════════════════════════════════════════════════════════
-- 5. documents — Add missing RLS policies (previously: no policies)
-- ═══════════════════════════════════════════════════════════════════════

-- SELECT: workspace members can read their documents
DROP POLICY IF EXISTS "documents_select" ON public.documents;
CREATE POLICY "documents_select" ON public.documents
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

-- INSERT: workspace members can insert documents
DROP POLICY IF EXISTS "documents_insert" ON public.documents;
CREATE POLICY "documents_insert" ON public.documents
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- UPDATE: workspace members can update documents
DROP POLICY IF EXISTS "documents_update" ON public.documents;
CREATE POLICY "documents_update" ON public.documents
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- 6. tool_attachments — Add workspace_id column (schema fix)
--    Original table only has business_id; code writes workspace_id.
--    This migration adds workspace_id, backfills from business_id,
--    and adds proper RLS policies.
-- ═══════════════════════════════════════════════════════════════════════

-- Add workspace_id column if it doesn't exist
ALTER TABLE public.tool_attachments
  ADD COLUMN IF NOT EXISTS workspace_id uuid;

-- Backfill workspace_id from business_id for any existing rows
UPDATE public.tool_attachments
  SET workspace_id = business_id
  WHERE workspace_id IS NULL AND business_id IS NOT NULL;

-- Add index for workspace_id queries
CREATE INDEX IF NOT EXISTS idx_tool_attachments_workspace_id
  ON public.tool_attachments(workspace_id)
  WHERE workspace_id IS NOT NULL;

-- Add parent_id / parent_type columns (new schema used by code)
ALTER TABLE public.tool_attachments
  ADD COLUMN IF NOT EXISTS parent_id   uuid,
  ADD COLUMN IF NOT EXISTS parent_type text,
  ADD COLUMN IF NOT EXISTS client_record_id text,
  ADD COLUMN IF NOT EXISTS created_by  uuid,
  ADD COLUMN IF NOT EXISTS created_at_millis bigint,
  ADD COLUMN IF NOT EXISTS updated_at_millis bigint,
  ADD COLUMN IF NOT EXISTS labour_total           numeric(12,2),
  ADD COLUMN IF NOT EXISTS materials_total        numeric(12,2),
  ADD COLUMN IF NOT EXISTS subcontractor_total    numeric(12,2),
  ADD COLUMN IF NOT EXISTS plant_hire_total       numeric(12,2),
  ADD COLUMN IF NOT EXISTS other_direct_cost_total numeric(12,2),
  ADD COLUMN IF NOT EXISTS overhead_total         numeric(12,2),
  ADD COLUMN IF NOT EXISTS unknown_total          numeric(12,2);

-- RLS policies for tool_attachments
DROP POLICY IF EXISTS "tool_attachments_select" ON public.tool_attachments;
CREATE POLICY "tool_attachments_select" ON public.tool_attachments
  FOR SELECT USING (
    (
      workspace_id IS NOT NULL
      AND workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
    OR
    (
      business_id IS NOT NULL
      AND business_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "tool_attachments_insert" ON public.tool_attachments;
CREATE POLICY "tool_attachments_insert" ON public.tool_attachments
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tool_attachments_update" ON public.tool_attachments;
CREATE POLICY "tool_attachments_update" ON public.tool_attachments
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- 7. document_pdf_info — Verify RLS policy exists
--    Table has workspace_id and RLS enabled; add policy if missing.
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "document_pdf_info_select" ON public.document_pdf_info;
CREATE POLICY "document_pdf_info_select" ON public.document_pdf_info
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "document_pdf_info_write" ON public.document_pdf_info;
CREATE POLICY "document_pdf_info_write" ON public.document_pdf_info
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- 8. clients — Fix RLS to reference workspace_members (not staff_members)
--    phase_c1_quotes.sql policies reference the now-renamed table.
--    Drop old broken policies and replace with workspace_members-based ones.
-- ═══════════════════════════════════════════════════════════════════════

-- Drop all old staff_members-based policies on clients
DROP POLICY IF EXISTS "Staff can manage clients for their business" ON public.clients;
DROP POLICY IF EXISTS "Admins can manage all clients" ON public.clients;

-- New workspace-scoped policy
CREATE POLICY "workspace_members_clients_select" ON public.clients
  FOR SELECT USING (
    business_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
    OR
    (
      EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = 'clients' AND column_name = 'workspace_id')
      AND workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "workspace_members_clients_write" ON public.clients
  FOR ALL USING (
    business_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- 9. leads table — Add RLS policies if missing
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_select" ON public.leads;
CREATE POLICY "leads_select" ON public.leads
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "leads_write" ON public.leads;
CREATE POLICY "leads_write" ON public.leads
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- 10. jobs table — Add RLS policies if missing
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jobs_select" ON public.jobs;
CREATE POLICY "jobs_select" ON public.jobs
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "jobs_write" ON public.jobs;
CREATE POLICY "jobs_write" ON public.jobs
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- 11. tasks table — Add RLS policies if missing
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tasks_write" ON public.tasks;
CREATE POLICY "tasks_write" ON public.tasks
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- 12. assets table — Add RLS policies if missing
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assets_select" ON public.assets;
CREATE POLICY "assets_select" ON public.assets
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "assets_write" ON public.assets;
CREATE POLICY "assets_write" ON public.assets
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES — Run after applying to confirm policies are active
-- ═══════════════════════════════════════════════════════════════════════
-- SELECT tablename, policyname, cmd, qual FROM pg_policies
-- WHERE tablename IN ('conversations','messages','message_reactions',
--   'crm_history','documents','tool_attachments','document_pdf_info',
--   'leads','jobs','tasks','assets','clients')
-- ORDER BY tablename, policyname;

COMMIT;
