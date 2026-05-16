// src/app/api/workspace/sync-diagnostics/details/route.ts
//
// GET /api/workspace/sync-diagnostics/details?kind=...
//
// Drill-down companion to /api/workspace/sync-diagnostics.
// Returns sanitised entity lists for non-zero diagnostic items.
//
// Supported kinds:
//   - orphans              → tool_attachments with no parent_id/parent_type
//   - parent_mismatch      → tool_attachments whose parent_id no longer exists in this workspace
//   - workspace_id_missing → legacy tool_attachments rows where workspace_id IS NULL
//   - failed_table         → most recent rows of a given &table= for inspection
//   - recent_leads         → 25 most recent leads (sanitised)
//   - recent_jobs          → 25 most recent jobs (sanitised)
//
// SAFETY:
// - Read-only; no schema mutations.
// - Workspace-scoped (resolveUserFromToken).
// - Gated to owner/admin role of the active workspace.
// - Hard cap of 100 rows per kind to keep payload small.
// - Sanitised: only IDs, types, timestamps, and short labels — no notes / no rawPayload / no tokens.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { resolveUserFromToken } from '@/lib/workspace-data';

const MAX_ROWS = 100;

type DetailItem = {
  id: string;
  entity_type: string;
  parent_id?: string | null;
  parent_type?: string | null;
  tool_key?: string | null;
  title?: string | null;
  client_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  age_ms?: number | null;
  workspace_id?: string | null;
  blocked_reason?: string | null;
  likely_cause?: string | null;
  suggested_action?: string | null;
  // Linkage diagnostics (drill-down hints)
  parent_exists_remotely?: boolean | null;
  matching_job_for_lead?: string | null;
};

type DetailResponse = {
  generated_at: string;
  workspace_id: string;
  kind: string;
  count: number;
  truncated: boolean;
  items: DetailItem[];
  notes: string[];
};

function pickTitle(row: Record<string, unknown>): string | null {
  for (const k of ['title', 'name', 'job_title', 'lead_title', 'subject']) {
    const v = row[k];
    if (typeof v === 'string' && v.trim()) return v.slice(0, 120);
  }
  return null;
}

function pickClientName(row: Record<string, unknown>): string | null {
  for (const k of ['client_name', 'customer_name']) {
    const v = row[k];
    if (typeof v === 'string' && v.trim()) return v.slice(0, 120);
  }
  return null;
}

function pickCreatedIso(row: Record<string, unknown>): string | null {
  if (typeof row.created_at === 'string') return row.created_at;
  if (typeof row.created_at_millis === 'number') {
    try { return new Date(row.created_at_millis).toISOString(); } catch { return null; }
  }
  return null;
}

function pickUpdatedIso(row: Record<string, unknown>): string | null {
  if (typeof row.updated_at === 'string') return row.updated_at;
  if (typeof row.updated_at_millis === 'number') {
    try { return new Date(row.updated_at_millis).toISOString(); } catch { return null; }
  }
  return null;
}

