-- Document Version Column Migration
-- Adds version tracking to the documents table for regeneration parity.
-- Existing documents get version = 1 (backward compatible).
-- New/regenerated documents increment version on each regeneration.

-- Add version column with default 1 (all existing rows become v1)
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Ensure version is always positive
ALTER TABLE public.documents
  ADD CONSTRAINT documents_version_positive CHECK (version >= 1);
