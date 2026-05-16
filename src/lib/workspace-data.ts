// src/lib/workspace-data.ts v2.1
//
// PURPOSE:
// Server-side helpers to resolve authenticated user context and query ALL
// operational tables via Supabase PostgREST (service role).
//
// ARCHITECTURE (v2.0 – CORRECTION PASS):
// - ALL CRM entities use Supabase-native tables (snake_case, UUID, workspace_id-scoped).
// - NO Prisma table references for operational entities.
// - Tables: leads, jobs, tasks, assets, documents, tool_attachments, payment_requests, crm_history
// - Also: quotes, invoices, clients, materials (already Supabase-native).
//
// This module is API-route-only. Never import from client components.

import { createServerSupabaseClient } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ResolvedUser = {
  authId: string;           // Supabase auth UUID
  businessId: string | null; // LEGACY — kept for compat, equals workspaceId
  workspaceId: string | null; // UUID from workspace_members / user_profiles — primary scope key
};

// ─── Resolution ──────────────────────────────────────────────────────────────

/**
 * Resolve the authenticated user's identifiers from a valid bearer token.
 * Uses service-role Supabase client to bypass RLS.
 *
 * Resolution chain for workspaceId (primary scope key):
 *   1. user_profiles.current_workspace_id (preferred — already cached)
 *   2. workspace_members.workspace_id (fallback — direct lookup)
 *   3. Auto-provision workspace if none exists
 *
 * businessId is set equal to workspaceId for backward compat with any
 * code paths that still reference it.
 */
export async function resolveUserFromToken(token: string): Promise<ResolvedUser | null> {
  const supabase = createServerSupabaseClient();

  // 1) Verify token
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  let workspaceId: string | null = null;

  // 2) Primary: user_profiles.current_workspace_id
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('current_workspace_id')
    .eq('id', user.id)
    .maybeSingle();

  workspaceId = userProfile?.current_workspace_id ?? null;

  // 3) Fallback: workspace_members (first membership)
  if (!workspaceId) {
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    workspaceId = membership?.workspace_id ?? null;

    // If found via membership but user_profiles didn't have it, cache it
    if (workspaceId) {
      await supabase
        .from('user_profiles')
        .upsert(
          { id: user.id, current_workspace_id: workspaceId, email: user.email || '' },
          { onConflict: 'id' },
        );
    }
  }

  // 4) Auto-provision if still no workspace
  if (!workspaceId) {
    console.log('[resolveUserFromToken] No workspace found — auto-provisioning for', user.id);
    workspaceId = await autoProvisionWorkspace(supabase, user.id, '');
  }

  // businessId = workspaceId for backward compat
  const businessId = workspaceId;

  return {
    authId: user.id,
    businessId,
    workspaceId,
  };
}

// ─── Auto-Provisioning ──────────────────────────────────────────────────────

/**
 * Auto-create a workspace and link it to the user.
 * Called when user has a business but no workspace.
 */
async function autoProvisionWorkspace(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  authId: string,
  _businessId: string,
): Promise<string | null> {
  try {
    // Check if user already has a workspace (race-safe)
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', authId)
      .limit(1)
      .maybeSingle();

    if (existingMember?.workspace_id) {
      // Ensure user_profiles points to this workspace
      await supabase
        .from('user_profiles')
        .upsert(
          { id: authId, current_workspace_id: existingMember.workspace_id },
          { onConflict: 'id' },
        );
      return existingMember.workspace_id;
    }

    const { data: ws, error: wsErr } = await supabase
      .from('workspaces')
      .insert({
        name: 'My Workspace',
        created_by: authId,
        plan_tier: 'free',
      })
      .select('id')
      .single();

    if (wsErr || !ws) {
      console.error('[autoProvisionWorkspace] Failed:', wsErr?.message);
      return null;
    }

    // Link user to workspace
    await supabase
      .from('workspace_members')
      .upsert({ user_id: authId, workspace_id: ws.id, role: 'owner' }, { onConflict: 'user_id,workspace_id' })
      .select();

    // Set as current workspace in user_profiles
    await supabase
      .from('user_profiles')
      .upsert(
        { id: authId, current_workspace_id: ws.id },
        { onConflict: 'id' },
      );

    return ws.id;
  } catch (err) {
    console.error('[autoProvisionWorkspace] Error:', err);
    return null;
  }
}

// ─── Count Helpers ───────────────────────────────────────────────────────────

/**
 * Count rows in a table with optional filters. Uses service role.
 * Returns 0 if the table doesn't exist or query fails.
 */
