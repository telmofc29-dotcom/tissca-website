-- ═══════════════════════════════════════════════════════════════════════
-- WARNING: REFERENCE ONLY — DEPRECATED
-- DO NOT RUN AGAINST PRODUCTION WITHOUT FULL SCHEMA VERIFICATION
--
-- This file was auto-generated as a greenfield proposal.
-- Production already has: projects (11 cols), project_rooms (16 cols)
-- with a DIFFERENT schema than what this file defines.
--
-- REAL production schema (verified 2 April 2026):
--   projects: id, workspace_id, owner_id, name, status, space_type,
--     sync_version, last_modified_platform, last_synced_at, created_at, updated_at
--   project_rooms: id, project_id, owner_id, name, space_type, ceiling_height,
--     walls(jsonb), openings(jsonb), objects(jsonb), mesh_file_path,
--     mesh_face_count, mesh_vertex_count, sync_version, last_modified_platform,
--     created_at, updated_at
--
-- THIS FILE DOES NOT MATCH PRODUCTION. Key differences:
--   - projects: this file has description, client_name, address, lead_id, job_id,
--     has_mesh_data, has_layout, has_units, source_platform, created_by, updated_by
--     — NONE of these exist in production
--   - projects: production has owner_id, space_type, sync_version,
--     last_modified_platform, last_synced_at — NONE in this file
--   - project_rooms: this file has room_type, layout_id, scan_status, has_mesh,
--     sort_order — NONE exist in production
--   - project_rooms: production has owner_id, space_type, ceiling_height,
--     walls, openings, objects, mesh_file_path, mesh_face_count,
--     mesh_vertex_count, sync_version, last_modified_platform — NONE in this file
--
-- STATUS: DEPRECATED — kept for historical reference only.
-- The website TypeScript types have been corrected to match production.
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- 1. Projects table (IF NOT EXISTS — no-op if already present)
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  name TEXT NOT NULL DEFAULT 'Untitled Project',
  description TEXT,

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'archived', 'on_hold')),

  -- Client context
  client_name TEXT,
  address TEXT,

  -- CRM linkage (FK only if referenced tables exist)
  lead_id UUID,
  job_id UUID,

  -- Cross-platform flags
  has_mesh_data BOOLEAN NOT NULL DEFAULT FALSE,
  has_layout BOOLEAN NOT NULL DEFAULT FALSE,
  has_units BOOLEAN NOT NULL DEFAULT FALSE,

  -- Platform origin
  source_platform TEXT DEFAULT 'web'
    CHECK (source_platform IN ('web', 'ios', 'android', 'api')),

  -- Audit
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────────
-- 2. Project rooms table (IF NOT EXISTS — no-op if already present)
-- ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

  name TEXT NOT NULL DEFAULT 'Room',
  room_type TEXT NOT NULL DEFAULT 'general'
    CHECK (room_type IN ('kitchen', 'wardrobe', 'bathroom', 'utility', 'bedroom', 'living', 'general')),

  layout_id UUID,

  scan_status TEXT NOT NULL DEFAULT 'not_scanned'
    CHECK (scan_status IN ('not_scanned', 'scanning', 'scanned', 'processed')),
  has_mesh BOOLEAN NOT NULL DEFAULT FALSE,

  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────────
-- 3. Indexes (IF NOT EXISTS — safe to re-run)
-- ───────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON public.projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_updated ON public.projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_rooms_project ON public.project_rooms(project_id);

-- ───────────────────────────────────────────────────────────────────────
-- 4. RLS — Enable (idempotent)
-- ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_rooms ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────────────────────────────────
-- 5. RLS Policies — DEFENSIVE (check before creating)
--    Follows the safe pattern from phase_e1_room_layouts.sql
-- ───────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Projects SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects'
      AND policyname = 'Workspace members can read projects'
  ) THEN
    CREATE POLICY "Workspace members can read projects"
      ON public.projects FOR SELECT
      USING (
        workspace_id IN (
          SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
        )
      );
  END IF;

  -- Projects INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects'
      AND policyname = 'Workspace members can create projects'
  ) THEN
    CREATE POLICY "Workspace members can create projects"
      ON public.projects FOR INSERT
      WITH CHECK (
        workspace_id IN (
          SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
        )
      );
  END IF;

  -- Projects UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects'
      AND policyname = 'Workspace members can update projects'
  ) THEN
    CREATE POLICY "Workspace members can update projects"
      ON public.projects FOR UPDATE
      USING (
        workspace_id IN (
          SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
        )
      );
  END IF;

  -- Project rooms SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'project_rooms'
      AND policyname = 'Workspace members can read project rooms'
  ) THEN
    CREATE POLICY "Workspace members can read project rooms"
      ON public.project_rooms FOR SELECT
      USING (
        project_id IN (
          SELECT p.id FROM projects p
          JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
          WHERE wm.user_id = auth.uid()
        )
      );
  END IF;

  -- Project rooms ALL
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'project_rooms'
      AND policyname = 'Workspace members can manage project rooms'
  ) THEN
    CREATE POLICY "Workspace members can manage project rooms"
      ON public.project_rooms FOR ALL
      USING (
        project_id IN (
          SELECT p.id FROM projects p
          JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
          WHERE wm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ───────────────────────────────────────────────────────────────────────
-- 6. Updated-at trigger — DEFENSIVE
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_projects_updated_at'
  ) THEN
    CREATE TRIGGER trg_projects_updated_at
      BEFORE UPDATE ON public.projects
      FOR EACH ROW EXECUTE FUNCTION public.set_projects_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_project_rooms_updated_at'
  ) THEN
    CREATE TRIGGER trg_project_rooms_updated_at
      BEFORE UPDATE ON public.project_rooms
      FOR EACH ROW EXECUTE FUNCTION public.set_projects_updated_at();
  END IF;
END $$;
