-- ═══════════════════════════════════════════════════════════════════════
-- TISSCA: Bootstrap `documents` table
--
-- PURPOSE:
-- Ensures the full `documents` table exists in any environment.
-- On live servers where the table already exists these statements are
-- harmless (IF NOT EXISTS / IF NOT EXISTS throughout).
--
-- This table stores metadata snapshots for every generated PDF document
-- (quotes, invoices, layout quotes). It is the cross-platform source
-- of truth for:
--   • document counts and KPIs
--   • regeneration tracking (version column)
--   • linked entity provenance
--
-- SAFETY:
-- - Production-safe, fully idempotent (IF NOT EXISTS / DO $$ blocks)
-- - No DROP, no ALTER COLUMN, no DELETE, no TRUNCATE
-- - Additive only
--
-- RUN IN: Supabase SQL Editor
-- DEPENDS ON: workspaces table, auth.users
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.documents (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid        NOT NULL,
  created_by      uuid        NOT NULL,

  -- Document classification
  type            text,                   -- 'quote', 'invoice', 'layout_quote'
  reference       text,                   -- Document number (e.g. Q-2026-0001)
  date            text,                   -- ISO date YYYY-MM-DD

  -- Client snapshot (denormalized at generation time)
  client_name     text,
  client_address  text,
  client_email    text,
  client_phone    text,
  client_ref      text,                   -- client UUID for FK tracing

  -- Content
  header_notes    text,
  footer_notes    text,

  -- Financials
  subtotal        numeric(14, 2),
  vat_amount      numeric(14, 2),
  grand_total     numeric(14, 2),
  currency        text        DEFAULT 'GBP',

  -- Line items snapshot
  items           jsonb,                  -- DocumentItemJson[]

  -- Entity provenance: links this document back to the source
  linked_entity_type text,               -- 'quote' | 'invoice' | 'layout'
  linked_entity_id   text,               -- UUID of the source entity

  -- Platform and status
  platform        text        NOT NULL DEFAULT 'web',
  status          text        DEFAULT 'generated',

  -- Regeneration version tracking
  version         integer     NOT NULL DEFAULT 1,

  -- Timestamps
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT documents_version_positive CHECK (version >= 1)
);

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_documents_workspace_id
  ON public.documents(workspace_id);

CREATE INDEX IF NOT EXISTS idx_documents_created_by
  ON public.documents(created_by);

CREATE INDEX IF NOT EXISTS idx_documents_type
  ON public.documents(type);

CREATE INDEX IF NOT EXISTS idx_documents_linked_entity
  ON public.documents(workspace_id, linked_entity_type, linked_entity_id, type);

CREATE INDEX IF NOT EXISTS idx_documents_created_at
  ON public.documents(created_at DESC);

-- ─── Unique constraint for document identity ────────────────────────────────
-- Prevents duplicate documents for the same entity+type combination.
-- Uses a partial index (WHERE linked_entity_type IS NOT NULL) so that
-- documents without a linked entity are unconstrained.

CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_entity_identity
  ON public.documents(workspace_id, linked_entity_type, linked_entity_id, type)
  WHERE linked_entity_type IS NOT NULL AND linked_entity_id IS NOT NULL;

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
