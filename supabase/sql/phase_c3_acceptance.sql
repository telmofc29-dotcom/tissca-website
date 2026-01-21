-- BUILDR Phase C3: Client Acceptance Flow & Quote Revisions
-- Implements acceptance audit trail, immutable snapshots, and quote versioning
-- Run this SQL in Supabase SQL Editor after Phase C1

-- ============================================================================
-- 1. ALTER QUOTES TABLE - Add acceptance audit fields
-- ============================================================================
alter table public.quotes
add column if not exists accepted_by uuid references auth.users(id) on delete set null,
add column if not exists acceptance_ip text,
add column if not exists acceptance_note text,
add column if not exists rejected_at timestamptz,
add column if not exists rejected_by uuid references auth.users(id) on delete set null,
add column if not exists rejection_reason text,
add column if not exists is_locked boolean default false;

-- Create index for locked quotes
create index if not exists idx_quotes_is_locked on public.quotes(is_locked);
create index if not exists idx_quotes_accepted_at on public.quotes(accepted_at);
create index if not exists idx_quotes_rejected_at on public.quotes(rejected_at);

-- ============================================================================
-- 2. QUOTE_ACCEPTANCE_SNAPSHOT TABLE
-- ============================================================================
-- Immutable record of quote items and totals at the moment of acceptance
-- Prevents disputes if staff edit the quote after client accepts
create table if not exists public.quote_acceptance_snapshot (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  
  -- Snapshot metadata
  accepted_at timestamptz not null default now(),
  accepted_by uuid not null references auth.users(id) on delete restrict,
  acceptance_ip text,
  
  -- Immutable copy of line items at time of acceptance
  items_snapshot jsonb not null, -- JSON array of quote items
  
  -- Immutable copy of totals at time of acceptance
  subtotal decimal(10, 2) not null,
  discount_amount decimal(10, 2) not null default 0,
  markup_amount decimal(10, 2) not null default 0,
  vat_amount decimal(10, 2) not null default 0,
  total decimal(10, 2) not null,
  deposit_amount decimal(10, 2),
  balance_due decimal(10, 2) not null,
  
  -- Optional note from acceptance event
  acceptance_note text,
  
  -- Metadata
  created_at timestamptz default now(),
  
  -- Ensure one acceptance per quote
  unique(quote_id)
);

-- Indexes
create index if not exists idx_quote_acceptance_snapshot_quote_id on public.quote_acceptance_snapshot(quote_id);
create index if not exists idx_quote_acceptance_snapshot_accepted_by on public.quote_acceptance_snapshot(accepted_by);
create index if not exists idx_quote_acceptance_snapshot_accepted_at on public.quote_acceptance_snapshot(accepted_at);

-- Enable RLS
alter table public.quote_acceptance_snapshot enable row level security;

-- ============================================================================
-- 3. QUOTE_REVISIONS TABLE
-- ============================================================================
-- Track all changes to a quote for audit trail and to support revisions
-- when a quote is locked (staff creates revision instead of editing)
create table if not exists public.quote_revisions (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  
  -- Revision metadata
  revision_number int not null, -- 1, 2, 3, etc (auto-increment per quote)
  parent_revision_id uuid references public.quote_revisions(id) on delete set null, -- For tracking lineage
  
  -- Change tracking
  changed_by uuid not null references auth.users(id) on delete restrict,
  changed_at timestamptz not null default now(),
  change_reason text, -- Why was this revision created?
  
  -- Snapshot of quote state at this revision
  quote_data jsonb not null, -- Full quote object at this revision
  items_data jsonb not null, -- Array of quote items at this revision
  totals_data jsonb not null, -- Calculated totals at this revision
  
  -- Metadata
  created_at timestamptz default now(),
  
  -- Ensure unique revision numbers per quote
  unique(quote_id, revision_number)
);

-- Indexes
create index if not exists idx_quote_revisions_quote_id on public.quote_revisions(quote_id);
create index if not exists idx_quote_revisions_changed_by on public.quote_revisions(changed_by);
create index if not exists idx_quote_revisions_changed_at on public.quote_revisions(changed_at);
create index if not exists idx_quote_revisions_parent on public.quote_revisions(parent_revision_id);

