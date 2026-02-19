-- BUILDR Phase C1: Quotes Data Model
-- Implements quotes, materials, variants, labour rates, and quote items
-- Run this SQL in Supabase SQL Editor after running Phase C0 schema

-- ============================================================================
-- 1. MATERIALS TABLE (extends existing materials_catalog)
-- ============================================================================
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  
  -- Basic info
  name text not null,
  category text not null, -- e.g. "Flooring", "Kitchen", "Paint", "Fixtures"
  description text,
  sku text, -- Optional stock-keeping unit
  
  -- Pricing
  unit text not null default 'each', -- 'sqm', 'lm', 'each', 'set', 'day', 'hour'
  default_price decimal(10, 2) not null,
  currency text default 'GBP',
  
  -- Status
  is_active boolean default true,
  sort_order int default 0,
  
  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Ensure unique material names per business
  unique(business_id, name)
);

-- Index for faster queries
create index idx_materials_business_id on public.materials(business_id);
create index idx_materials_category on public.materials(category);
create index idx_materials_is_active on public.materials(is_active);

-- Enable RLS
alter table public.materials enable row level security;

-- ============================================================================
-- 2. MATERIAL_VARIANTS TABLE
-- ============================================================================
-- Allows materials to have variants like different sizes, finishes, colors
create table if not exists public.material_variants (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  
  -- Variant details
  label text not null, -- e.g. "Quartz 20mm", "Laminate Finish", "Premium MDF"
  description text,
  sku text, -- Variant-specific SKU
  
  -- Pricing override (if different from material default_price)
  price_override decimal(10, 2), -- null means use material.default_price
  
  -- Status
  is_active boolean default true,
  sort_order int default 0,
  
  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Ensure unique variant labels per material
  unique(material_id, label)
);

-- Index for faster queries
create index idx_material_variants_material_id on public.material_variants(material_id);
create index idx_material_variants_is_active on public.material_variants(is_active);

-- Enable RLS
alter table public.material_variants enable row level security;

-- ============================================================================
-- 3. LABOUR_RATES TABLE (enhanced from existing)
-- ============================================================================
create table if not exists public.labour_rates_new (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  
  -- Trade/skill details
  trade text not null, -- e.g. "Carpenter", "Electrician", "Plumber", "General Labour"
  description text,
  
  -- Rate structure
  rate_type text not null default 'hourly', -- 'hourly', 'daily', 'per_unit', 'fixed'
  price decimal(10, 2) not null, -- Price per unit
  unit text not null default 'hour', -- 'hour', 'day', 'unit', or custom
  
  -- Pricing
  currency text default 'GBP',
  
  -- Status
  is_active boolean default true,
  sort_order int default 0,
  
  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Ensure unique trades per business
  unique(business_id, trade)
);

-- Index for faster queries
create index idx_labour_rates_business_id on public.labour_rates_new(business_id);
create index idx_labour_rates_is_active on public.labour_rates_new(is_active);

-- Enable RLS
alter table public.labour_rates_new enable row level security;

-- ============================================================================
-- 4. CLIENTS TABLE (if not already exists)
-- ============================================================================
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  
  -- Client details
  name text not null,
  email text,
  phone text,
  
  -- Contact address
  address_line_1 text,
  address_line_2 text,
  city text,
  postcode text,
  country text default 'GB',
  
  -- Additional info
  company_name text,
  vat_number text,
  notes text,
  
  -- Status
  is_active boolean default true,
  
  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for faster queries
create index idx_clients_business_id on public.clients(business_id);
create index idx_clients_email on public.clients(email);
create index idx_clients_is_active on public.clients(is_active);

-- Enable RLS
alter table public.clients enable row level security;

-- ============================================================================
-- 5. QUOTES TABLE
-- ============================================================================
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  
  -- Quote metadata
  quote_number text not null, -- e.g. "Q-2024-001"
  title text, -- e.g. "Kitchen Renovation - Phase 1"
  description text,
  
  -- Status
  status text not null default 'draft', 
  check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')),
  
  -- Dates
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  sent_at timestamptz,
  accepted_at timestamptz,
  valid_from timestamptz default now(),
  valid_until timestamptz, -- Expiry date
  
  -- Pricing details
  currency text default 'GBP',
  vat_rate decimal(5, 2) default 20, -- Percentage, e.g. 20 for 20%
  
  -- Discounts & markups
  discount_type text default 'none', -- 'none', 'percentage', 'fixed'
  discount_value decimal(10, 2), -- Either percentage (0-100) or fixed amount
  
  markup_type text default 'none', -- 'none', 'percentage', 'fixed'
  markup_value decimal(10, 2), -- Either percentage or fixed amount
  
  -- Deposit
  deposit_type text default 'none', -- 'none', 'percentage', 'fixed'
  deposit_value decimal(10, 2), -- Either percentage (0-100) or fixed amount
  
  -- Notes & terms
  terms_and_conditions text,
  notes text,
  
  -- Metadata
  created_by_user_id uuid references auth.users(id) on delete set null,
  
  -- Ensure unique quote numbers per business
  unique(business_id, quote_number)
);

