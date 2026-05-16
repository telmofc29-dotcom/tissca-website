-- ═══════════════════════════════════════════════════════════════════════
-- TISSCA Phase E1: Room Layouts / Visual Planner Foundation
-- BEST SAFE VERSION FOR CURRENT DATABASE
--
-- Run in Supabase SQL Editor.
-- This version is aligned to TISSCA's workspace-based architecture.
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- 0. Helper trigger function (shared pattern)
-- ───────────────────────────────────────────────────────────────────────
create or replace function public.set_room_layouts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ───────────────────────────────────────────────────────────────────────
-- 1. Main table
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.room_layouts (
  id uuid primary key default gen_random_uuid(),

  -- Multi-tenant ownership
  workspace_id uuid not null references public.workspaces(id) on delete cascade,

  -- Basic metadata
  name text not null default 'Untitled Layout',
  description text,

  layout_type text not null default 'kitchen'
    check (layout_type in ('kitchen', 'wardrobe', 'bathroom', 'utility', 'general')),

  status text not null default 'draft'
    check (status in ('draft', 'in_progress', 'completed', 'archived')),

  -- Versioned planner document
  -- Expected to store walls, openings, modules, dimensions, view settings, etc.
  layout_data jsonb not null default '{}'::jsonb,

  -- Optional CRM linkage
  lead_id uuid references public.leads(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,

  -- Future scan / import provenance
  scan_source text,
  scan_metadata jsonb not null default '{}'::jsonb,

  -- Ownership / audit
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────────
-- 2. Indexes
-- ───────────────────────────────────────────────────────────────────────
create index if not exists idx_room_layouts_workspace_id
  on public.room_layouts(workspace_id);

create index if not exists idx_room_layouts_status
  on public.room_layouts(status);

create index if not exists idx_room_layouts_layout_type
  on public.room_layouts(layout_type);

create index if not exists idx_room_layouts_lead_id
  on public.room_layouts(lead_id);

create index if not exists idx_room_layouts_job_id
  on public.room_layouts(job_id);

create index if not exists idx_room_layouts_created_at
  on public.room_layouts(created_at desc);

create index if not exists idx_room_layouts_updated_at
  on public.room_layouts(updated_at desc);

-- Optional jsonb GIN index for future querying inside layout_data
create index if not exists idx_room_layouts_layout_data_gin
  on public.room_layouts
  using gin (layout_data);

-- ───────────────────────────────────────────────────────────────────────
-- 3. Enable RLS
-- ───────────────────────────────────────────────────────────────────────
alter table public.room_layouts enable row level security;

-- ───────────────────────────────────────────────────────────────────────
-- 4. Policies
-- ───────────────────────────────────────────────────────────────────────

-- Service role full access (for API routes using service-role key)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'room_layouts'
      and policyname = 'Service role full access on room_layouts'
  ) then
    create policy "Service role full access on room_layouts"
      on public.room_layouts
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;

-- Optional authenticated read/write for own workspace membership
-- This assumes your project uses public.workspace_members(user_id, workspace_id)
-- If that table does not exist, COMMENT THIS BLOCK OUT before running.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'workspace_members'
  ) then

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'room_layouts'
        and policyname = 'Workspace members can view room layouts'
    ) then
      create policy "Workspace members can view room layouts"
        on public.room_layouts
        for select
        using (
          exists (
            select 1
            from public.workspace_members wm
            where wm.workspace_id = room_layouts.workspace_id
              and wm.user_id = auth.uid()
          )
        );
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'room_layouts'
        and policyname = 'Workspace members can insert room layouts'
    ) then
      create policy "Workspace members can insert room layouts"
        on public.room_layouts
        for insert
        with check (
          exists (
            select 1
            from public.workspace_members wm
            where wm.workspace_id = room_layouts.workspace_id
              and wm.user_id = auth.uid()
          )
        );
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'room_layouts'
        and policyname = 'Workspace members can update room layouts'
    ) then
      create policy "Workspace members can update room layouts"
        on public.room_layouts
        for update
        using (
          exists (
            select 1
            from public.workspace_members wm
            where wm.workspace_id = room_layouts.workspace_id
              and wm.user_id = auth.uid()
          )
        )
        with check (
          exists (
            select 1
            from public.workspace_members wm
            where wm.workspace_id = room_layouts.workspace_id
              and wm.user_id = auth.uid()
          )
        );
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'room_layouts'
        and policyname = 'Workspace members can delete room layouts'
    ) then
      create policy "Workspace members can delete room layouts"
        on public.room_layouts
        for delete
        using (
          exists (
            select 1
            from public.workspace_members wm
            where wm.workspace_id = room_layouts.workspace_id
              and wm.user_id = auth.uid()
          )
        );
    end if;

  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────
-- 5. Trigger
-- ───────────────────────────────────────────────────────────────────────
drop trigger if exists trg_room_layouts_updated_at on public.room_layouts;

create trigger trg_room_layouts_updated_at
before update on public.room_layouts
for each row
execute function public.set_room_layouts_updated_at();

-- ───────────────────────────────────────────────────────────────────────
-- 6. Helpful comments
-- ───────────────────────────────────────────────────────────────────────
comment on table public.room_layouts is
'TISSCA room planner layouts for kitchen / wardrobe / bathroom / utility / general planning. Supports manual builder now and future LiDAR scan import later.';

comment on column public.room_layouts.layout_data is
'Versioned JSON document storing room geometry, openings, placed modules, dimensions, and planner UI state.';

comment on column public.room_layouts.scan_source is
'Origin of layout data, e.g. manual, lidar_iphone, lidar_ipad, imported.';

comment on column public.room_layouts.scan_metadata is
'Additional scan provenance such as device info, timestamps, confidence, point-cloud references.';

-- ───────────────────────────────────────────────────────────────────────
-- 7. Verification output
-- ───────────────────────────────────────────────────────────────────────
select
  'room_layouts ready' as status,
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'room_layouts'
  ) as table_created;