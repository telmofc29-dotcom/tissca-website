// src/app/api/workspace/sync-diagnostics/route.ts
//
// GET /api/workspace/sync-diagnostics
// Internal owner/admin-only diagnostics endpoint.
//
// SAFETY:
// - Read-only; no schema mutations.
// - Workspace-scoped (resolveUserFromToken).
// - Gated to owner/admin role of the active workspace.
// - No secrets / tokens / API keys are returned.
// - No PII beyond IDs and counts.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { resolveUserFromToken } from '@/lib/workspace-data';

type EntityCounts = {
  leads: number;
  jobs: number;
  tasks: number;
  assets: number;
  documents: number;
  tool_attachments: number;
  payment_requests: number;
  clients: number;
};

type AttachmentIntegrity = {
  orphan_count: number;            // tool_attachments with no parent_id / no business_id / workspace_id
  parent_mismatch_count: number;   // parent_id set but no matching lead/job in this workspace
  workspace_id_missing_count: number; // legacy rows in this workspace_members's business_id but workspace_id NULL
};

type LastActivity = {
  last_lead_created_at_millis: number | null;
  last_job_created_at_millis: number | null;
  last_tool_attachment_created_at_millis: number | null;
  last_document_created_at: string | null;
  last_crm_history_at: string | null;
};

type DiagnosticsSnapshot = {
  generated_at: string;
  platform: 'web';
  workspace_id: string | null;
  user_id: string;
  role: string | null;
  remote_counts: EntityCounts;
  attachment_integrity: AttachmentIntegrity;
  last_activity: LastActivity;
  failed_tables: string[];
  realtime_status: 'not_applicable_server' | string;
  notes: string[];
};