-- Index for faster queries
create index idx_quotes_business_id on public.quotes(business_id);
create index idx_quotes_client_id on public.quotes(client_id);
create index idx_quotes_status on public.quotes(status);
create index idx_quotes_created_at on public.quotes(created_at);
create index idx_quotes_created_by_user_id on public.quotes(created_by_user_id);

-- Enable RLS
alter table public.quotes enable row level security;

-- ============================================================================
-- 6. QUOTE_ITEMS TABLE
-- ============================================================================
create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  
  -- Line item can be one of three types:
  -- 1. Material + optional variant
  -- 2. Labour rate
  -- 3. Custom line item
  
  material_id uuid references public.materials(id) on delete set null,
  material_variant_id uuid references public.material_variants(id) on delete set null,
  labour_rate_id uuid references public.labour_rates_new(id) on delete set null,
  
  -- For custom items (when material_id and labour_rate_id are both null)
  item_type text default 'material', -- 'material', 'labour', 'custom'
  custom_description text, -- Used when item_type = 'custom'
  
  -- Quantity
  quantity decimal(10, 2) not null default 1,
  
  -- Pricing
  unit_price decimal(10, 2) not null, -- Price per unit (before VAT)
  
  -- Line totals (calculated on insert/update)
  line_total decimal(10, 2) generated always as (quantity * unit_price) stored,
  
  -- Additional info
  notes text,
  sort_order int default 0,
  
  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for faster queries
create index idx_quote_items_quote_id on public.quote_items(quote_id);
create index idx_quote_items_material_id on public.quote_items(material_id);
create index idx_quote_items_labour_rate_id on public.quote_items(labour_rate_id);
create index idx_quote_items_sort_order on public.quote_items(sort_order);

-- Enable RLS
alter table public.quote_items enable row level security;

-- ============================================================================
-- 7. QUOTE_TOTALS_SNAPSHOT TABLE (optional, recommended for audit trail)
-- ============================================================================
create table if not exists public.quote_totals_snapshot (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  
  -- Totals
  subtotal decimal(10, 2) not null,
  discount_amount decimal(10, 2) default 0,
  markup_amount decimal(10, 2) default 0,
  vat_amount decimal(10, 2) default 0,
  total decimal(10, 2) not null,
  deposit_amount decimal(10, 2),
  
  -- Timestamp
  created_at timestamptz default now(),
  
  -- Notes
  notes text
);

-- Index for faster queries
create index idx_quote_totals_snapshot_quote_id on public.quote_totals_snapshot(quote_id);

-- Enable RLS
alter table public.quote_totals_snapshot enable row level security;

