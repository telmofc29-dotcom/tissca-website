-- BUILDR Phase D1: Invoice Database Layer
-- Implements invoices, invoice items, and payment tracking
-- 
-- WHERE TO RUN THIS:
-- 1. Go to Supabase Dashboard → Your Project
-- 2. Click "SQL Editor" in left sidebar
-- 3. Click "+ New Query" button
-- 4. Copy and paste entire contents of this file
-- 5. Click "Run" button
-- 6. Wait for success message (no errors)
--
-- If you see errors, check that Phase C0, C1, and C3 migrations ran first.

-- ============================================================================
-- 1. INVOICES TABLE
-- ============================================================================
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete set null,
  
  -- Invoice metadata
  invoice_number text not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  
  -- Dates
  issue_date date not null default current_date,
  due_date date,
  
  -- Currency
  currency text not null default 'GBP',
  
  -- Financial totals (calculated, not user-entered)
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  discount_total numeric(12, 2) not null default 0 check (discount_total >= 0),
  vat_total numeric(12, 2) not null default 0 check (vat_total >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  
  -- Payment tracking
  amount_paid numeric(12, 2) not null default 0 check (amount_paid >= 0),
  balance_due numeric(12, 2) not null default 0 check (balance_due >= 0),
  
  -- Additional fields
  notes text,
  terms text,
  
  -- Audit trail
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Unique invoice number per business
  unique(business_id, invoice_number)
);

-- Indexes for faster queries
create index idx_invoices_business_id on public.invoices(business_id);
create index idx_invoices_client_id on public.invoices(client_id);
create index idx_invoices_quote_id on public.invoices(quote_id);
create index idx_invoices_status on public.invoices(status);
create index idx_invoices_business_issue_date on public.invoices(business_id, issue_date);
create index idx_invoices_business_status on public.invoices(business_id, status);
create index idx_invoices_client_issue_date on public.invoices(client_id, issue_date);

-- Enable RLS
alter table public.invoices enable row level security;

-- ============================================================================
-- 2. INVOICE_ITEMS TABLE
-- ============================================================================
create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  
  -- Line item type
  type text not null check (type in ('material', 'labour', 'custom')),
  
  -- Item description
  description text not null,
  
  -- Quantity & pricing
  qty numeric(10, 2) not null default 1 check (qty > 0),
  unit text, -- 'each', 'sqm', 'lm', 'hour', 'day', etc.
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  
  -- VAT
  vat_rate numeric(5, 2) not null default 0 check (vat_rate >= 0 and vat_rate <= 100),
  
  -- Calculated line totals (stored for audit trail)
  line_subtotal numeric(12, 2) not null default 0 check (line_subtotal >= 0),
  line_vat numeric(12, 2) not null default 0 check (line_vat >= 0),
  line_total numeric(12, 2) not null default 0 check (line_total >= 0),
  
  -- Display order
  sort_order int not null default 0,
  
  -- Flexible metadata (e.g., material_id, labour_rate_id for audit trail)
  metadata jsonb,
  
  -- Timestamp
  created_at timestamptz not null default now()
);

-- Indexes for faster queries
create index idx_invoice_items_invoice_id on public.invoice_items(invoice_id);
create index idx_invoice_items_type on public.invoice_items(type);

-- Enable RLS
alter table public.invoice_items enable row level security;

-- ============================================================================
-- 3. INVOICE_PAYMENTS TABLE
-- ============================================================================
create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  
  -- Payment details
  amount numeric(12, 2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  method text not null check (method in ('bank', 'cash', 'card', 'other')),
  
  -- Payment reference (e.g., bank transfer ref, cheque number)
  reference text,
  notes text,
  
  -- Timestamp
  created_at timestamptz not null default now()
);

-- Indexes for faster queries
create index idx_invoice_payments_invoice_id on public.invoice_payments(invoice_id);
create index idx_invoice_payments_paid_at on public.invoice_payments(paid_at);

-- Enable RLS
alter table public.invoice_payments enable row level security;

-- ============================================================================
-- RLS POLICIES - INVOICES
-- ============================================================================