async function countRows(
  table: string,
  filters: Record<string, unknown>,
): Promise<number> {
  try {
    const supabase = createServerSupabaseClient();
    let query = supabase.from(table).select('id', { count: 'exact', head: true });
    for (const [col, val] of Object.entries(filters)) {
      if (Array.isArray(val)) {
        query = query.in(col, val);
      } else {
        query = query.eq(col, val as string);
      }
    }
    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Sum a numeric column. Uses service role.
 * Returns 0 if query fails.
 */
async function sumColumn(
  table: string,
  column: string,
  filters: Record<string, unknown>,
): Promise<number> {
  try {
    const supabase = createServerSupabaseClient();
    let query = supabase.from(table).select(column);
    for (const [col, val] of Object.entries(filters)) {
      if (Array.isArray(val)) {
        query = query.in(col, val);
      } else {
        query = query.eq(col, val as string);
      }
    }
    const { data, error } = await query;
    if (error || !data) return 0;
    return (data as unknown as Record<string, number>[]).reduce((sum, row) => sum + (row[column] || 0), 0);
  } catch {
    return 0;
  }
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export type WorkspaceStats = {
  leads: { total: number; new: number; quoted: number; won: number; lost: number };
  jobs: { total: number; active: number; completed: number };
  tasks: { total: number; pending: number; in_progress: number; completed: number };
  quotes: { total: number; open: number; total_value: number };
  invoices: {
    total: number;
    outstanding: number;
    outstanding_value: number;
    paid: number;
    draft: number;
  };
  earnings: {
    yearGross: number;
    monthGross: number;
    monthNet: number;
    materials: number;
  };
  conversion: number;
  documents: {
    invoicesGenerated: number;
    quotesGenerated: number;
  };
};

/**
 * Fetch workspace stats from Supabase-native tables only.
 * Queries scope by workspace_id (preferred) or created_by (fallback).
 */
export async function getWorkspaceStats(resolved: ResolvedUser): Promise<WorkspaceStats> {
  // Build scope filter: workspace_id (primary) or created_by (fallback)
  const wsId = resolved.workspaceId ?? resolved.businessId;
  const scopeKey = wsId ? 'workspace_id' : 'created_by';
  const scopeVal = wsId ?? resolved.authId;
  const scope: Record<string, unknown> = { [scopeKey]: scopeVal };

  // ── Leads (Supabase-native "leads" table) ──
  const [leadsTotal, leadsNew, leadsQuoted, leadsWon, leadsLost] = await Promise.all([
    countRows('leads', scope),
    countRows('leads', { ...scope, status: 'NEW' }),
    countRows('leads', { ...scope, status: 'QUOTED' }),
    countRows('leads', { ...scope, status: 'WON' }),
    countRows('leads', { ...scope, status: 'LOST' }),
  ]);

  // ── Jobs (Supabase-native "jobs" table) ──
  const [jobsTotal, jobsActive, jobsCompleted] = await Promise.all([
    countRows('jobs', scope),
    countRows('jobs', { ...scope, status: ['SCHEDULED', 'IN_PROGRESS'] }),
    countRows('jobs', { ...scope, status: 'COMPLETED' }),
  ]);

  // ── Tasks (live schema uses workspace_id, not business_id) ──
  const taskWsId = resolved.workspaceId ?? resolved.businessId;
  const [tasksTotal, tasksPending, tasksInProgress, tasksCompleted] = taskWsId
    ? await Promise.all([
        countRows('tasks', { workspace_id: taskWsId }),
        countRows('tasks', { workspace_id: taskWsId, status: ['pending', 'OPEN'] }),
        countRows('tasks', { workspace_id: taskWsId, status: ['in_progress'] }),
        countRows('tasks', { workspace_id: taskWsId, status: ['completed', 'done', 'COMPLETED'] }),
      ])
    : [0, 0, 0, 0];

  // ── Quotes (Supabase-native "quotes" table) ──
  const [quotesTotal, quotesOpen, quotesTotalValue] = await Promise.all([
    countRows('quotes', scope),
    countRows('quotes', { ...scope, status: ['draft', 'sent'] }),
    sumColumn('quotes', 'total', scope),
  ]);

  // ── Invoices (Supabase-native "invoices" table) ──
  const [invoicesTotal, invoicesOutstanding, invoicesPaid, invoicesDraft] = await Promise.all([
    countRows('invoices', scope),
    countRows('invoices', { ...scope, status: ['sent', 'overdue', 'partially_paid'] }),
    countRows('invoices', { ...scope, status: 'paid' }),
    countRows('invoices', { ...scope, status: 'draft' }),
  ]);

  const outstandingValue = await sumColumn('invoices', 'balance_due', {
    ...scope,
    status: ['sent', 'overdue', 'partially_paid'],
  });

  // ── Document-driven Earnings (documents table, type='invoice') ──
  // Documents table is scoped by workspace_id, not business_id
  const docScopeId = resolved.workspaceId ?? resolved.businessId ?? resolved.authId;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;
  const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
  // Last day of current month
  const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthEnd = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const supabase = createServerSupabaseClient();

  const [yearGrossResult, monthGrossResult, docsInvoiceCount, docsQuoteCount] = await Promise.all([
    // Year Gross: SUM(grand_total) from documents WHERE type='invoice' AND date in current year
    supabase
      .from('documents')
      .select('grand_total')
      .eq('workspace_id', docScopeId)
      .eq('type', 'invoice')
      .gte('date', yearStart)
      .lte('date', yearEnd),
    // Month Gross: SUM(grand_total) from documents WHERE type='invoice' AND date in current month
    supabase
      .from('documents')
      .select('grand_total')
      .eq('workspace_id', docScopeId)
      .eq('type', 'invoice')
      .gte('date', monthStart)
      .lte('date', monthEnd),
    // Invoices Generated: COUNT from documents WHERE type='invoice'
    supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', docScopeId)
      .eq('type', 'invoice'),
    // Quotes Generated: COUNT from documents WHERE type='quote'
    supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', docScopeId)
      .eq('type', 'quote'),
  ]);

  const yearGross = (yearGrossResult.data ?? []).reduce(
    (sum, row) => sum + ((row as { grand_total: number | null }).grand_total ?? 0), 0,
  );
  const monthGross = (monthGrossResult.data ?? []).reduce(
    (sum, row) => sum + ((row as { grand_total: number | null }).grand_total ?? 0), 0,
  );
  const materials = 0; // Honest placeholder — no materials/expenses table yet
  const monthNet = monthGross - materials;

  // ── Conversion Rate (deduped: won / (won + lost)) ──
  const conversionDenom = leadsWon + leadsLost;
  const conversion = conversionDenom > 0 ? Math.round((leadsWon / conversionDenom) * 100) : 0;

  return {
    leads: { total: leadsTotal, new: leadsNew, quoted: leadsQuoted, won: leadsWon, lost: leadsLost },
    jobs: { total: jobsTotal, active: jobsActive, completed: jobsCompleted },
    tasks: { total: tasksTotal, pending: tasksPending, in_progress: tasksInProgress, completed: tasksCompleted },
    quotes: { total: quotesTotal, open: quotesOpen, total_value: Math.round(quotesTotalValue * 100) / 100 },
    invoices: {
      total: invoicesTotal,
      outstanding: invoicesOutstanding,
      outstanding_value: Math.round(outstandingValue * 100) / 100,
      paid: invoicesPaid,
      draft: invoicesDraft,
    },
    earnings: {
      yearGross: Math.round(yearGross * 100) / 100,
      monthGross: Math.round(monthGross * 100) / 100,
      monthNet: Math.round(monthNet * 100) / 100,
      materials,
    },
    conversion,
    documents: {
      invoicesGenerated: docsInvoiceCount.count ?? 0,
      quotesGenerated: docsQuoteCount.count ?? 0,
    },
  };
}

// ─── Entity Row Types (aligned to REAL Supabase schema, verified 18 Apr 2026) ─

export type LeadRow = {
  id: string;
  workspace_id: string;
  client_record_id: string | null;
  client_name: string | null;
  client_reference: string | null;
  phone: string | null;
  email: string | null;
  job_type: string | null;
  location_text: string | null;
  source_tool_key: string | null;
  address_text: string | null;
  address_line1: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
  start_date_millis: number | null;
  due_date_millis: number | null;
  payment_due_date_millis: number | null;
  estimated_value: number | null;
  quoted_value: number | null;
  deposit_amount: number | null;
  deposit_due_date_millis: number | null;
  deposit_status: string | null;
  deposit_sent_at_millis: number | null;
  deposit_paid_at_millis: number | null;
  quote_amount: number | null;
  quote_status: string | null;
  quote_sent_at_millis: number | null;
  status: string;
  source: string | null;
  follow_up_at_millis: number | null;
  values_text: string | null;
  user_notes: string | null;
  notes: string | null;
  created_at_millis: number;
  updated_at_millis: number;
  created_by: string;
  client_id: string | null;
  start_time_hour: number | null;
  start_time_minute: number | null;
  materials_delivery_date_millis: number | null;
  top_pdf_notes: string | null;
  bottom_pdf_notes: string | null;
  vat_percent: number | null;
  discount_amount: number | null;
};

export type JobRow = {
  id: string;
  workspace_id: string;
  client_record_id: string | null;
  lead_id: string | null;
  client_name: string | null;
  client_reference: string | null;
  phone: string | null;
  email: string | null;
  job_type: string | null;
  location_text: string | null;
  source_tool_key: string | null;
  address_text: string | null;
  address_line1: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
  start_date_millis: number | null;
  due_date_millis: number | null;
  payment_due_date_millis: number | null;
  job_value: number | null;
  deposit_amount: number | null;
  deposit_paid_amount: number | null;
  deposit_status: string | null;
  amount_paid_so_far: number | null;
  status: string;
  payment_status: string | null;
  values_text: string | null;
  user_notes: string | null;
  notes: string | null;
  created_at_millis: number;
  updated_at_millis: number;
  created_by: string;
  client_id: string | null;
  start_time_hour: number | null;
  start_time_minute: number | null;
  materials_delivery_date_millis: number | null;
  top_pdf_notes: string | null;
  bottom_pdf_notes: string | null;
  vat_percent: number | null;
  discount_amount: number | null;
};

export type ChecklistItem = {
  id: string;
  text: string;
  isChecked: boolean;
  order: number;
};

export type TaskRow = {
  id: string;
  workspace_id: string;
  client_record_id: string;
  title: string;
  notes: string | null;
  status: string;
  due_date_millis: number | null;
  created_at_millis: number;
  updated_at_millis: number;
  created_by: string | null;
  checklist_items: ChecklistItem[] | null;
};

export type CreateTaskInput = {
  title: string;
  notes?: string | null;
  status?: string;
  due_date_millis?: number | null;
  checklist_items?: ChecklistItem[] | null;
};

export type UpdateTaskInput = {
  title?: string;
  notes?: string | null;
  status?: string;
  due_date_millis?: number | null;
  checklist_items?: ChecklistItem[] | null;
};

/**
 * Normalize task status to Android-aligned canonical values.
 * Android uses: OPEN, COMPLETED, CANCELLED.
 * Legacy website values: pending, in_progress → OPEN; completed/done → COMPLETED.
 */
export function normalizeTaskStatus(raw: string | null | undefined): string {
  const s = String(raw ?? '').toUpperCase().trim();
  if (s === 'COMPLETED' || s === 'DONE') return 'COMPLETED';
  if (s === 'CANCELLED' || s === 'CANCELED') return 'CANCELLED';
  // OPEN, PENDING, IN_PROGRESS, empty, unknown → OPEN
  return 'OPEN';
}

/**
 * Safely decode checklist_items from a DB row.
 * Handles: null, undefined, JSON string, array.
 */
export function decodeChecklistItems(raw: unknown): ChecklistItem[] | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { return null; }
  }
  if (!Array.isArray(raw)) return null;
  return raw.map((item: Record<string, unknown>, idx: number) => ({
    id: String(item.id ?? `cl_${idx}`),
    text: String(item.text ?? ''),
    isChecked: Boolean(item.isChecked ?? item.is_checked ?? false),
    order: typeof item.order === 'number' ? item.order : idx,
  }));
}

export type AssetRow = {
  id: string;
  workspace_id: string;
  name: string | null;
  type: string | null;
  file_url: string | null;
  file_size: number | null;
  job_id: string | null;
  uploaded_by: string | null;
  created_at: string;
};

export type DocumentItemJson = {
  description: string;
  unit: string | null;
  qty: number;
  price: number;
  total: number;
};

export type DocumentRow = {
  id: string;
  workspace_id: string;
  created_by: string;
  type: string | null;
  reference: string | null;
  date: string | null;
  client_name: string | null;
  client_address: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_ref: string | null;
  header_notes: string | null;
  footer_notes: string | null;
  subtotal: number | null;
  vat_amount: number | null;
  grand_total: number | null;
  currency: string | null;
  items: DocumentItemJson[] | null;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  platform: string;
  status: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

export type HistoryRow = {
  id: string;
  workspace_id: string;
  entity_type: string | null;
  entity_id: string | null;
  action: string | null;
  snapshot_json?: Record<string, unknown> | null;
  details: Record<string, unknown> | null;
  performed_by: string | null;
  created_by?: string | null;
  client_event_id?: string | null;
  created_at: string;
};

export type ToolAttachmentRow = {
  id: string;
  workspace_id: string;
  client_record_id: string | null;
  parent_id: string | null;
  parent_type: string | null; // 'LEAD' | 'JOB'
  tool_key: string | null;
  tool_title: string | null;
  values_text: string | null;
  total: number | null;
  user_notes: string | null;
  raw_payload: string | null;
  created_at_millis: number;
  updated_at_millis: number;
  created_by: string;
  labour_total: number | null;
  materials_total: number | null;
  subcontractor_total: number | null;
  plant_hire_total: number | null;
  other_direct_cost_total: number | null;
  overhead_total: number | null;
  unknown_total: number | null;
  // Legacy ISO columns (also exist on this table)
  created_at: string;
  updated_at: string;
};

/**
 * Client row matching the Supabase-native `clients` table (workspace_id scoped).
 * This is the canonical source of contact data in the CRM.
 */
export type ClientRow = {
  id: string;
  workspace_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
  company_name: string | null;
  vat_number: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateClientInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  address_line_1?: string | null;
  city?: string | null;
  postcode?: string | null;
  company_name?: string | null;
};

// ─── Entity Queries ──────────────────────────────────────────────────────────

/**
 * Build a scoped query for an entity table.
 * Primary: workspace_id (the actual column on all Android-native tables).
 * Fallback: created_by = authId (for tables that may lack workspace_id).
 */
function scopeQuery(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  table: string,
  resolved: ResolvedUser,
) {
  const wsId = resolved.workspaceId ?? resolved.businessId;
  if (wsId) {
    return supabase.from(table).select('*').eq('workspace_id', wsId);
  }
  // Fallback: try created_by = auth UUID
  return supabase.from(table).select('*').eq('created_by', resolved.authId);
}

/**
 * Fetch leads, scoped by workspace_id.
 * Uses Supabase-native `leads` table (Android schema: _millis timestamps).
 */
export async function getLeads(resolved: ResolvedUser): Promise<LeadRow[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await scopeQuery(supabase, 'leads', resolved)
      .order('created_at_millis', { ascending: false });
    if (error) {
      console.error('[getLeads] Query failed:', error.message);
      return [];
    }
    return (data ?? []) as LeadRow[];
  } catch {
    return [];
  }
}

/**
 * Fetch jobs, scoped by workspace_id.
 * Uses Supabase-native `jobs` table (Android schema: _millis timestamps).
 */
export async function getJobs(resolved: ResolvedUser): Promise<JobRow[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await scopeQuery(supabase, 'jobs', resolved)
      .order('created_at_millis', { ascending: false });
    if (error) {
      console.error('[getJobs] Query failed:', error.message);
      return [];
    }
    return (data ?? []) as JobRow[];
  } catch {
    return [];
  }
}