-- Enable RLS
alter table public.quote_revisions enable row level security;

-- ============================================================================
-- 4. RLS POLICIES - QUOTES (updated to respect locking)
-- ============================================================================
-- Clients can only view quotes assigned to them
create policy "Clients can view their own quotes"
  on public.quotes for select
  using (
    exists (
      select 1 from public.clients
      where clients.id = quotes.client_id
      and (
        -- If quote has a client relationship to user_profiles
        select count(*) from public.user_profiles
        where user_profiles.client_id = clients.id
        and user_profiles.user_id = auth.uid()
      ) > 0
    )
    or
    exists (
      select 1 from public.staff_members
      where staff_members.business_id = quotes.business_id
      and staff_members.user_id = auth.uid()
    )
  );

-- Staff/Admin can update quotes only if not locked
create policy "Staff can update unlocked quotes"
  on public.quotes for update
  using (
    is_locked = false
    and exists (
      select 1 from public.staff_members
      where staff_members.business_id = quotes.business_id
      and staff_members.user_id = auth.uid()
    )
  );

-- RLS policies for quote acceptance/rejection (handled via functions)

-- ============================================================================
-- 5. RLS POLICIES - QUOTE_ACCEPTANCE_SNAPSHOT
-- ============================================================================
create policy "Staff and clients can view acceptance snapshot"
  on public.quote_acceptance_snapshot for select
  using (
    exists (
      select 1 from public.quotes
      where quotes.id = quote_acceptance_snapshot.quote_id
      and (
        exists (
          select 1 from public.staff_members
          where staff_members.business_id = quotes.business_id
          and staff_members.user_id = auth.uid()
        )
        or
        quotes.client_id = (
          select client_id from public.user_profiles
          where user_profiles.user_id = auth.uid()
          limit 1
        )
      )
    )
  );

