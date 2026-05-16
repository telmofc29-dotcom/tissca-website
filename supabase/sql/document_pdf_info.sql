-- Document PDF Info table
-- Stores company identity, contact details, payment details for PDF generation.
-- One row per workspace.

create table if not exists public.document_pdf_info (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null unique,
  -- Company Identity
  company_name  text,
  trading_name  text,
  company_number text,
  -- Contact Details
  contact_name  text,
  address_line_1 text,
  address_line_2 text,
  city          text,
  postcode      text,
  phone         text,
  email         text,
  -- Payment Details
  bank_name     text,
  account_name  text,
  sort_code     text,
  account_number text,
  -- VAT
  vat_enabled   boolean default false,
  vat_number    text,
  vat_rate      decimal(5,2) default 20,
  -- Branding
  logo_url      text,
  tagline       text,
  brand_color   text default '#1e40af',
  -- Currency
  default_currency text default 'GBP',
  -- Meta
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- RLS
alter table public.document_pdf_info enable row level security;

-- Storage bucket for logos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-logos',
  'business-logos',
  true,
  2097152, -- 2MB
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;