/**
 * Fetch tasks, scoped by workspace_id (live schema contract).
 * Decodes checklist_items safely and normalizes status to Android contract.
 */
export async function getTasks(resolved: ResolvedUser): Promise<TaskRow[]> {
  try {
    const workspaceId = resolved.workspaceId ?? resolved.businessId;
    if (!workspaceId) return [];
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at_millis', { ascending: false });
    if (error) return [];
    return (data ?? []).map((row: Record<string, unknown>) => ({
      ...row,
      status: normalizeTaskStatus(row.status as string),
      checklist_items: decodeChecklistItems(row.checklist_items),
    })) as TaskRow[];
  } catch {
    return [];
  }
}

/**
 * Create a new task. Scoped by workspace_id.
 * Logs snapshot-based history to crm_history (Android-aligned contract).
 */
export async function createTask(
  resolved: ResolvedUser,
  input: CreateTaskInput,
): Promise<{ data: TaskRow | null; error: string | null }> {
  const workspaceId = resolved.workspaceId ?? resolved.businessId;
  if (!workspaceId) {
    return { data: null, error: 'No workspace found. Please set up your business profile first.' };
  }

  const supabase = createServerSupabaseClient();
  const now = Date.now();

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      workspace_id: workspaceId,
      client_record_id: crypto.randomUUID(),
      title: input.title,
      notes: input.notes ?? null,
      status: input.status || 'OPEN',
      due_date_millis: input.due_date_millis ?? null,
      created_at_millis: now,
      updated_at_millis: now,
      created_by: resolved.authId,
      checklist_items: input.checklist_items ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[createTask] Failed:', error.message);
    return { data: null, error: error.message };
  }

  const task = {
    ...data,
    status: normalizeTaskStatus(data.status),
    checklist_items: decodeChecklistItems(data.checklist_items),
  } as TaskRow;

  // Snapshot-based history: full task state after creation
  await logTaskHistory(resolved, workspaceId, task.id, 'created', task, { title: task.title });
  return { data: task, error: null };
}

/**
 * Update an existing task. Scoped by workspace_id.
 * Logs snapshot-based history with semantic action:
 *   completed | cancelled | restored | due_date_updated | checklist_updated | updated
 */
export async function updateTask(
  resolved: ResolvedUser,
  taskId: string,
  input: UpdateTaskInput,
): Promise<{ data: TaskRow | null; error: string | null }> {
  const workspaceId = resolved.workspaceId ?? resolved.businessId;
  if (!workspaceId) {
    return { data: null, error: 'No workspace found.' };
  }

  const supabase = createServerSupabaseClient();
  const updatePayload: Record<string, unknown> = { updated_at_millis: Date.now() };
  if (input.title !== undefined) updatePayload.title = input.title;
  if (input.notes !== undefined) updatePayload.notes = input.notes;
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.due_date_millis !== undefined) updatePayload.due_date_millis = input.due_date_millis;
  if (input.checklist_items !== undefined) updatePayload.checklist_items = input.checklist_items ?? null;

  const { data, error } = await supabase
    .from('tasks')
    .update(updatePayload)
    .eq('id', taskId)
    .eq('workspace_id', workspaceId)
    .select('*')
    .single();

  if (error) {
    console.error('[updateTask] Failed:', error.message);
    return { data: null, error: error.message };
  }

  // Determine semantic action (Android-aligned).
  // Priority: status changes > field-specific > generic updated
  let action = 'updated';
  if (input.status === 'COMPLETED') action = 'completed';
  else if (input.status === 'CANCELLED') action = 'cancelled';
  else if (input.status === 'OPEN' && !input.title && !input.notes && input.due_date_millis === undefined && input.checklist_items === undefined) {
    action = 'restored';
  } else if (input.due_date_millis !== undefined && input.title === undefined && input.notes === undefined && input.status === undefined && input.checklist_items === undefined) {
    action = 'due_date_updated';
  } else if (input.checklist_items !== undefined && input.title === undefined && input.notes === undefined && input.status === undefined && input.due_date_millis === undefined) {
    action = 'checklist_updated';
  }

  const task = {
    ...data,
    status: normalizeTaskStatus(data.status),
    checklist_items: decodeChecklistItems(data.checklist_items),
  } as TaskRow;

  // Snapshot-based history: full task state after mutation
  await logTaskHistory(resolved, workspaceId, task.id, action, task, input as Record<string, unknown>);
  return { data: task, error: null };
}

/**
 * Delete a task. Scoped by workspace_id.
 * Fetches the full task snapshot BEFORE deleting so the audit trail preserves
 * the complete state at deletion time (Android-aligned contract).
 */
export async function deleteTask(
  resolved: ResolvedUser,
  taskId: string,
): Promise<{ error: string | null }> {
  const workspaceId = resolved.workspaceId ?? resolved.businessId;
  if (!workspaceId) {
    return { error: 'No workspace found.' };
  }

  const supabase = createServerSupabaseClient();

  // Capture full snapshot before deletion for audit trail
  const { data: existing } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .eq('workspace_id', workspaceId)
    .single();

  const snapshot: TaskRow | Record<string, unknown> = existing
    ? {
        ...existing,
        status: normalizeTaskStatus(existing.status),
        checklist_items: decodeChecklistItems(existing.checklist_items),
      }
    : { id: taskId, workspace_id: workspaceId };

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[deleteTask] Failed:', error.message);
    return { error: error.message };
  }

  // Snapshot-based history: full task state at moment of deletion
  await logTaskHistory(resolved, workspaceId, taskId, 'deleted', snapshot, { title: (snapshot as Record<string, unknown>).title as string });
  return { error: null };
}

/**
 * Fetch assets, scoped by workspace_id (preferred) or created_by (fallback).
 */
export async function getAssets(resolved: ResolvedUser): Promise<AssetRow[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await scopeQuery(supabase, 'assets', resolved)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data ?? []) as AssetRow[];
  } catch {
    return [];
  }
}

/**
 * Fetch documents, scoped by workspace_id (preferred) or created_by (fallback).
 */
