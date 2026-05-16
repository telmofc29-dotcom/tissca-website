-- Phase G1: Expand jobs table with financial ownership fields
-- Aligns website Job model with Android/iOS architecture
-- Job = payment stage owner (deposit, VAT, discount, balance)
--
-- Run via Supabase SQL editor. Safe: all columns are nullable with defaults.

-- ─── Financial fields ─────────────────────────────────────────────────────────

-- Deposit: configured vs explicitly paid
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS deposit_requested numeric DEFAULT 0;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS deposit_paid numeric DEFAULT 0;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS deposit_paid_at timestamptz DEFAULT NULL;

-- VAT (settings-led, stored per-job for snapshot integrity)
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS vat_rate numeric DEFAULT 0;

-- Discount
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS discount_type text DEFAULT 'none';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS discount_value numeric DEFAULT 0;

-- Notes for PDF
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS header_notes text DEFAULT NULL;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS footer_notes text DEFAULT NULL;

-- ─── Constraints ──────────────────────────────────────────────────────────────

-- discount_type must be one of the allowed values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_discount_type_check'
  ) THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT jobs_discount_type_check
      CHECK (discount_type IN ('none', 'percentage', 'fixed'));
  END IF;
END $$;