async function countRowsScoped(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  table: string,
  workspaceId: string,
  scopeColumn = 'workspace_id',
): Promise<{ count: number; failed: boolean }> {
  try {
    const { count, error } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq(scopeColumn, workspaceId);
    if (error) return { count: 0, failed: true };
    return { count: count ?? 0, failed: false };
  } catch {
    return { count: 0, failed: true };
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolved = await resolveUserFromToken(token);
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = resolved.workspaceId ?? resolved.businessId;
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // ── Role gate: owner / admin only ────────────────────────────────────────
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', resolved.authId)
      .maybeSingle();

    const role = membership?.role ?? null;
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Sync diagnostics are restricted to workspace owners and admins.' },
        { status: 403 },
      );
    }

    // ── Remote entity counts (workspace_id scoped) ───────────────────────────
    const failed: string[] = [];

    const [
      leads, jobs, tasks, assets, documents, toolAtt, payReq, clients,
    ] = await Promise.all([
      countRowsScoped(supabase, 'leads', workspaceId),
      countRowsScoped(supabase, 'jobs', workspaceId),
      countRowsScoped(supabase, 'tasks', workspaceId),
      countRowsScoped(supabase, 'assets', workspaceId),
      countRowsScoped(supabase, 'documents', workspaceId),
      countRowsScoped(supabase, 'tool_attachments', workspaceId),
      countRowsScoped(supabase, 'payment_requests', workspaceId),
      // clients table uses workspace_id (live schema, same as all other tables)
      countRowsScoped(supabase, 'clients', workspaceId),
    ]);

    if (leads.failed)    failed.push('leads');
    if (jobs.failed)     failed.push('jobs');
    if (tasks.failed)    failed.push('tasks');
    if (assets.failed)   failed.push('assets');
    if (documents.failed) failed.push('documents');
    if (toolAtt.failed)  failed.push('tool_attachments');
    if (payReq.failed)   failed.push('payment_requests');
    if (clients.failed)  failed.push('clients');

    const remote_counts: EntityCounts = {
      leads: leads.count,
      jobs: jobs.count,
      tasks: tasks.count,
      assets: assets.count,
      documents: documents.count,
      tool_attachments: toolAtt.count,
      payment_requests: payReq.count,
      clients: clients.count,
    };

    // ── Attachment integrity ─────────────────────────────────────────────────
    // Orphan: parent_id is NULL OR parent_type is NULL (cannot be linked back)
    let orphan_count = 0;
    let parent_mismatch_count = 0;
    let workspace_id_missing_count = 0;

    try {
      const { count: orphanNullParent } = await supabase
        .from('tool_attachments')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .or('parent_id.is.null,parent_type.is.null');
      orphan_count = orphanNullParent ?? 0;
    } catch { /* tool_attachments may lack workspace_id column on legacy DB */ }

    try {
      // Fetch up to 500 most recent attachments with parent ids, then verify parents exist.
      const { data: recent } = await supabase
        .from('tool_attachments')
        .select('id, parent_id, parent_type')
        .eq('workspace_id', workspaceId)
        .not('parent_id', 'is', null)
        .not('parent_type', 'is', null)
        .limit(500);

      if (recent && recent.length > 0) {
        const leadParentIds = recent.filter(r => r.parent_type === 'LEAD').map(r => r.parent_id);
        const jobParentIds = recent.filter(r => r.parent_type === 'JOB').map(r => r.parent_id);

        // tool_attachments.parent_id stores client_record_id (mobile-generated UUID),
        // NOT leads.id / jobs.id (Postgres PKs). Match on client_record_id.
        const [{ data: foundLeads }, { data: foundJobs }] = await Promise.all([
          leadParentIds.length
            ? supabase.from('leads').select('client_record_id').in('client_record_id', leadParentIds).eq('workspace_id', workspaceId)
            : Promise.resolve({ data: [] as { client_record_id: string }[] }),
          jobParentIds.length
            ? supabase.from('jobs').select('client_record_id').in('client_record_id', jobParentIds).eq('workspace_id', workspaceId)
            : Promise.resolve({ data: [] as { client_record_id: string }[] }),
        ]);

        const foundLeadSet = new Set((foundLeads ?? []).map(r => r.client_record_id).filter(Boolean));
        const foundJobSet = new Set((foundJobs ?? []).map(r => r.client_record_id).filter(Boolean));

        parent_mismatch_count = recent.filter(r =>
          (r.parent_type === 'LEAD' && !foundLeadSet.has(r.parent_id)) ||
          (r.parent_type === 'JOB' && !foundJobSet.has(r.parent_id)),
        ).length;
      }
    } catch { /* best-effort */ }

    try {
      const { count: wsMissing } = await supabase
        .from('tool_attachments')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', workspaceId)
        .is('workspace_id', null);
      workspace_id_missing_count = wsMissing ?? 0;
    } catch { /* column may not exist on legacy schema */ }

    const attachment_integrity: AttachmentIntegrity = {
      orphan_count,
      parent_mismatch_count,
      workspace_id_missing_count,
    };

    // ── Last activity timestamps (proxy for "last sync") ─────────────────────
    const lastActivity: LastActivity = {
      last_lead_created_at_millis: null,
      last_job_created_at_millis: null,
      last_tool_attachment_created_at_millis: null,
      last_document_created_at: null,
      last_crm_history_at: null,
    };

    try {
      const { data: lastLead } = await supabase
        .from('leads').select('created_at_millis')
        .eq('workspace_id', workspaceId)
        .order('created_at_millis', { ascending: false })
        .limit(1).maybeSingle();
      lastActivity.last_lead_created_at_millis = (lastLead as { created_at_millis?: number } | null)?.created_at_millis ?? null;
    } catch { /* noop */ }

    try {
      const { data: lastJob } = await supabase
        .from('jobs').select('created_at_millis')
        .eq('workspace_id', workspaceId)
        .order('created_at_millis', { ascending: false })
        .limit(1).maybeSingle();
      lastActivity.last_job_created_at_millis = (lastJob as { created_at_millis?: number } | null)?.created_at_millis ?? null;
    } catch { /* noop */ }

    try {
      const { data: lastTa } = await supabase
        .from('tool_attachments').select('created_at_millis')
        .eq('workspace_id', workspaceId)
        .order('created_at_millis', { ascending: false })
        .limit(1).maybeSingle();
      lastActivity.last_tool_attachment_created_at_millis = (lastTa as { created_at_millis?: number } | null)?.created_at_millis ?? null;
    } catch { /* noop */ }

    try {
      const { data: lastDoc } = await supabase
        .from('documents').select('created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle();
      lastActivity.last_document_created_at = (lastDoc as { created_at?: string } | null)?.created_at ?? null;
    } catch { /* noop */ }

    try {
      const { data: lastHist } = await supabase
        .from('crm_history').select('created_at')
        .or(`workspace_id.eq.${workspaceId},business_id.eq.${workspaceId}`)
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle();
      lastActivity.last_crm_history_at = (lastHist as { created_at?: string } | null)?.created_at ?? null;
    } catch { /* noop */ }

    const notes: string[] = [
      'Website is server-source-of-truth. "Unsynced" / "pending" counts are platform-N/A on web — all writes go directly to Supabase.',
      'Realtime status is reported by the client (browser); the server cannot observe it here.',
    ];

    const snapshot: DiagnosticsSnapshot = {
      generated_at: new Date().toISOString(),
      platform: 'web',
      workspace_id: workspaceId,
      user_id: resolved.authId,
      role,
      remote_counts,
      attachment_integrity,
      last_activity: lastActivity,
      failed_tables: failed,
      realtime_status: 'not_applicable_server',
      notes,
    };

    return NextResponse.json(snapshot, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[GET /api/workspace/sync-diagnostics] Failed:', err);
    return NextResponse.json({ error: 'Diagnostics failed' }, { status: 500 });
  }
}