function ageMs(iso: string | null): number | null {
  if (!iso) return null;
  try { return Date.now() - new Date(iso).getTime(); } catch { return null; }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolved = await resolveUserFromToken(token);
    if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workspaceId = resolved.workspaceId ?? resolved.businessId;
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

    const supabase = createServerSupabaseClient();

    // Role gate — same as snapshot endpoint
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', resolved.authId)
      .maybeSingle();

    const role = membership?.role ?? null;
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Diagnostics drill-down is restricted to workspace owners and admins.' },
        { status: 403 },
      );
    }

    const kind = (req.nextUrl.searchParams.get('kind') ?? '').toLowerCase();
    const tableParam = (req.nextUrl.searchParams.get('table') ?? '').toLowerCase();

    const response: DetailResponse = {
      generated_at: new Date().toISOString(),
      workspace_id: workspaceId,
      kind,
      count: 0,
      truncated: false,
      items: [],
      notes: [],
    };

    // ── ORPHANS ──────────────────────────────────────────────────────────────
    if (kind === 'orphans') {
      try {
        const { data, error } = await supabase
          .from('tool_attachments')
          .select('id, parent_id, parent_type, tool_key, lead_id, job_id, created_at, updated_at, workspace_id')
          .eq('workspace_id', workspaceId)
          .or('parent_id.is.null,parent_type.is.null')
          .order('created_at', { ascending: false })
          .limit(MAX_ROWS + 1);
        if (error) throw error;

        const rows = data ?? [];
        response.truncated = rows.length > MAX_ROWS;
        response.items = rows.slice(0, MAX_ROWS).map((r) => {
          const createdAt = pickCreatedIso(r as Record<string, unknown>);
          const hasLegacy = Boolean((r as { lead_id?: string }).lead_id || (r as { job_id?: string }).job_id);
          return {
            id: r.id,
            entity_type: 'tool_attachment',
            parent_id: r.parent_id ?? null,
            parent_type: r.parent_type ?? null,
            tool_key: (r as { tool_key?: string }).tool_key ?? null,
            created_at: createdAt,
            updated_at: pickUpdatedIso(r as Record<string, unknown>),
            age_ms: ageMs(createdAt),
            workspace_id: (r as { workspace_id?: string }).workspace_id ?? null,
            likely_cause: hasLegacy
              ? 'Legacy pre-parent_id row (has lead_id/job_id but no parent_id/parent_type).'
              : 'Unknown — attachment has no parent linkage at all.',
            suggested_action: hasLegacy
              ? 'Backfill parent_id from lead_id/job_id (manual migration).'
              : 'Manual review — confirm parent existed and was correctly linked.',
            blocked_reason: 'Cannot resolve parent without parent_id/parent_type.',
          };
        });
        response.count = rows.length > MAX_ROWS ? MAX_ROWS : rows.length;
      } catch (e) {
        response.notes.push(`orphans query failed: ${sanitiseErr(e)}`);
      }
      return ok(response);
    }

    // ── PARENT MISMATCH ──────────────────────────────────────────────────────
    if (kind === 'parent_mismatch') {
      try {
        const { data, error } = await supabase
          .from('tool_attachments')
          .select('id, parent_id, parent_type, tool_key, lead_id, job_id, created_at, updated_at, workspace_id')
          .eq('workspace_id', workspaceId)
          .not('parent_id', 'is', null)
          .not('parent_type', 'is', null)
          .order('created_at', { ascending: false })
          .limit(500);
        if (error) throw error;

        const candidates = data ?? [];
        const leadIds = candidates.filter(c => c.parent_type === 'LEAD').map(c => c.parent_id);
        const jobIds  = candidates.filter(c => c.parent_type === 'JOB').map(c => c.parent_id);

        const [{ data: foundLeads }, { data: foundJobs }] = await Promise.all([
          leadIds.length
            ? supabase.from('leads').select('id, client_id').in('id', leadIds).eq('workspace_id', workspaceId)
            : Promise.resolve({ data: [] as Array<{ id: string; client_id?: string }> }),
          jobIds.length
            ? supabase.from('jobs').select('id, lead_id').in('id', jobIds).eq('workspace_id', workspaceId)
            : Promise.resolve({ data: [] as Array<{ id: string; lead_id?: string }> }),
        ]);

        const foundLeadSet = new Set((foundLeads ?? []).map(r => r.id));
        const foundJobSet  = new Set((foundJobs  ?? []).map(r => r.id));

        const mismatched = candidates.filter(c =>
          (c.parent_type === 'LEAD' && !foundLeadSet.has(c.parent_id)) ||
          (c.parent_type === 'JOB'  && !foundJobSet.has(c.parent_id)),
        );

        // For LEAD-mismatched rows, look for a converted Job whose lead_id matches the orphan parent_id
        const missingLeadIds = mismatched.filter(m => m.parent_type === 'LEAD').map(m => m.parent_id);
        let recoveryJobs: Array<{ id: string; lead_id: string }> = [];
        if (missingLeadIds.length > 0) {
          const { data: rec } = await supabase
            .from('jobs')
            .select('id, lead_id')
            .in('lead_id', missingLeadIds)
            .eq('workspace_id', workspaceId);
          recoveryJobs = (rec ?? []) as Array<{ id: string; lead_id: string }>;
        }
        const recoveryByLead = new Map(recoveryJobs.map(j => [j.lead_id, j.id]));

        response.truncated = mismatched.length > MAX_ROWS;
        response.items = mismatched.slice(0, MAX_ROWS).map(r => {
          const createdAt = pickCreatedIso(r as Record<string, unknown>);
          const recoveryJobId = r.parent_type === 'LEAD' ? recoveryByLead.get(r.parent_id) ?? null : null;
          return {
            id: r.id,
            entity_type: 'tool_attachment',
            parent_id: r.parent_id,
            parent_type: r.parent_type,
            tool_key: (r as { tool_key?: string }).tool_key ?? null,
            created_at: createdAt,
            updated_at: pickUpdatedIso(r as Record<string, unknown>),
            age_ms: ageMs(createdAt),
            parent_exists_remotely: false,
            matching_job_for_lead: recoveryJobId,
            likely_cause: recoveryJobId
              ? 'Lead was converted to Job; attachment still points at deleted Lead. (Likely pre-v5.74.4 migration issue.)'
              : 'Parent entity deleted or never existed in this workspace.',
            suggested_action: recoveryJobId
              ? `Re-parent to job ${recoveryJobId} (manual review required).`
              : 'Manual review — confirm parent intent before any action.',
            blocked_reason: 'Parent referenced by parent_id is not present in this workspace.',
          };
        });
        response.count = mismatched.length > MAX_ROWS ? MAX_ROWS : mismatched.length;
      } catch (e) {
        response.notes.push(`parent_mismatch query failed: ${sanitiseErr(e)}`);
      }
      return ok(response);
    }

    // ── WORKSPACE_ID MISSING (legacy backfill candidates) ────────────────────
    if (kind === 'workspace_id_missing') {
      try {
        const { data, error } = await supabase
          .from('tool_attachments')
          .select('id, parent_id, parent_type, tool_key, lead_id, job_id, created_at, updated_at, business_id, workspace_id')
          .eq('business_id', workspaceId)
          .is('workspace_id', null)
          .order('created_at', { ascending: false })
          .limit(MAX_ROWS + 1);
        if (error) throw error;
        const rows = data ?? [];
        response.truncated = rows.length > MAX_ROWS;
        response.items = rows.slice(0, MAX_ROWS).map(r => {
          const createdAt = pickCreatedIso(r as Record<string, unknown>);
          return {
            id: r.id,
            entity_type: 'tool_attachment',
            parent_id: r.parent_id ?? null,
            parent_type: r.parent_type ?? null,
            tool_key: (r as { tool_key?: string }).tool_key ?? null,
            created_at: createdAt,
            updated_at: pickUpdatedIso(r as Record<string, unknown>),
            age_ms: ageMs(createdAt),
            workspace_id: null,
            likely_cause: 'Legacy row created before workspace_id column existed.',
            suggested_action: 'Backfill workspace_id := business_id (DBA-led migration).',
            blocked_reason: 'workspace_id column is NULL → invisible to workspace-scoped queries.',
          };
        });
        response.count = rows.length > MAX_ROWS ? MAX_ROWS : rows.length;
      } catch (e) {
        response.notes.push(`workspace_id_missing query failed: ${sanitiseErr(e)}`);
      }
      return ok(response);
    }

    // ── FAILED TABLE inspection — show latest 25 rows so the operator can diagnose ──
    if (kind === 'failed_table') {
      const allowed = new Set([
        'leads', 'jobs', 'tasks', 'assets', 'documents',
        'tool_attachments', 'payment_requests', 'clients',
      ]);
      if (!allowed.has(tableParam)) {
        return NextResponse.json({ error: 'Unsupported table' }, { status: 400 });
      }
      const scopeCol = tableParam === 'clients' ? 'business_id' : 'workspace_id';
      try {
        const { data, error } = await supabase
          .from(tableParam)
          .select('id, created_at')
          .eq(scopeCol, workspaceId)
          .order('created_at', { ascending: false })
          .limit(25);
        if (error) throw error;
        response.items = (data ?? []).map(r => ({
          id: r.id,
          entity_type: tableParam.replace(/s$/, ''),
          created_at: (r as { created_at?: string }).created_at ?? null,
          age_ms: ageMs((r as { created_at?: string }).created_at ?? null),
        }));
        response.count = response.items.length;
        response.notes.push(
          `Table ${tableParam} is reachable (sample fetched). If snapshot listed it as failed, the prior call likely transient or RLS-restricted for this role.`,
        );
      } catch (e) {
        response.notes.push(
          `Table ${tableParam} still failing: ${sanitiseErr(e)}. Confirm RLS policy allows owner/admin reads.`,
        );
      }
      return ok(response);
    }

    // ── RECENT LEADS / JOBS — context for operators ──────────────────────────
    if (kind === 'recent_leads' || kind === 'recent_jobs') {
      const table = kind === 'recent_leads' ? 'leads' : 'jobs';
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(25);
        if (error) throw error;
        response.items = (data ?? []).map(r => {
          const obj = r as Record<string, unknown>;
          const createdAt = pickCreatedIso(obj);
          return {
            id: obj.id as string,
            entity_type: table.replace(/s$/, ''),
            title: pickTitle(obj),
            client_name: pickClientName(obj),
            created_at: createdAt,
            updated_at: pickUpdatedIso(obj),
            age_ms: ageMs(createdAt),
          };
        });
        response.count = response.items.length;
      } catch (e) {
        response.notes.push(`${table} query failed: ${sanitiseErr(e)}`);
      }
      return ok(response);
    }

    return NextResponse.json({ error: 'Unknown kind' }, { status: 400 });
  } catch (err) {
    console.error('[GET /api/workspace/sync-diagnostics/details] Failed:', err);
    return NextResponse.json({ error: 'Diagnostics details failed' }, { status: 500 });
  }
}

function ok(body: unknown) {
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}

// Strips anything that looks like a token / key / email / long opaque string.
function sanitiseErr(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  return raw
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_JWT]')
    .replace(/sbp_[A-Za-z0-9]+/g, '[REDACTED_SUPABASE_KEY]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[REDACTED_EMAIL]')
    .slice(0, 500);
}
