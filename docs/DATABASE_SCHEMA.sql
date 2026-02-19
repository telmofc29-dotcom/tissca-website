-- BUILDR Phase C0: Role-Based Dashboard Database Schema
-- BUILDR is a construction/renovation SaaS for contractors, accountants, and clients.
-- Roles: admin (BUILDR team), staff (contractors), accountant (financial), client (end customer)
-- Run this SQL in Supabase SQL Editor

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null check (role in ('admin', 'accountant', 'staff', 'client')),
  business_id uuid,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- 2. BUSINESSES TABLE
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  subscription_status text default 'free' check (subscription_status in ('free', 'trial', 'active', 'past_due', 'cancelled')),
  plan text default 'free',
  logo_url text,
  website text,
  industry text,
  employees_count int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS on businesses
alter table public.businesses enable row level security;

-- 3. STAFF_MEMBERS TABLE
create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text default 'staff',
  permissions jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(business_id, user_id)
);

-- Enable RLS on staff_members
alter table public.staff_members enable row level security;

-- 4. MATERIALS_CATALOG TABLE
create table if not exists public.materials_catalog (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category text not null,
  name text not null,
  unit text not null default 'each',
  default_price decimal(10, 2) not null,
  currency text default 'GBP',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS on materials_catalog
alter table public.materials_catalog enable row level security;

-- 5. LABOUR_RATES TABLE
create table if not exists public.labour_rates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  trade text not null,
  rate_type text not null default 'hourly',
  price decimal(10, 2) not null,
  unit text default 'hour',
  currency text default 'GBP',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS on labour_rates
alter table public.labour_rates enable row level security;

-- RLS POLICIES FOR PROFILES
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admin can view all profiles"
  on public.profiles for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- RLS POLICIES FOR BUSINESSES
create policy "Business owner and staff can view their business"
  on public.businesses for select
  using (
    owner_user_id = auth.uid() or
    exists (select 1 from public.staff_members where business_id = id and user_id = auth.uid()) or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Business owner can update their business"
  on public.businesses for update
  using (owner_user_id = auth.uid());

-- RLS POLICIES FOR STAFF_MEMBERS
create policy "Business owner and staff can view staff"
  on public.staff_members for select
  using (
    exists (select 1 from public.businesses where id = business_id and owner_user_id = auth.uid()) or
    user_id = auth.uid() or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- RLS POLICIES FOR MATERIALS_CATALOG
create policy "Users can view materials for their business"
  on public.materials_catalog for select
  using (
    exists (select 1 from public.businesses where id = business_id and owner_user_id = auth.uid()) or
    exists (select 1 from public.staff_members where business_id = business_id and user_id = auth.uid()) or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Business owner can insert materials"
  on public.materials_catalog for insert
  with check (
    exists (select 1 from public.businesses where id = business_id and owner_user_id = auth.uid())
  );

create policy "Business owner can update materials"
  on public.materials_catalog for update
  using (
    exists (select 1 from public.businesses where id = business_id and owner_user_id = auth.uid())
  );

-- RLS POLICIES FOR LABOUR_RATES
create policy "Users can view labour rates for their business"
  on public.labour_rates for select
  using (
    exists (select 1 from public.businesses where id = business_id and owner_user_id = auth.uid()) or
    exists (select 1 from public.staff_members where business_id = business_id and user_id = auth.uid()) or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Business owner can insert labour rates"
  on public.labour_rates for insert
  with check (
    exists (select 1 from public.businesses where id = business_id and owner_user_id = auth.uid())
  );

create policy "Business owner can update labour rates"
  on public.labour_rates for update
  using (
    exists (select 1 from public.businesses where id = business_id and owner_user_id = auth.uid())
  );

-- INDEXES FOR PERFORMANCE
create index idx_profiles_role on public.profiles(role);
create index idx_profiles_business_id on public.profiles(business_id);
create index idx_businesses_owner_user_id on public.businesses(owner_user_id);
create index idx_staff_members_business_id on public.staff_members(business_id);
create index idx_staff_members_user_id on public.staff_members(user_id);
create index idx_materials_catalog_business_id on public.materials_catalog(business_id);
create index idx_labour_rates_business_id on public.labour_rates(business_id);

-- ============================================================================
-- PHASE C1: QUOTES DATA MODEL
-- ============================================================================
-- Comprehensive quote engine with materials, variants, labour rates, and quotes
-- See supabase/sql/phase_c1_quotes.sql for complete implementation

-- 6. MATERIALS TABLE
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  category text not null,
  description text,
  sku text,
  unit text not null default 'each',
  default_price decimal(10, 2) not null,
  currency text default 'GBP',
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(business_id, name)
);
alter table public.materials enable row level security;
create index idx_materials_business_id on public.materials(business_id);
create index idx_materials_category on public.materials(category);
create index idx_materials_is_active on public.materials(is_active);

-- 7. MATERIAL_VARIANTS TABLE
create table if not exists public.material_variants (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  label text not null,
  description text,
  sku text,
  price_override decimal(10, 2),
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(material_id, label)
);
alter table public.material_variants enable row level security;
create index idx_material_variants_material_id on public.material_variants(material_id);
create index idx_material_variants_is_active on public.material_variants(is_active);

-- 8. LABOUR_RATES_NEW TABLE (enhanced labour rates)
create table if not exists public.labour_rates_new (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  trade text not null,
  description text,
  rate_type text not null default 'hourly',
  price decimal(10, 2) not null,
  unit text not null default 'hour',
  currency text default 'GBP',
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(business_id, trade)
);
alter table public.labour_rates_new enable row level security;
create index idx_labour_rates_new_business_id on public.labour_rates_new(business_id);
create index idx_labour_rates_new_is_active on public.labour_rates_new(is_active);

-- 9. CLIENTS TABLE
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address_line_1 text,
  address_line_2 text,
  city text,
  postcode text,
  country text default 'GB',
  company_name text,
  vat_number text,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.clients enable row level security;
create index idx_clients_business_id on public.clients(business_id);
create index idx_clients_email on public.clients(email);
create index idx_clients_is_active on public.clients(is_active);

-- 10. QUOTES TABLE
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  quote_number text not null,
  title text,
  description text,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  sent_at timestamptz,
  accepted_at timestamptz,
  valid_from timestamptz default now(),
  valid_until timestamptz,
  currency text default 'GBP',
  vat_rate decimal(5, 2) default 20,
  discount_type text default 'none',
  discount_value decimal(10, 2),
  markup_type text default 'none',
  markup_value decimal(10, 2),
  deposit_type text default 'none',
  deposit_value decimal(10, 2),
  terms_and_conditions text,
  notes text,
  created_by_user_id uuid references auth.users(id) on delete set null,
  unique(business_id, quote_number)
);
alter table public.quotes enable row level security;
create index idx_quotes_business_id on public.quotes(business_id);
create index idx_quotes_client_id on public.quotes(client_id);
create index idx_quotes_status on public.quotes(status);
create index idx_quotes_created_at on public.quotes(created_at);
create index idx_quotes_created_by_user_id on public.quotes(created_by_user_id);

-- 11. QUOTE_ITEMS TABLE
create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  material_id uuid references public.materials(id) on delete set null,
  material_variant_id uuid references public.material_variants(id) on delete set null,
  labour_rate_id uuid references public.labour_rates_new(id) on delete set null,
  item_type text default 'material',
  custom_description text,
  quantity decimal(10, 2) not null default 1,
  unit_price decimal(10, 2) not null,
  line_total decimal(10, 2) generated always as (quantity * unit_price) stored,
  notes text,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.quote_items enable row level security;
create index idx_quote_items_quote_id on public.quote_items(quote_id);
create index idx_quote_items_material_id on public.quote_items(material_id);
create index idx_quote_items_labour_rate_id on public.quote_items(labour_rate_id);
create index idx_quote_items_sort_order on public.quote_items(sort_order);

-- 12. QUOTE_TOTALS_SNAPSHOT TABLE (audit trail for pricing)
create table if not exists public.quote_totals_snapshot (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  subtotal decimal(10, 2) not null,
  discount_amount decimal(10, 2) default 0,
  markup_amount decimal(10, 2) default 0,
  vat_amount decimal(10, 2) default 0,
  total decimal(10, 2) not null,
  deposit_amount decimal(10, 2),
  created_at timestamptz default now(),
  notes text
);
alter table public.quote_totals_snapshot enable row level security;
create index idx_quote_totals_snapshot_quote_id on public.quote_totals_snapshot(quote_id);