-- ============================================================================
-- RLS POLICIES - MATERIALS
-- ============================================================================
-- Staff/Admin can manage materials for their own business
create policy "Staff can view materials for their business"
  on public.materials for select
  using (
    exists (
      select 1 from public.staff_members
      where staff_members.business_id = materials.business_id
      and staff_members.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Staff can insert materials for their business"
  on public.materials for insert
  with check (
    exists (
      select 1 from public.staff_members
      where staff_members.business_id = materials.business_id
      and staff_members.user_id = auth.uid()
    )
  );

create policy "Staff can update materials for their business"
  on public.materials for update
  using (
    exists (
      select 1 from public.staff_members
      where staff_members.business_id = materials.business_id
      and staff_members.user_id = auth.uid()
    )
  );

create policy "Staff can delete materials for their business"
  on public.materials for delete
  using (
    exists (
      select 1 from public.staff_members
      where staff_members.business_id = materials.business_id
      and staff_members.user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - MATERIAL_VARIANTS
-- ============================================================================
create policy "Variants inherit material permissions"
  on public.material_variants for select
  using (
    exists (
      select 1 from public.materials
      where materials.id = material_variants.material_id
      and (
        exists (
          select 1 from public.staff_members
          where staff_members.business_id = materials.business_id
          and staff_members.user_id = auth.uid()
        )
        or
        exists (
          select 1 from public.profiles
          where profiles.id = auth.uid()
          and profiles.role = 'admin'
        )
      )
    )
  );

create policy "Staff can manage variants for their materials"
  on public.material_variants for insert
  with check (
    exists (
      select 1 from public.materials
      where materials.id = material_variants.material_id
      and exists (
        select 1 from public.staff_members
        where staff_members.business_id = materials.business_id
        and staff_members.user_id = auth.uid()
      )
    )
  );

create policy "Staff can update variants for their materials"
  on public.material_variants for update
  using (
    exists (
      select 1 from public.materials
      where materials.id = material_variants.material_id
      and exists (
        select 1 from public.staff_members
        where staff_members.business_id = materials.business_id
        and staff_members.user_id = auth.uid()
      )
    )
  );

create policy "Staff can delete variants for their materials"
  on public.material_variants for delete
  using (
    exists (
      select 1 from public.materials
      where materials.id = material_variants.material_id
      and exists (
        select 1 from public.staff_members
        where staff_members.business_id = materials.business_id
        and staff_members.user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- RLS POLICIES - LABOUR_RATES
-- ============================================================================
create policy "Staff can view labour rates for their business"
  on public.labour_rates_new for select
  using (
    exists (
      select 1 from public.staff_members
      where staff_members.business_id = labour_rates_new.business_id
      and staff_members.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Staff can manage labour rates for their business"
  on public.labour_rates_new for insert
  with check (
    exists (
      select 1 from public.staff_members
      where staff_members.business_id = labour_rates_new.business_id
      and staff_members.user_id = auth.uid()
    )
  );

create policy "Staff can update labour rates"
  on public.labour_rates_new for update
  using (
    exists (
      select 1 from public.staff_members
      where staff_members.business_id = labour_rates_new.business_id
      and staff_members.user_id = auth.uid()
    )
  );

create policy "Staff can delete labour rates"
  on public.labour_rates_new for delete
  using (
    exists (
      select 1 from public.staff_members
      where staff_members.business_id = labour_rates_new.business_id
      and staff_members.user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - CLIENTS
-- ============================================================================
create policy "Staff can manage clients for their business"
  on public.clients for select
  using (
    exists (
      select 1 from public.staff_members
      where staff_members.business_id = clients.business_id
      and staff_members.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Staff can create clients for their business"
  on public.clients for insert
  with check (
    exists (
      select 1 from public.staff_members
      where staff_members.business_id = clients.business_id
      and staff_members.user_id = auth.uid()
    )
  );

create policy "Staff can update clients for their business"
  on public.clients for update
  using (
    exists (
      select 1 from public.staff_members
      where staff_members.business_id = clients.business_id
      and staff_members.user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - QUOTES
-- ============================================================================
create policy "Staff can manage quotes for their business"
  on public.quotes for select
  using (
    exists (
      select 1 from public.staff_members
      where staff_members.business_id = quotes.business_id
      and staff_members.user_id = auth.uid()
    )
    or
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

create policy "Clients can view quotes addressed to them"
  on public.quotes for select
  using (
    exists (
      select 1 from public.clients
      where clients.id = quotes.client_id
      and exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
        and profiles.role = 'client'
      )
    )
  );

create policy "Accountants can view quotes for financial access"
  on public.quotes for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'accountant'
    )
  );

create policy "Staff can create quotes for their business"
  on public.quotes for insert
  with check (
    exists (
      select 1 from public.staff_members
      where staff_members.business_id = quotes.business_id
      and staff_members.user_id = auth.uid()
    )
  );

create policy "Staff can update their quotes"
  on public.quotes for update
  using (
    exists (
      select 1 from public.staff_members
      where staff_members.business_id = quotes.business_id
      and staff_members.user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES - QUOTE_ITEMS
-- ============================================================================
create policy "Quote items inherit quote permissions"
  on public.quote_items for select
  using (
    exists (
      select 1 from public.quotes
      where quotes.id = quote_items.quote_id
      and (
        exists (
          select 1 from public.staff_members
          where staff_members.business_id = quotes.business_id
          and staff_members.user_id = auth.uid()
        )
        or
        exists (
          select 1 from public.profiles
          where profiles.id = auth.uid()
          and profiles.role = 'admin'
        )
      )
    )
  );

create policy "Staff can manage quote items"
  on public.quote_items for insert
  with check (
    exists (
      select 1 from public.quotes
      where quotes.id = quote_items.quote_id
      and exists (
        select 1 from public.staff_members
        where staff_members.business_id = quotes.business_id
        and staff_members.user_id = auth.uid()
      )
    )
  );

create policy "Staff can update quote items"
  on public.quote_items for update
  using (
    exists (
      select 1 from public.quotes
      where quotes.id = quote_items.quote_id
      and exists (
        select 1 from public.staff_members
        where staff_members.business_id = quotes.business_id
        and staff_members.user_id = auth.uid()
      )
    )
  );

create policy "Staff can delete quote items"
  on public.quote_items for delete
  using (
    exists (
      select 1 from public.quotes
      where quotes.id = quote_items.quote_id
      and exists (
        select 1 from public.staff_members
        where staff_members.business_id = quotes.business_id
        and staff_members.user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- RLS POLICIES - QUOTE_TOTALS_SNAPSHOT
-- ============================================================================
create policy "Totals inherit quote permissions"
  on public.quote_totals_snapshot for select
  using (
    exists (
      select 1 from public.quotes
      where quotes.id = quote_totals_snapshot.quote_id
      and (
        exists (
          select 1 from public.staff_members
          where staff_members.business_id = quotes.business_id
          and staff_members.user_id = auth.uid()
        )
        or
        exists (
          select 1 from public.profiles
          where profiles.id = auth.uid()
          and profiles.role in ('admin', 'accountant')
        )
      )
    )
  );