export async function getDocuments(resolved: ResolvedUser): Promise<DocumentRow[]> {
  try {
    const supabase = createServerSupabaseClient();
    let query;
    if (resolved.workspaceId) {
      query = supabase.from('documents').select('*').eq('workspace_id', resolved.workspaceId);
    } else if (resolved.businessId) {
      query = supabase.from('documents').select('*').eq('workspace_id', resolved.businessId);
    } else {
      query = supabase.from('documents').select('*').eq('created_by', resolved.authId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return [];
    return (data ?? []) as DocumentRow[];
  } catch {
    return [];
  }
}

/**
 * Fetch CRM history. Merges two scoping strategies:
 *   1. workspace_id-scoped rows (leads, jobs, assets, documents, tasks)
 *   2. workspace_id-scoped rows (tasks — Android-aligned snapshot contract)
 * De-duplicates by row id. Append-only, ordered newest-first, limited to 200.
 */
export async function getHistory(resolved: ResolvedUser): Promise<HistoryRow[]> {
  try {
    const supabase = createServerSupabaseClient();

    // workspace_id-scoped query (leads, jobs, assets, documents, etc.)
    const { data: bizData } = await scopeQuery(supabase, 'crm_history', resolved)
      .order('created_at', { ascending: false })
      .limit(200);

    // workspace_id-scoped query (tasks use workspace_id in crm_history)
    const wsId = resolved.workspaceId ?? resolved.businessId;
    let wsData: HistoryRow[] = [];
    if (wsId) {
      const { data } = await supabase
        .from('crm_history')
        .select('*')
        .eq('workspace_id', wsId)
        .order('created_at', { ascending: false })
        .limit(200);
      wsData = (data ?? []) as HistoryRow[];
    }

    // Merge and de-duplicate by id, then sort newest-first
    const seen = new Set<string>();
    const merged: HistoryRow[] = [];
    for (const row of [...(bizData ?? []), ...wsData]) {
      const r = row as HistoryRow;
      if (!seen.has(r.id)) {
        seen.add(r.id);
        merged.push(r);
      }
    }
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return merged.slice(0, 200);
  } catch {
    return [];
  }
}

/**
 * Fetch tool attachments (calculator/tool results attached to leads/jobs).
 * Scoped by workspace_id (primary) or created_by (fallback).
 */
export async function getToolAttachments(resolved: ResolvedUser): Promise<ToolAttachmentRow[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await scopeQuery(supabase, 'tool_attachments', resolved)
      .order('created_at_millis', { ascending: false });
    if (error) return [];
    return (data ?? []) as ToolAttachmentRow[];
  } catch {
    return [];
  }
}

// ─── Client Queries (Supabase-native, workspace_id scoped) ────────────────────

/**
 * Fetch all clients for the business.
 * Uses the Supabase-native `clients` table — the canonical contact source of truth.
 */
export async function getClients(resolved: ResolvedUser): Promise<ClientRow[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await scopeQuery(supabase, 'clients', resolved)
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (error) return [];
    return (data ?? []) as ClientRow[];
  } catch {
    return [];
  }
}

/**
 * Fetch a single client by ID, scoped by workspace_id.
 */
export async function getClientById(
  resolved: ResolvedUser,
  clientId: string,
): Promise<ClientRow | null> {
  const wsId = resolved.workspaceId ?? resolved.businessId;
  if (!wsId) return null;
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('workspace_id', wsId)
      .maybeSingle();
    if (error || !data) return null;
    return data as ClientRow;
  } catch {
    return null;
  }
}

/**
 * Create a new client in the Supabase-native `clients` table.
 * Requires workspaceId.
 */
export async function createClient(
  resolved: ResolvedUser,
  input: CreateClientInput,
): Promise<{ data: ClientRow | null; error: string | null }> {
  const wsId = resolved.workspaceId ?? resolved.businessId;
  if (!wsId) {
    return { data: null, error: 'No workspace found.' };
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('clients')
    .insert({
      workspace_id: wsId,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address_line_1: input.address_line_1 ?? null,
      city: input.city ?? null,
      postcode: input.postcode ?? null,
      company_name: input.company_name ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[createClient] Failed:', error.message);
    return { data: null, error: error.message };
  }

  return { data: data as ClientRow, error: null };
}

// ─── Mutation Types ──────────────────────────────────────────────────────────

export type CreateLeadInput = {
  client_name: string;
  status?: string;
  source?: string | null;
  source_tool_key?: string | null;
  job_type?: string | null;
  estimated_value?: number | null;
  quoted_value?: number | null;
  follow_up_at_millis?: number | null;
  notes?: string | null;
  user_notes?: string | null;
  values_text?: string | null;
  client_id?: string | null;
  client_record_id?: string | null;
  phone?: string | null;
  email?: string | null;
  address_text?: string | null;
  address_line1?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  location_text?: string | null;
  start_date_millis?: number | null;
  due_date_millis?: number | null;
  materials_delivery_date_millis?: number | null;
  deposit_amount?: number | null;
  deposit_status?: string | null;
  vat_percent?: number | null;
  discount_amount?: number | null;
  top_pdf_notes?: string | null;
  bottom_pdf_notes?: string | null;
  start_time_hour?: number | null;
  start_time_minute?: number | null;
};

export type UpdateLeadInput = Partial<CreateLeadInput>;

export type CreateJobInput = {
  client_name: string;
  lead_id?: string | null;
  client_id?: string | null;
  client_record_id?: string | null;
  status?: string;
  job_type?: string | null;
  source_tool_key?: string | null;
  start_date_millis?: number | null;
  due_date_millis?: number | null;
  job_value?: number | null;
  notes?: string | null;
  user_notes?: string | null;
  values_text?: string | null;
  phone?: string | null;
  email?: string | null;
  address_text?: string | null;
  address_line1?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  location_text?: string | null;
  materials_delivery_date_millis?: number | null;
  deposit_amount?: number | null;
  deposit_status?: string | null;
  deposit_paid_amount?: number | null;
  payment_status?: string | null;
  vat_percent?: number | null;
  discount_amount?: number | null;
  top_pdf_notes?: string | null;
  bottom_pdf_notes?: string | null;
  start_time_hour?: number | null;
  start_time_minute?: number | null;
};

export type UpdateJobInput = Partial<CreateJobInput>;

// ─── History Logging ─────────────────────────────────────────────────────────

/**
 * Append an entry to crm_history for audit trail / activity feed.
 * Fire-and-forget — errors are logged but don't block the caller.
 */
export async function logHistory(
  resolved: ResolvedUser,
  entityType: string,
  entityId: string,
  action: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    const wsId = resolved.workspaceId ?? resolved.businessId;
    const supabase = createServerSupabaseClient();
    await supabase.from('crm_history').insert({
      workspace_id: wsId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      details: details ?? null,
      performed_by: resolved.authId,
      created_by: resolved.authId,
    });
  } catch (err) {
    console.error('[logHistory] Failed:', err);
  }
}

/**
 * Snapshot-based task history logger aligned to Android contract.
 * Writes to crm_history with:
 *   - workspace_id (NOT business_id) for task-scoped history
 *   - snapshot_json: full TaskRow state at moment of event
 *   - client_event_id: deterministic dedup key (<taskId>:<action>:<timestamp>)
 *   - created_by: auth user id
 *   - details: human-readable summary
 *
 * Fire-and-forget — errors logged, never thrown.
 */
export async function logTaskHistory(
  resolved: ResolvedUser,
  workspaceId: string,
  taskId: string,
  action: string,
  snapshot: TaskRow | Record<string, unknown>,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    const supabase = createServerSupabaseClient();
    const now = Date.now();
    await supabase.from('crm_history').insert({
      workspace_id: workspaceId,
      entity_type: 'task',
      entity_id: taskId,
      action,
      snapshot_json: snapshot,
      details: details ?? null,
      created_by: resolved.authId,
      client_event_id: `${taskId}:${action}:${now}`,
    });
  } catch (err) {
    console.error('[logTaskHistory] Failed:', err);
  }
}

// ─── Document Persistence ────────────────────────────────────────────────────

/**
 * Persist a document metadata row AND log a crm_history event.
 * Called after PDF generation so generated documents are visible in:
 *   1. Quotes/Invoices/Documents pages (via `documents` table)
 *   2. History feed (via `crm_history` table)
 *
 * Uses lookup-before-write: if a document with the same identity
 * (workspace_id + linked_entity_type + linked_entity_id + type) already
 * exists, the existing row is UPDATED with version incremented instead of
 * creating a duplicate. This prevents KPI inflation on regeneration.
 *
 * Fire-and-forget — errors are logged but don't block the caller.
 */
