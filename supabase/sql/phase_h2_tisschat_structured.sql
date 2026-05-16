-- Phase H2: Extend messages.message_type to support structured types
-- Adds 'lead' and 'job' to the allowed message_type values.
--
-- Run via Supabase SQL editor. Safe: only drops/recreates a CHECK constraint.

-- Drop old constraint
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_message_type_check;

-- Recreate with additional types
ALTER TABLE public.messages
  ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'document', 'card', 'lead', 'job'));
