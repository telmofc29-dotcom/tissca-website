-- ═══════════════════════════════════════════════════════════════════════
-- TISSCA: Atomic invoice number generation
--
-- PURPOSE:
-- Replaces the read-then-update pattern in invoiceNumberGenerator.ts
-- with a single atomic Postgres function. Eliminates the race condition
-- where two concurrent requests can read the same counter and produce
-- duplicate invoice numbers.
--
-- HOW IT WORKS:
-- Uses INSERT ... ON CONFLICT ... UPDATE with RETURNING to atomically
-- claim the next sequence number in a single statement. The row-level
-- lock held by the upsert prevents concurrent callers from ever seeing
-- the same counter value.
--
-- SAFETY:
-- - Production-safe, idempotent (CREATE OR REPLACE)
-- - Does not alter the invoice_number_counters table structure
-- - Preserves existing numbering: INV-YYYY-000001
--
-- RUN IN: Supabase SQL Editor
-- DEPENDS ON: invoice_number_counters table (phase_d1_invoices.sql)
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.next_invoice_number(
  p_business_id uuid,
  p_year        text DEFAULT to_char(now(), 'YYYY')
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_next integer;
BEGIN
  -- Atomically claim the next number.
  -- If the row exists → increment and return the NEW value.
  -- If the row does not exist → insert with next_number = 2 (we'll use 1 now).
  INSERT INTO public.invoice_number_counters (business_id, year, next_number)
  VALUES (p_business_id, p_year, 2)
  ON CONFLICT (business_id, year)
  DO UPDATE SET next_number = invoice_number_counters.next_number + 1
  RETURNING next_number - 1 INTO v_next;
  -- We subtract 1 because:
  --   • New row: next_number = 2, so we return 1 (first invoice)
  --   • Existing row: next_number was N, now N+1, we return N (the claimed number)

  RETURN 'INV-' || p_year || '-' || lpad(v_next::text, 6, '0');
END;
$$;