export async function persistDocumentAndLog(
  resolved: ResolvedUser,
  doc: {
    type: string;
    reference?: string | null;
    date?: string;
    client_name?: string | null;
    client_address?: string | null;
    client_email?: string | null;
    client_phone?: string | null;
    client_ref?: string | null;
    header_notes?: string | null;
    footer_notes?: string | null;
    subtotal?: number | null;
    vat_amount?: number | null;
    grand_total?: number | null;
    currency?: string | null;
    items?: DocumentItemJson[] | null;
    linked_entity_type?: string | null;
    linked_entity_id?: string | null;
    status?: string;
  },
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const workspaceId = resolved.workspaceId ?? resolved.businessId;
  if (!workspaceId) return;

  try {
    const payload = {
      type: doc.type,
      reference: doc.reference ?? null,
      date: doc.date ?? new Date().toISOString().slice(0, 10),
      client_name: doc.client_name ?? null,
      client_address: doc.client_address ?? null,
      client_email: doc.client_email ?? null,
      client_phone: doc.client_phone ?? null,
      client_ref: doc.client_ref ?? null,
      header_notes: doc.header_notes ?? null,
      footer_notes: doc.footer_notes ?? null,
      subtotal: doc.subtotal ?? null,
      vat_amount: doc.vat_amount ?? null,
      grand_total: doc.grand_total ?? null,
      currency: doc.currency ?? null,
      items: doc.items ?? null,
      linked_entity_type: doc.linked_entity_type ?? null,
      linked_entity_id: doc.linked_entity_id ?? null,
      platform: 'web',
      status: doc.status ?? 'generated',
    };

    let docId: string;
    let action: string;

    // Lookup existing document by identity key
    // (workspace_id + linked_entity_type + linked_entity_id + type)
    // Backed by a partial unique index: uq_documents_entity_identity
    const canDedup = !!doc.linked_entity_type && !!doc.linked_entity_id;
    let existing: { id: string; version: number } | null = null;

    if (canDedup) {
      const { data: found } = await supabase
        .from('documents')
        .select('id, version')
        .eq('workspace_id', workspaceId)
        .eq('linked_entity_type', doc.linked_entity_type!)
        .eq('linked_entity_id', doc.linked_entity_id!)
        .eq('type', doc.type)
        .limit(1)
        .maybeSingle();
      if (found) existing = found;
    }

    if (existing) {
      // Regeneration: update existing row, increment version, reuse reference
      const newVersion = (existing.version ?? 1) + 1;
      await supabase
        .from('documents')
        .update({
          ...payload,
          version: newVersion,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      docId = existing.id;
      action = 'regenerated';
    } else {
      // New document: insert with version 1
      // The unique index uq_documents_entity_identity prevents duplicates;
      // if a concurrent request already inserted, this will fail gracefully.
      const { data, error: insertErr } = await supabase
        .from('documents')
        .insert({
          workspace_id: workspaceId,
          created_by: resolved.authId,
          ...payload,
          version: 1,
        })
        .select('id')
        .single();

      if (insertErr && canDedup) {
        // Unique constraint violation — concurrent insert won the race.
        // Retry as an update (regeneration) on the now-existing row.
        const { data: raced } = await supabase
          .from('documents')
          .select('id, version')
          .eq('workspace_id', workspaceId)
          .eq('linked_entity_type', doc.linked_entity_type!)
          .eq('linked_entity_id', doc.linked_entity_id!)
          .eq('type', doc.type)
          .limit(1)
          .maybeSingle();

        if (raced) {
          const ver = (raced.version ?? 1) + 1;
          await supabase
            .from('documents')
            .update({ ...payload, version: ver, updated_at: new Date().toISOString() })
            .eq('id', raced.id);
          docId = raced.id;
          action = 'regenerated';
        } else {
          // Should not happen, but don't throw — fire-and-forget
          console.error('[persistDocumentAndLog] Race fallback failed:', insertErr);
          return;
        }
      } else {
        docId = data?.id ?? doc.reference ?? 'unknown';
        action = 'generated';
      }
    }

    // Log to crm_history so it appears in the activity feed
    await logHistory(resolved, 'document', docId, action, {
      type: doc.type,
      reference: doc.reference,
      version: action === 'regenerated'
        ? (existing ? (existing.version ?? 1) + 1 : 2)
        : 1,
    });
  } catch (err) {
    console.error('[persistDocumentAndLog] Failed:', err);
  }
}

// ─── Lead Mutations ──────────────────────────────────────────────────────────

/**
 * Create a new lead in the Supabase-native `leads` table.
 * Requires workspaceId. Logs to crm_history.
 */
export async function createLead(
  resolved: ResolvedUser,
  input: CreateLeadInput,
): Promise<{ data: LeadRow | null; error: string | null }> {
  const wsId = resolved.workspaceId ?? resolved.businessId;
  if (!wsId) {
    return { data: null, error: 'No workspace found. Please set up your business profile first.' };
  }

  const supabase = createServerSupabaseClient();
  const now = Date.now();
  const { data, error } = await supabase
    .from('leads')
    .insert({
      workspace_id: wsId,
      client_name: input.client_name,
      status: input.status || 'NEW',
      source: input.source ?? null,
      source_tool_key: input.source_tool_key ?? null,
      job_type: input.job_type ?? null,
      estimated_value: input.estimated_value ?? null,
      quoted_value: input.quoted_value ?? null,
      follow_up_at_millis: input.follow_up_at_millis ?? null,
      notes: input.notes ?? null,
      user_notes: input.user_notes ?? null,
      values_text: input.values_text ?? null,
      client_id: input.client_id ?? null,
      client_record_id: input.client_record_id ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address_text: input.address_text ?? null,
      address_line1: input.address_line1 ?? null,
      city: input.city ?? null,
      postcode: input.postcode ?? null,
      country: input.country ?? null,
      location_text: input.location_text ?? null,
      start_date_millis: input.start_date_millis ?? null,
      due_date_millis: input.due_date_millis ?? null,
      materials_delivery_date_millis: input.materials_delivery_date_millis ?? null,
      deposit_amount: input.deposit_amount ?? null,
      deposit_status: input.deposit_status ?? 'DRAFT',
      vat_percent: input.vat_percent ?? null,
      discount_amount: input.discount_amount ?? null,
      top_pdf_notes: input.top_pdf_notes ?? null,
      bottom_pdf_notes: input.bottom_pdf_notes ?? null,
      start_time_hour: input.start_time_hour ?? null,
      start_time_minute: input.start_time_minute ?? null,
      created_at_millis: now,
      updated_at_millis: now,
      created_by: resolved.authId,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[createLead] Failed:', error.message);
    return { data: null, error: error.message };
  }

  await logHistory(resolved, 'lead', data.id, 'created', { client_name: input.client_name, source: input.source });
  return { data: data as LeadRow, error: null };
}

/**
 * Update an existing lead. Validates ownership via workspace_id scope.
 */
export async function updateLead(
  resolved: ResolvedUser,
  leadId: string,
  input: UpdateLeadInput,
): Promise<{ data: LeadRow | null; error: string | null }> {
  const wsId = resolved.workspaceId ?? resolved.businessId;
  if (!wsId) {
    return { data: null, error: 'No workspace found.' };
  }

  const supabase = createServerSupabaseClient();
  const updatePayload: Record<string, unknown> = { updated_at_millis: Date.now() };
  if (input.client_name !== undefined) updatePayload.client_name = input.client_name;
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.source !== undefined) updatePayload.source = input.source;
  if (input.source_tool_key !== undefined) updatePayload.source_tool_key = input.source_tool_key;
  if (input.job_type !== undefined) updatePayload.job_type = input.job_type;
  if (input.estimated_value !== undefined) updatePayload.estimated_value = input.estimated_value;
  if (input.quoted_value !== undefined) updatePayload.quoted_value = input.quoted_value;
  if (input.follow_up_at_millis !== undefined) updatePayload.follow_up_at_millis = input.follow_up_at_millis;
  if (input.notes !== undefined) updatePayload.notes = input.notes;
  if (input.user_notes !== undefined) updatePayload.user_notes = input.user_notes;
  if (input.values_text !== undefined) updatePayload.values_text = input.values_text;
  if (input.client_id !== undefined) updatePayload.client_id = input.client_id;
  if (input.client_record_id !== undefined) updatePayload.client_record_id = input.client_record_id;
  if (input.phone !== undefined) updatePayload.phone = input.phone;
  if (input.email !== undefined) updatePayload.email = input.email;
  if (input.address_text !== undefined) updatePayload.address_text = input.address_text;
  if (input.address_line1 !== undefined) updatePayload.address_line1 = input.address_line1;
  if (input.city !== undefined) updatePayload.city = input.city;
  if (input.postcode !== undefined) updatePayload.postcode = input.postcode;
  if (input.country !== undefined) updatePayload.country = input.country;
  if (input.location_text !== undefined) updatePayload.location_text = input.location_text;
  if (input.start_date_millis !== undefined) updatePayload.start_date_millis = input.start_date_millis;
  if (input.due_date_millis !== undefined) updatePayload.due_date_millis = input.due_date_millis;
  if (input.materials_delivery_date_millis !== undefined) updatePayload.materials_delivery_date_millis = input.materials_delivery_date_millis;
  if (input.deposit_amount !== undefined) updatePayload.deposit_amount = input.deposit_amount;
  if (input.deposit_status !== undefined) updatePayload.deposit_status = input.deposit_status;
  if (input.vat_percent !== undefined) updatePayload.vat_percent = input.vat_percent;
  if (input.discount_amount !== undefined) updatePayload.discount_amount = input.discount_amount;
  if (input.top_pdf_notes !== undefined) updatePayload.top_pdf_notes = input.top_pdf_notes;
  if (input.bottom_pdf_notes !== undefined) updatePayload.bottom_pdf_notes = input.bottom_pdf_notes;
  if (input.start_time_hour !== undefined) updatePayload.start_time_hour = input.start_time_hour;
  if (input.start_time_minute !== undefined) updatePayload.start_time_minute = input.start_time_minute;

  const { data, error } = await supabase
    .from('leads')
    .update(updatePayload)
    .eq('id', leadId)
    .eq('workspace_id', wsId)
    .select('*')
    .single();

  if (error) {
    console.error('[updateLead] Failed:', error.message);
    return { data: null, error: error.message };
  }

  await logHistory(resolved, 'lead', leadId, 'updated', input as Record<string, unknown>);
  return { data: data as LeadRow, error: null };
}

/**
 * Delete a lead. Validates ownership via workspace_id scope.
 */
export async function deleteLead(
  resolved: ResolvedUser,
  leadId: string,
): Promise<{ error: string | null }> {
  const wsId = resolved.workspaceId ?? resolved.businessId;
  if (!wsId) {
    return { error: 'No workspace found.' };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', leadId)
    .eq('workspace_id', wsId);

  if (error) {
    console.error('[deleteLead] Failed:', error.message);
    return { error: error.message };
  }

  await logHistory(resolved, 'lead', leadId, 'deleted');
  return { error: null };
}

// ─── Job Mutations ───────────────────────────────────────────────────────────

/**
 * Create a new job in the Supabase-native `jobs` table.
 * Requires workspaceId. Logs to crm_history.
 */
export async function createJob(
  resolved: ResolvedUser,
  input: CreateJobInput,
): Promise<{ data: JobRow | null; error: string | null }> {
  const wsId = resolved.workspaceId ?? resolved.businessId;
  if (!wsId) {
    return { data: null, error: 'No workspace found. Please set up your business profile first.' };
  }

  const supabase = createServerSupabaseClient();
  const now = Date.now();
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      workspace_id: wsId,
      client_name: input.client_name,
      lead_id: input.lead_id ?? null,
      client_id: input.client_id ?? null,
      client_record_id: input.client_record_id ?? null,
      status: input.status || 'SCHEDULED',
      job_type: input.job_type ?? null,
      source_tool_key: input.source_tool_key ?? null,
      start_date_millis: input.start_date_millis ?? null,
      due_date_millis: input.due_date_millis ?? null,
      job_value: input.job_value ?? null,
      notes: input.notes ?? null,
      user_notes: input.user_notes ?? null,
      values_text: input.values_text ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address_text: input.address_text ?? null,
      address_line1: input.address_line1 ?? null,
      city: input.city ?? null,
      postcode: input.postcode ?? null,
      country: input.country ?? null,
      location_text: input.location_text ?? null,
      materials_delivery_date_millis: input.materials_delivery_date_millis ?? null,
      deposit_amount: input.deposit_amount ?? 0,
      deposit_paid_amount: input.deposit_paid_amount ?? 0,
      deposit_status: input.deposit_status ?? 'DRAFT',
      payment_status: input.payment_status ?? 'NOT_REQUESTED',
      amount_paid_so_far: 0,
      vat_percent: input.vat_percent ?? null,
      discount_amount: input.discount_amount ?? null,
      top_pdf_notes: input.top_pdf_notes ?? null,
      bottom_pdf_notes: input.bottom_pdf_notes ?? null,
      start_time_hour: input.start_time_hour ?? null,
      start_time_minute: input.start_time_minute ?? null,
      created_at_millis: now,
      updated_at_millis: now,
      created_by: resolved.authId,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[createJob] Failed:', error.message);
    return { data: null, error: error.message };
  }

  await logHistory(resolved, 'job', data.id, 'created', { client_name: input.client_name });
  return { data: data as JobRow, error: null };
}

/**
 * Update an existing job. Validates ownership via workspace_id scope.
 */
export async function updateJob(
  resolved: ResolvedUser,
  jobId: string,
  input: UpdateJobInput,
): Promise<{ data: JobRow | null; error: string | null }> {
  const wsId = resolved.workspaceId ?? resolved.businessId;
  if (!wsId) {
    return { data: null, error: 'No workspace found.' };
  }

  const supabase = createServerSupabaseClient();
  const updatePayload: Record<string, unknown> = { updated_at_millis: Date.now() };
  if (input.client_name !== undefined) updatePayload.client_name = input.client_name;
  if (input.lead_id !== undefined) updatePayload.lead_id = input.lead_id;
  if (input.client_id !== undefined) updatePayload.client_id = input.client_id;
  if (input.client_record_id !== undefined) updatePayload.client_record_id = input.client_record_id;
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.job_type !== undefined) updatePayload.job_type = input.job_type;
  if (input.source_tool_key !== undefined) updatePayload.source_tool_key = input.source_tool_key;
  if (input.start_date_millis !== undefined) updatePayload.start_date_millis = input.start_date_millis;
  if (input.due_date_millis !== undefined) updatePayload.due_date_millis = input.due_date_millis;
  if (input.job_value !== undefined) updatePayload.job_value = input.job_value;
  if (input.notes !== undefined) updatePayload.notes = input.notes;
  if (input.user_notes !== undefined) updatePayload.user_notes = input.user_notes;
  if (input.values_text !== undefined) updatePayload.values_text = input.values_text;
  if (input.phone !== undefined) updatePayload.phone = input.phone;
  if (input.email !== undefined) updatePayload.email = input.email;
  if (input.address_text !== undefined) updatePayload.address_text = input.address_text;
  if (input.address_line1 !== undefined) updatePayload.address_line1 = input.address_line1;
  if (input.city !== undefined) updatePayload.city = input.city;
  if (input.postcode !== undefined) updatePayload.postcode = input.postcode;
  if (input.country !== undefined) updatePayload.country = input.country;
  if (input.location_text !== undefined) updatePayload.location_text = input.location_text;
  if (input.materials_delivery_date_millis !== undefined) updatePayload.materials_delivery_date_millis = input.materials_delivery_date_millis;
  if (input.deposit_amount !== undefined) updatePayload.deposit_amount = input.deposit_amount;
  if (input.deposit_paid_amount !== undefined) updatePayload.deposit_paid_amount = input.deposit_paid_amount;
  if (input.deposit_status !== undefined) updatePayload.deposit_status = input.deposit_status;
  if (input.payment_status !== undefined) updatePayload.payment_status = input.payment_status;
  if (input.vat_percent !== undefined) updatePayload.vat_percent = input.vat_percent;
  if (input.discount_amount !== undefined) updatePayload.discount_amount = input.discount_amount;
  if (input.top_pdf_notes !== undefined) updatePayload.top_pdf_notes = input.top_pdf_notes;
  if (input.bottom_pdf_notes !== undefined) updatePayload.bottom_pdf_notes = input.bottom_pdf_notes;
  if (input.start_time_hour !== undefined) updatePayload.start_time_hour = input.start_time_hour;
  if (input.start_time_minute !== undefined) updatePayload.start_time_minute = input.start_time_minute;

  const { data, error } = await supabase
    .from('jobs')
    .update(updatePayload)
    .eq('id', jobId)
    .eq('workspace_id', wsId)
    .select('*')
    .single();

  if (error) {
    console.error('[updateJob] Failed:', error.message);
    return { data: null, error: error.message };
  }

  await logHistory(resolved, 'job', jobId, 'updated', input as Record<string, unknown>);
  return { data: data as JobRow, error: null };
}

/**
 * Delete a job. Validates ownership via workspace_id scope.
 */
export async function deleteJob(
  resolved: ResolvedUser,
  jobId: string,
): Promise<{ error: string | null }> {
  const wsId = resolved.workspaceId ?? resolved.businessId;
  if (!wsId) {
    return { error: 'No workspace found.' };
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', jobId)
    .eq('workspace_id', wsId);

  if (error) {
    console.error('[deleteJob] Failed:', error.message);
    return { error: error.message };
  }

  await logHistory(resolved, 'job', jobId, 'deleted');
  return { error: null };
}

// ─── Room Layouts (Visual Planner) ───────────────────────────────────────────

export type RoomLayoutRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  layout_type: string;
  status: string;
  layout_data: Record<string, unknown>;
  lead_id: string | null;
  job_id: string | null;
  quote_id: string | null;
  scan_source: string | null;
  scan_metadata: Record<string, unknown> | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateLayoutInput = {
  name: string;
  description?: string;
  layout_type?: string;
  layout_data: Record<string, unknown>;
  lead_id?: string;
  job_id?: string;
  scan_source?: string;
};

export type UpdateLayoutInput = {
  name?: string;
  description?: string;
  layout_type?: string;
  status?: string;
  layout_data?: Record<string, unknown>;
  lead_id?: string | null;
  job_id?: string | null;
  quote_id?: string | null;
};

export async function getLayouts(resolved: ResolvedUser): Promise<RoomLayoutRow[]> {
  if (!resolved.workspaceId) return [];
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('room_layouts')
    .select('*')
    .eq('workspace_id', resolved.workspaceId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[getLayouts] Failed:', error.message);
    return [];
  }
  return (data ?? []) as RoomLayoutRow[];
}

export async function getLayoutById(resolved: ResolvedUser, layoutId: string): Promise<RoomLayoutRow | null> {
  if (!resolved.workspaceId) return null;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('room_layouts')
    .select('*')
    .eq('id', layoutId)
    .eq('workspace_id', resolved.workspaceId)
    .maybeSingle();

  if (error) {
    console.error('[getLayoutById] Failed:', error.message);
    return null;
  }
  return data as RoomLayoutRow | null;
}

export async function createLayout(
  resolved: ResolvedUser,
  input: CreateLayoutInput,
): Promise<{ data: RoomLayoutRow | null; error: string | null }> {
  if (!resolved.workspaceId) {
    return { data: null, error: 'No active workspace. Please set up your workspace first.' };
  }
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('room_layouts')
    .insert({
      workspace_id: resolved.workspaceId,
      name: input.name,
      description: input.description ?? null,
      layout_type: input.layout_type ?? 'kitchen',
      layout_data: input.layout_data,
      lead_id: input.lead_id ?? null,
      job_id: input.job_id ?? null,
      scan_source: input.scan_source ?? 'manual',
      created_by: resolved.authId,
      updated_by: resolved.authId,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[createLayout] Failed:', error.message);
    return { data: null, error: error.message };
  }
  await logHistory(resolved, 'room_layout', data.id, 'created', { name: input.name, layout_type: input.layout_type });
  return { data: data as RoomLayoutRow, error: null };
}

export async function updateLayout(
  resolved: ResolvedUser,
  layoutId: string,
  input: UpdateLayoutInput,
): Promise<{ data: RoomLayoutRow | null; error: string | null }> {
  if (!resolved.workspaceId) {
    return { data: null, error: 'No active workspace. Please set up your workspace first.' };
  }
  const supabase = createServerSupabaseClient();
  const updatePayload: Record<string, unknown> = { updated_by: resolved.authId };
  if (input.name !== undefined) updatePayload.name = input.name;
  if (input.description !== undefined) updatePayload.description = input.description;
  if (input.layout_type !== undefined) updatePayload.layout_type = input.layout_type;
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.layout_data !== undefined) updatePayload.layout_data = input.layout_data;
  if (input.lead_id !== undefined) updatePayload.lead_id = input.lead_id;
  if (input.job_id !== undefined) updatePayload.job_id = input.job_id;
  if (input.quote_id !== undefined) updatePayload.quote_id = input.quote_id;

  const { data, error } = await supabase
    .from('room_layouts')
    .update(updatePayload)
    .eq('id', layoutId)
    .eq('workspace_id', resolved.workspaceId)
    .select('*')
    .single();

  if (error) {
    console.error('[updateLayout] Failed:', error.message);
    return { data: null, error: error.message };
  }
  await logHistory(resolved, 'room_layout', layoutId, 'updated', { fields: Object.keys(input) });
  return { data: data as RoomLayoutRow, error: null };
}

export async function deleteLayout(
  resolved: ResolvedUser,
  layoutId: string,
): Promise<{ error: string | null }> {
  if (!resolved.workspaceId) {
    return { error: 'No active workspace. Please set up your workspace first.' };
  }
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('room_layouts')
    .delete()
    .eq('id', layoutId)
    .eq('workspace_id', resolved.workspaceId);

  if (error) {
    console.error('[deleteLayout] Failed:', error.message);
    return { error: error.message };
  }
  await logHistory(resolved, 'room_layout', layoutId, 'deleted');
  return { error: null };
}

// ─── Tool Attachment Mutations ───────────────────────────────────────────────

export type CreateToolAttachmentInput = {
  parent_id: string;
  parent_type: 'LEAD' | 'JOB';
  tool_key: string;
  tool_title: string;
  values_text?: string | null;
  total?: number | null;
  user_notes?: string | null;
  raw_payload?: string | null;
  client_record_id?: string | null;
  labour_total?: number | null;
  materials_total?: number | null;
  subcontractor_total?: number | null;
  plant_hire_total?: number | null;
  other_direct_cost_total?: number | null;
  overhead_total?: number | null;
  unknown_total?: number | null;
};

/**
 * Create a tool attachment — stores structured calculator/tool output
 * linked to a lead or job via parent_id / parent_type.
 */
export async function createToolAttachment(
  resolved: ResolvedUser,
  input: CreateToolAttachmentInput,
): Promise<{ data: ToolAttachmentRow | null; error: string | null }> {
  const wsId = resolved.workspaceId ?? resolved.businessId;
  if (!wsId) {
    return { data: null, error: 'No workspace found.' };
  }

  const supabase = createServerSupabaseClient();
  const now = Date.now();
  const { data, error } = await supabase
    .from('tool_attachments')
    .insert({
      workspace_id: wsId,
      parent_id: input.parent_id,
      parent_type: input.parent_type,
      tool_key: input.tool_key,
      tool_title: input.tool_title,
      values_text: input.values_text ?? null,
      total: input.total ?? null,
      user_notes: input.user_notes ?? null,
      raw_payload: input.raw_payload ?? null,
      client_record_id: input.client_record_id ?? null,
      labour_total: input.labour_total ?? null,
      materials_total: input.materials_total ?? null,
      subcontractor_total: input.subcontractor_total ?? null,
      plant_hire_total: input.plant_hire_total ?? null,
      other_direct_cost_total: input.other_direct_cost_total ?? null,
      overhead_total: input.overhead_total ?? null,
      unknown_total: input.unknown_total ?? null,
      created_at_millis: now,
      updated_at_millis: now,
      created_by: resolved.authId,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[createToolAttachment] Failed:', error.message);
    return { data: null, error: error.message };
  }

  return { data: data as ToolAttachmentRow, error: null };
}

/**
 * Update an existing tool attachment's top-level columns.
 * Used when a tool is reopened in edit mode and the user saves changes.
 */
export async function updateToolAttachment(
  resolved: ResolvedUser,
  attachmentId: string,
  updates: {
    tool_key?: string | null;
    tool_title?: string | null;
    values_text?: string | null;
    total?: number | null;
    user_notes?: string | null;
    raw_payload?: string | null;
    labour_total?: number | null;
    materials_total?: number | null;
    subcontractor_total?: number | null;
    plant_hire_total?: number | null;
    other_direct_cost_total?: number | null;
    overhead_total?: number | null;
    unknown_total?: number | null;
  },
): Promise<{ data: ToolAttachmentRow | null; error: string | null }> {
  const wsId = resolved.workspaceId ?? resolved.businessId;
  if (!wsId) {
    return { data: null, error: 'No workspace found.' };
  }

  const supabase = createServerSupabaseClient();
  const updatePayload: Record<string, unknown> = { updated_at_millis: Date.now() };
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) updatePayload[k] = v;
  }

  const { data, error } = await supabase
    .from('tool_attachments')
    .update(updatePayload)
    .eq('id', attachmentId)
    .eq('workspace_id', wsId)
    .select('*')
    .single();

  if (error) {
    console.error('[updateToolAttachment] Failed:', error.message);
    return { data: null, error: error.message };
  }

  return { data: data as ToolAttachmentRow, error: null };
}

// ─── Phase G1: Attachment Reassignment & Total Recalculation ─────────────────

/**
 * Reassign all tool attachments from a lead to a job.
 * Used during Lead → Job conversion to maintain data chain continuity.
 * Tool attachments get parent_type=JOB, parent_id=jobId. Old parent_id kept via client_record_id if needed.
 */
export async function reassignToolAttachmentsToJob(
  resolved: ResolvedUser,
  leadId: string,
  jobId: string,
): Promise<{ count: number; error: string | null }> {
  const wsId = resolved.workspaceId ?? resolved.businessId;
  if (!wsId) {
    return { count: 0, error: 'No workspace found.' };
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('tool_attachments')
    .update({
      parent_id: jobId,
      parent_type: 'JOB',
      updated_at_millis: Date.now(),
    })
    .eq('parent_id', leadId)
    .eq('parent_type', 'LEAD')
    .eq('workspace_id', wsId)
    .select('id');

  if (error) {
    console.error('[reassignToolAttachmentsToJob] Failed:', error.message);
    return { count: 0, error: error.message };
  }

  return { count: data?.length ?? 0, error: null };
}

/**
 * Recalculate totals for a lead or job from its attached tools.
 * Returns the aggregate subtotal of all attached tool payloads.
 */
export async function sumToolAttachmentTotals(
  resolved: ResolvedUser,
  _entityType: 'lead' | 'job',
  entityId: string,
): Promise<{ subtotal: number; count: number; error: string | null }> {
  const wsId = resolved.workspaceId ?? resolved.businessId;
  if (!wsId) {
    return { subtotal: 0, count: 0, error: 'No workspace found.' };
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('tool_attachments')
    .select('total')
    .eq('parent_id', entityId)
    .eq('workspace_id', wsId);

  if (error) {
    console.error('[sumToolAttachmentTotals] Failed:', error.message);
    return { subtotal: 0, count: 0, error: error.message };
  }

  let subtotal = 0;
  for (const row of (data ?? [])) {
    if (typeof row.total === 'number' && row.total > 0) {
      subtotal += row.total;
    }
  }

  return { subtotal, count: (data ?? []).length, error: null };
}

// ─── Warehouse Assets ────────────────────────────────────────────────────────

// WarehouseAssetRow — aligned to REAL production schema (verified 2 April 2026)
// Real columns: id, owner_id, name, category, subtype, width, depth, height,
//   material_name, is_freestanding, is_wall_mounted, placement_mode, front_clearance,
//   compatible_room_types, requires_services, planner_hints, source, source_platform,
//   thumbnail_ref, notes, sync_version, last_modified_platform, created_at, updated_at
export type WarehouseAssetRow = {
  id: string;
  owner_id: string | null;
  name: string;
  category: string;
  subtype: string;
  width: number;
  depth: number;
  height: number;
  material_name: string | null;
  is_freestanding: boolean | null;
  is_wall_mounted: boolean | null;
  placement_mode: string | null;
  front_clearance: number | null;
  compatible_room_types: unknown | null;
  requires_services: unknown | null;
  planner_hints: unknown | null;
  source: string | null;
  source_platform: string | null;
  thumbnail_ref: string | null;
  notes: string | null;
  sync_version: number | null;
  last_modified_platform: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateWarehouseAssetInput = {
  name: string;
  category: string;
  subtype: string;
  width?: number;
  depth?: number;
  height?: number;
  material_name?: string;
  is_freestanding?: boolean;
  is_wall_mounted?: boolean;
  placement_mode?: string;
  front_clearance?: number;
  compatible_room_types?: unknown;
  requires_services?: unknown;
  planner_hints?: unknown;
  source?: string;
  source_platform?: string;
  thumbnail_ref?: string;
  notes?: string;
};

export type UpdateWarehouseAssetInput = Partial<CreateWarehouseAssetInput>;

export async function getWarehouseAssets(resolved: ResolvedUser): Promise<WarehouseAssetRow[]> {
  if (!resolved.authId) return [];
  const supabase = createServerSupabaseClient();
  // Production warehouse_assets uses owner_id (auth user UUID), not workspace_id.
  // System presets have source='systemPreset'. User assets are scoped by owner_id.
  const { data, error } = await supabase
    .from('warehouse_assets')
    .select('*')
    .or(`source.eq.systemPreset,owner_id.eq.${resolved.authId}`)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('[getWarehouseAssets] Failed:', error.message);
    return [];
  }
  return (data ?? []) as WarehouseAssetRow[];
}

/** Admin: get ALL warehouse assets (no owner_id filter). */
export async function getAllWarehouseAssetsAdmin(): Promise<WarehouseAssetRow[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('warehouse_assets')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('[getAllWarehouseAssetsAdmin] Failed:', error.message);
    return [];
  }
  return (data ?? []) as WarehouseAssetRow[];
}

/** Get a single warehouse asset by ID. */
export async function getWarehouseAssetById(assetId: string): Promise<WarehouseAssetRow | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('warehouse_assets')
    .select('*')
    .eq('id', assetId)
    .single();

  if (error) {
    console.error('[getWarehouseAssetById] Failed:', error.message);
    return null;
  }
  return data as WarehouseAssetRow;
}

export async function createWarehouseAsset(
  resolved: ResolvedUser,
  input: CreateWarehouseAssetInput,
): Promise<{ data: WarehouseAssetRow | null; error: string | null }> {
  if (!resolved.authId) {
    return { data: null, error: 'Not authenticated.' };
  }
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('warehouse_assets')
    .insert({
      owner_id: resolved.authId,
      name: input.name,
      category: input.category,
      subtype: input.subtype,
      width: input.width ?? 600,
      depth: input.depth ?? 580,
      height: input.height ?? 870,
      material_name: input.material_name ?? 'Standard',
      is_freestanding: input.is_freestanding ?? false,
      is_wall_mounted: input.is_wall_mounted ?? false,
      placement_mode: input.placement_mode ?? 'wall',
      front_clearance: input.front_clearance ?? 0,
      compatible_room_types: input.compatible_room_types ?? null,
      requires_services: input.requires_services ?? null,
      planner_hints: input.planner_hints ?? null,
      source: input.source ?? 'imported',
      source_platform: input.source_platform ?? 'web',
      thumbnail_ref: input.thumbnail_ref ?? null,
      notes: input.notes ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[createWarehouseAsset] Failed:', error.message);
    return { data: null, error: error.message };
  }
  return { data: data as WarehouseAssetRow, error: null };
}

export async function updateWarehouseAsset(
  resolved: ResolvedUser,
  assetId: string,
  input: UpdateWarehouseAssetInput,
): Promise<{ data: WarehouseAssetRow | null; error: string | null }> {
  if (!resolved.authId) {
    return { data: null, error: 'Not authenticated.' };
  }
  const supabase = createServerSupabaseClient();
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.category !== undefined) payload.category = input.category;
  if (input.subtype !== undefined) payload.subtype = input.subtype;
  if (input.width !== undefined) payload.width = input.width;
  if (input.depth !== undefined) payload.depth = input.depth;
  if (input.height !== undefined) payload.height = input.height;
  if (input.material_name !== undefined) payload.material_name = input.material_name;
  if (input.is_freestanding !== undefined) payload.is_freestanding = input.is_freestanding;
  if (input.is_wall_mounted !== undefined) payload.is_wall_mounted = input.is_wall_mounted;
  if (input.placement_mode !== undefined) payload.placement_mode = input.placement_mode;
  if (input.front_clearance !== undefined) payload.front_clearance = input.front_clearance;
  if (input.compatible_room_types !== undefined) payload.compatible_room_types = input.compatible_room_types;
  if (input.requires_services !== undefined) payload.requires_services = input.requires_services;
  if (input.planner_hints !== undefined) payload.planner_hints = input.planner_hints;
  if (input.source !== undefined) payload.source = input.source;
  if (input.source_platform !== undefined) payload.source_platform = input.source_platform;
  if (input.thumbnail_ref !== undefined) payload.thumbnail_ref = input.thumbnail_ref;
  if (input.notes !== undefined) payload.notes = input.notes;

  const { data, error } = await supabase
    .from('warehouse_assets')
    .update(payload)
    .eq('id', assetId)
    .eq('owner_id', resolved.authId)
    .select('*')
    .single();

  if (error) {
    console.error('[updateWarehouseAsset] Failed:', error.message);
    return { data: null, error: error.message };
  }
  return { data: data as WarehouseAssetRow, error: null };
}

export async function deleteWarehouseAsset(
  resolved: ResolvedUser,
  assetId: string,
): Promise<{ error: string | null }> {
  if (!resolved.authId) {
    return { error: 'Not authenticated.' };
  }
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from('warehouse_assets')
    .delete()
    .eq('id', assetId)
    .eq('owner_id', resolved.authId);

  if (error) {
    console.error('[deleteWarehouseAsset] Failed:', error.message);
    return { error: error.message };
  }
  return { error: null };
}

// ─── Projects (Cross-Platform Scan-to-Layout) ────────────────────────────────
// Types aligned to REAL production schema (verified 2 April 2026)

export type ProjectRow = {
  id: string;
  workspace_id: string;
  owner_id: string | null;
  name: string;
  status: string;
  space_type: string | null;
  sync_version: number | null;
  last_modified_platform: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getProjects(resolved: ResolvedUser): Promise<ProjectRow[]> {
  if (!resolved.workspaceId) return [];
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('workspace_id', resolved.workspaceId)
    .order('updated_at', { ascending: false });

  if (error) {
    // Table may not exist yet — graceful fallback
    console.error('[getProjects] Failed:', error.message);
    return [];
  }
  return (data ?? []) as ProjectRow[];
}

export async function getProjectWithRooms(resolved: ResolvedUser, projectId: string): Promise<{
  project: ProjectRow | null;
  rooms: ProjectRoomRow[];
}> {
  if (!resolved.workspaceId) return { project: null, rooms: [] };
  const supabase = createServerSupabaseClient();

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('workspace_id', resolved.workspaceId)
    .maybeSingle();

  if (!project) return { project: null, rooms: [] };

  const { data: rooms } = await supabase
    .from('project_rooms')
    .select('*')
    .eq('project_id', projectId)
    .order('name', { ascending: true });

  return {
    project: project as ProjectRow,
    rooms: (rooms ?? []) as ProjectRoomRow[],
  };
}

export type ProjectRoomRow = {
  id: string;
  project_id: string;
  owner_id: string | null;
  name: string;
  space_type: string | null;
  ceiling_height: number | null;
  walls: unknown | null;
  openings: unknown | null;
  objects: unknown | null;
  mesh_file_path: string | null;
  mesh_face_count: number | null;
  mesh_vertex_count: number | null;
  sync_version: number | null;
  last_modified_platform: string | null;
  created_at: string;
  updated_at: string;
};