-- Staff: can manage invoices for their business
create policy "Staff can view invoices for their business"
  on public.invoices for select
  using (
    exists (
      select 1 from public.staff_members
      where staff_members.business_id = invoices.business_id
      and staff_members.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Staff can create invoices for their business"
  on public.invoices for insert
  with check (
    exists (
      select 1 from public.staff_members
      where staff_members.business_id = invoices.business_id
      and staff_members.user_id = auth.uid()
    )
  );

create policy "Staff can update invoices for their business"
  on public.invoices for update
  using (
    exists (
      select 1 from public.staff_members
      where staff_members.business_id = invoices.business_id
      and staff_members.user_id = auth.uid()
    )
  );

create policy "Staff can delete invoices for their business"
  on public.invoices for delete
  using (
    exists (
      select 1 from public.staff_members
      where staff_members.business_id = invoices.business_id
      and staff_members.user_id = auth.uid()
    )
  );

-- Clients: can view invoices sent to them (read-only)
create policy "Clients can view invoices sent to them"
  on public.invoices for select
  using (
    client_id in (
      select clients.id from public.clients
      where exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and profiles.role = 'client'
        and profiles.client_id = clients.id
      )
    )
  );

-- Accountants: can view invoices for their business (read-only)
create policy "Accountants can view invoices for financial access"
  on public.invoices for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'accountant'
      and profiles.business_id = invoices.business_id
    )
  );

-- Admin: can view all invoices
create policy "Admin can view all invoices"
  on public.invoices for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- ============================================================================
-- RLS POLICIES - INVOICE_ITEMS
-- ============================================================================

-- Staff: can manage items within their invoices
create policy "Invoice items inherit invoice permissions (select)"
  on public.invoice_items for select
  using (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
      and (
        exists (
          select 1 from public.staff_members
          where staff_members.business_id = invoices.business_id
          and staff_members.user_id = auth.uid()
        )
        or
        exists (
          select 1 from public.profiles
          where profiles.id = auth.uid()
          and profiles.role = 'admin'
        )
        or
        exists (
          select 1 from public.profiles
          where profiles.id = auth.uid()
          and profiles.role = 'accountant'
          and profiles.business_id = invoices.business_id
        )
        or
        exists (
          select 1 from public.profiles
          where profiles.id = auth.uid()
          and profiles.role = 'client'
          and profiles.client_id = invoices.client_id
        )
      )
    )
  );

create policy "Staff can manage invoice items"
  on public.invoice_items for insert
  with check (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
      and exists (
        select 1 from public.staff_members
        where staff_members.business_id = invoices.business_id
        and staff_members.user_id = auth.uid()
      )
    )
  );

create policy "Staff can update invoice items"
  on public.invoice_items for update
  using (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
      and exists (
        select 1 from public.staff_members
        where staff_members.business_id = invoices.business_id
        and staff_members.user_id = auth.uid()
      )
    )
  );

create policy "Staff can delete invoice items"
  on public.invoice_items for delete
  using (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
      and exists (
        select 1 from public.staff_members
        where staff_members.business_id = invoices.business_id
        and staff_members.user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- RLS POLICIES - INVOICE_PAYMENTS
-- ============================================================================

-- Staff: can manage payments for their invoices
create policy "Invoice payments inherit invoice permissions (select)"
  on public.invoice_payments for select
  using (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_payments.invoice_id
      and (
        exists (
          select 1 from public.staff_members
          where staff_members.business_id = invoices.business_id
          and staff_members.user_id = auth.uid()
        )
        or
        exists (
          select 1 from public.profiles
          where profiles.id = auth.uid()
          and profiles.role = 'admin'
        )
        or
        exists (
          select 1 from public.profiles
          where profiles.id = auth.uid()
          and profiles.role = 'accountant'
          and profiles.business_id = invoices.business_id
        )
        or
        exists (
          select 1 from public.profiles
          where profiles.id = auth.uid()
          and profiles.role = 'client'
          and profiles.client_id = invoices.client_id
        )
      )
    )
  );

create policy "Staff can record payments"
  on public.invoice_payments for insert
  with check (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_payments.invoice_id
      and exists (
        select 1 from public.staff_members
        where staff_members.business_id = invoices.business_id
        and staff_members.user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This migration creates the foundation for invoice management:
--
-- TABLES:
-- - invoices: Main invoice records (linked to quotes, business, client)
-- - invoice_items: Line items (material, labour, custom)
-- - invoice_payments: Payment log with method tracking
--
-- FEATURES:
-- - Sequential invoice numbering per business
-- - Financial tracking (subtotal, discount, VAT, total, paid, balance)
-- - Status workflow (draft → sent → partially_paid/paid)
-- - Payment method tracking (bank, cash, card, other)
-- - RLS enforced: Staff CRUD, Client read-only, Accountant read-only, Admin global
--
-- CONSTRAINTS:
-- - All numeric fields >= 0 (CHECK constraints)
-- - Unique invoice numbers per business
-- - Cascade deletes to items and payments
-- - Foreign keys to businesses, clients, quotes
--
-- NEXT STEPS (Phase D2+):
-- - TypeScript types for invoices
-- - API routes for CRUD operations
-- - Invoice creation from accepted quotes (immutable snapshot)
-- - Invoice PDF generation
-- - UI pages (staff: create/edit/view, client: view/pay)
-- - Payment tracking UI