-- ============================================================================
-- 6. RLS POLICIES - QUOTE_REVISIONS
-- ============================================================================
create policy "Staff can view revisions for their business"
  on public.quote_revisions for select
  using (
    exists (
      select 1 from public.quotes
      where quotes.id = quote_revisions.quote_id
      and exists (
        select 1 from public.staff_members
        where staff_members.business_id = quotes.business_id
        and staff_members.user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- 7. HELPER FUNCTION: Get next revision number
-- ============================================================================
create or replace function get_next_revision_number(quote_uuid uuid)
returns int as $$
  select coalesce(max(revision_number), 0) + 1
  from public.quote_revisions
  where quote_id = quote_uuid;
$$ language sql stable;

-- ============================================================================
-- 8. HELPER FUNCTION: Accept quote (creates snapshot, locks quote)
-- ============================================================================
create or replace function accept_quote(
  quote_uuid uuid,
  accepted_by_user uuid,
  client_ip text default null,
  note text default null
)
returns jsonb as $$
declare
  v_items jsonb;
  v_subtotal decimal;
  v_discount_amount decimal;
  v_markup_amount decimal;
  v_vat_amount decimal;
  v_total decimal;
  v_deposit_amount decimal;
  v_balance_due decimal;
  v_quote_data jsonb;
begin
  -- Fetch current quote and validate
  select row_to_json(row) into v_quote_data from (
    select * from public.quotes where id = quote_uuid
  ) row;

  if v_quote_data is null then
    raise exception 'Quote not found';
  end if;

  if (v_quote_data->>'status')::text not in ('draft', 'sent') then
    raise exception 'Only draft or sent quotes can be accepted';
  end if;

  -- Fetch all quote items as JSON snapshot
  select jsonb_agg(row_to_json(row) order by sort_order)
  into v_items
  from public.quote_items
  where quote_id = quote_uuid;

  -- Calculate totals (simplified - in practice would call calculateQuoteTotals)
  select coalesce(sum(line_total), 0) into v_subtotal
  from public.quote_items
  where quote_id = quote_uuid;

  -- For now, use placeholder values - API endpoint will calculate properly
  v_discount_amount := 0;
  v_markup_amount := 0;
  v_vat_amount := v_subtotal * 0.2; -- Assume 20% VAT
  v_total := v_subtotal + v_vat_amount;
  v_balance_due := v_total;
  v_deposit_amount := null;

  -- Create acceptance snapshot
  insert into public.quote_acceptance_snapshot (
    quote_id,
    accepted_by,
    acceptance_ip,
    items_snapshot,
    subtotal,
    discount_amount,
    markup_amount,
    vat_amount,
    total,
    deposit_amount,
    balance_due,
    acceptance_note
  ) values (
    quote_uuid,
    accepted_by_user,
    client_ip,
    v_items,
    v_subtotal,
    v_discount_amount,
    v_markup_amount,
    v_vat_amount,
    v_total,
    v_deposit_amount,
    v_balance_due,
    note
  );

  -- Update quote: set status, acceptance timestamp, lock it
  update public.quotes
  set
    status = 'accepted',
    accepted_at = now(),
    accepted_by = accepted_by_user,
    acceptance_ip = client_ip,
    acceptance_note = note,
    is_locked = true,
    updated_at = now()
  where id = quote_uuid;

  return jsonb_build_object(
    'success', true,
    'quote_id', quote_uuid,
    'status', 'accepted',
    'message', 'Quote accepted and locked for editing'
  );
end;
$$ language plpgsql security definer;

-- ============================================================================
-- 9. HELPER FUNCTION: Reject quote
-- ============================================================================
create or replace function reject_quote(
  quote_uuid uuid,
  rejected_by_user uuid,
  reason text
)
returns jsonb as $$
declare
  v_quote_data jsonb;
begin
  -- Fetch current quote and validate
  select row_to_json(row) into v_quote_data from (
    select * from public.quotes where id = quote_uuid
  ) row;

  if v_quote_data is null then
    raise exception 'Quote not found';
  end if;

  if (v_quote_data->>'status')::text not in ('draft', 'sent') then
    raise exception 'Only draft or sent quotes can be rejected';
  end if;

  -- Update quote: set status, rejection timestamp
  update public.quotes
  set
    status = 'rejected',
    rejected_at = now(),
    rejected_by = rejected_by_user,
    rejection_reason = reason,
    updated_at = now()
  where id = quote_uuid;

  return jsonb_build_object(
    'success', true,
    'quote_id', quote_uuid,
    'status', 'rejected',
    'message', 'Quote rejected'
  );
end;
$$ language plpgsql security definer;

-- ============================================================================
-- 10. HELPER FUNCTION: Create quote revision
-- ============================================================================
create or replace function create_quote_revision(
  quote_uuid uuid,
  user_id uuid,
  reason text
)
returns jsonb as $$
declare
  v_revision_number int;
  v_quote_data jsonb;
  v_items_data jsonb;
  v_totals_data jsonb;
  v_parent_revision_id uuid;
begin
  -- Get next revision number
  v_revision_number := get_next_revision_number(quote_uuid);

  -- Fetch current quote data
  select row_to_json(row) into v_quote_data from (
    select * from public.quotes where id = quote_uuid
  ) row;

  if v_quote_data is null then
    raise exception 'Quote not found';
  end if;

  -- Fetch current items as JSON
  select jsonb_agg(row_to_json(row) order by sort_order)
  into v_items_data
  from public.quote_items
  where quote_id = quote_uuid;

  -- Create placeholder totals data (API endpoint will calculate properly)
  v_totals_data := jsonb_build_object(
    'subtotal', 0,
    'discount_amount', 0,
    'markup_amount', 0,
    'vat_amount', 0,
    'total', 0,
    'balance_due', 0
  );

  -- Get parent revision (if any)
  select id into v_parent_revision_id from public.quote_revisions
  where quote_id = quote_uuid
  order by revision_number desc
  limit 1;

  -- Create revision record
  insert into public.quote_revisions (
    quote_id,
    revision_number,
    parent_revision_id,
    changed_by,
    change_reason,
    quote_data,
    items_data,
    totals_data
  ) values (
    quote_uuid,
    v_revision_number,
    v_parent_revision_id,
    user_id,
    reason,
    v_quote_data,
    v_items_data,
    v_totals_data
  );

  return jsonb_build_object(
    'success', true,
    'quote_id', quote_uuid,
    'revision_number', v_revision_number,
    'message', 'Quote revision created'
  );
end;
$$ language plpgsql security definer;
