// src/app/api/workspace/sync-diagnostics/recovery/route.ts
//
// GET /api/workspace/sync-diagnostics/recovery
//
// Returns a RecoveryCandidateList derived from read-only Supabase workspace queries.
// Hard cap: 50 candidates, sorted critical → high → medium → low.
//
// SAFETY:
// - Read-only — zero schema mutations, zero sync-flow changes.
// - Workspace-scoped (resolveUserFromToken → workspaceId on every query).
// - Gated to owner/admin role only.
// - No secrets, no rawPayload, no tokens returned.
// - autoRepairAllowed: false on every candidate — never automated.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { resolveUserFromToken } from '@/lib/workspace-data';
import {
  classifyAttachmentMismatch,
  classifyOrphanAttachment,
  classifyLegacyWorkspaceMissing,
  assignConfidenceScore,
  scoreToConfidenceLevel,
} from '@/lib/sync-diagnostics/reconciliation';
import type {
  RecoveryCandidate,
  RecoveryCandidateList,
  RecoverySeverity,
} from '@/lib/sync-diagnostics/types';

const MAX_CANDIDATES = 50;
const MAX_QUERY_ROWS = 60;  // query a few extra to allow deduplication before cap

const SEVERITY_ORDER: Record<RecoverySeverity, number> = {
  critical: 4, high: 3, medium: 2, low: 1, info: 0,
};

function sortCandidates(candidates: RecoveryCandidate[]): RecoveryCandidate[] {
  return [...candidates].sort(
    (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity],
  );
}

// Strips JWT / key / email patterns from any error surfaced as a note.
function sanitiseErr(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  return raw
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_JWT]')
    .replace(/sbp_[A-Za-z0-9]+/g, '[REDACTED_KEY]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[REDACTED_EMAIL]')
    .slice(0, 400);
}

export async function GET(req: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const resolved = await resolveUserFromToken(token);
    if (!resolved) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workspaceId = resolved.workspaceId ?? resolved.businessId;
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

    const supabase = createServerSupabaseClient();

    // ── Role gate ───────────────────────────────────────────────────────────
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', resolved.authId)
      .maybeSingle();

    const role = membership?.role ?? null;
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Recovery analysis is restricted to workspace owners and admins.' },
        { status: 403 },
      );
    }

    const candidates: RecoveryCandidate[] = [];
    const notes: string[] = [];
    const now = new Date().toISOString();

    // ── 1. Orphan attachments → ORPHAN_ATTACHMENT_RECOVERABLE ──────────────
    try {
      const { data: orphans, error } = await supabase
        .from('tool_attachments')
        .select('id, parent_id, parent_type, tool_key, lead_id, job_id, created_at, workspace_id')
        .eq('workspace_id', workspaceId)
        .or('parent_id.is.null,parent_type.is.null')
        .order('created_at', { ascending: false })
        .limit(MAX_QUERY_ROWS);

      if (error) notes.push(`orphan query failed: ${sanitiseErr(error)}`);

      for (const row of orphans ?? []) {
        const item = {
          id: row.id,
          entity_type: 'tool_attachment',
          parent_id: row.parent_id ?? null,
          parent_type: row.parent_type ?? null,
          tool_key: (row as { tool_key?: string }).tool_key ?? null,
          workspace_id: (row as { workspace_id?: string }).workspace_id ?? null,
          likely_cause: (row as { lead_id?: string }).lead_id || (row as { job_id?: string }).job_id
            ? 'Legacy pre-parent_id row (has lead_id/job_id but no parent_id/parent_type).'
            : null,
          matching_job_for_lead: null,
        };
        const reconciliation = classifyOrphanAttachment(item);
        const score = assignConfidenceScore(item);

        candidates.push({
          candidateId: `ORPHAN_ATTACHMENT_RECOVERABLE_${row.id}`,
          type: 'ORPHAN_ATTACHMENT_RECOVERABLE',
          severity: reconciliation.recoverabilityClass === 'unrecoverable' ? 'high' : 'medium',
          workspaceId,
          entityType: 'tool_attachment',
          entityId: row.id,
          createdAt: (row as { created_at?: string }).created_at ?? now,
          detectedAt: now,
          likelyCause: reconciliation.description,
          suggestedAction: reconciliation.suggestedRepairPath,
          confidenceLevel: scoreToConfidenceLevel(score),
          dependencies: [],
          blockingEntities: [],
          recoveryPreview: item.likely_cause?.includes('legacy')
            ? 'Restore parent_id/parent_type from legacy lead_id/job_id columns (manual migration).'
            : 'Trace attachment creation time against leads/jobs to find intended parent.',
          requiresManualReview: true,
          reversible: true,
          destructiveRisk: false,
          autoRepairAllowed: false,
          recoverabilityClass: reconciliation.recoverabilityClass,
          targetEntityId: null,
          targetEntityType: null,
        });
      }
    } catch (e) {
      notes.push(`orphan detection threw: ${sanitiseErr(e)}`);
    }

    // ── 2. Parent mismatches → ATTACHMENT_CAN_REPARENT_TO_JOB or ORPHAN ───
    try {
      // Fetch attachments with parent_id set but whose parent can't be found
      const { data: withParent, error } = await supabase
        .from('tool_attachments')
        .select('id, parent_id, parent_type, tool_key, created_at, workspace_id')
        .eq('workspace_id', workspaceId)
        .not('parent_id', 'is', null)
        .not('parent_type', 'is', null)
        .order('created_at', { ascending: false })
        .limit(MAX_QUERY_ROWS);

      if (error) notes.push(`parent_mismatch query failed: ${sanitiseErr(error)}`);

      if (withParent && withParent.length > 0) {
        const leadIds = withParent
          .filter(r => r.parent_type === 'LEAD')
          .map(r => r.parent_id as string);
        const jobIds = withParent
          .filter(r => r.parent_type === 'JOB')
          .map(r => r.parent_id as string);

        const [{ data: foundLeads }, { data: foundJobs }] = await Promise.all([
          leadIds.length
            ? supabase.from('leads').select('id').in('id', leadIds).eq('workspace_id', workspaceId)
            : Promise.resolve({ data: [] as Array<{ id: string }> }),
          jobIds.length
            ? supabase.from('jobs').select('id').in('id', jobIds).eq('workspace_id', workspaceId)
            : Promise.resolve({ data: [] as Array<{ id: string }> }),
        ]);

        const foundLeadSet = new Set((foundLeads ?? []).map(r => r.id));
        const foundJobSet  = new Set((foundJobs  ?? []).map(r => r.id));

        const mismatched = withParent.filter(r =>
          (r.parent_type === 'LEAD' && !foundLeadSet.has(r.parent_id as string)) ||
          (r.parent_type === 'JOB'  && !foundJobSet.has(r.parent_id as string)),
        );

        if (mismatched.length > 0) {
          // Look for converting Jobs whose lead_id matches the broken parent_id
          const missingLeadIds = mismatched
            .filter(m => m.parent_type === 'LEAD')
            .map(m => m.parent_id as string);

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

          for (const row of mismatched) {
            const recoveryJobId = row.parent_type === 'LEAD'
              ? recoveryByLead.get(row.parent_id as string) ?? null
              : null;

            const item = {
              id: row.id,
              entity_type: 'tool_attachment',
              parent_id: row.parent_id ?? null,
              parent_type: row.parent_type ?? null,
              tool_key: (row as { tool_key?: string }).tool_key ?? null,
              workspace_id: (row as { workspace_id?: string }).workspace_id ?? null,
              matching_job_for_lead: recoveryJobId,
              likely_cause: recoveryJobId
                ? 'Lead was converted to Job; attachment still references the original Lead. (Likely pre-v5.74.4 migration.)'
                : 'Parent entity deleted or never existed in this workspace.',
            };

            const reconciliation = classifyAttachmentMismatch(item);
            const score = assignConfidenceScore(item);
            const type = recoveryJobId
              ? 'ATTACHMENT_CAN_REPARENT_TO_JOB' as const
              : 'ORPHAN_ATTACHMENT_RECOVERABLE' as const;

            candidates.push({
              candidateId: `${type}_${row.id}`,
              type,
              severity: recoveryJobId ? 'medium' : 'high',
              workspaceId,
              entityType: 'tool_attachment',
              entityId: row.id,
              createdAt: (row as { created_at?: string }).created_at ?? now,
              detectedAt: now,
              likelyCause: reconciliation.description,
              suggestedAction: reconciliation.suggestedRepairPath,
              confidenceLevel: scoreToConfidenceLevel(score),
              dependencies: recoveryJobId ? [recoveryJobId] : [],
              blockingEntities: [],
              recoveryPreview: recoveryJobId
                ? `Re-parent to job ${recoveryJobId.slice(0, 8)}… (parent_id → job ID, parent_type → JOB). Lead-to-Job conversion chain confirmed.`
                : 'No clean recovery path detected — manual review of parent entity history required.',
              requiresManualReview: !recoveryJobId || score < 75,
              reversible: true,
              destructiveRisk: false,
              autoRepairAllowed: false,
              recoverabilityClass: reconciliation.recoverabilityClass,
              targetEntityId: recoveryJobId,
              targetEntityType: recoveryJobId ? 'JOB' : null,
            });
          }
        }
      }
    } catch (e) {
      notes.push(`parent_mismatch detection threw: ${sanitiseErr(e)}`);
    }

    // ── 3. Legacy workspace_id missing → LEGACY_WORKSPACE_ID_MISSING ───────
    try {
      const { data: legacyRows, error } = await supabase
        .from('tool_attachments')
        .select('id, parent_id, parent_type, tool_key, created_at, business_id, workspace_id')
        .eq('business_id', workspaceId)
        .is('workspace_id', null)
        .order('created_at', { ascending: false })
        .limit(MAX_QUERY_ROWS);

      if (error) notes.push(`legacy_workspace_id query failed: ${sanitiseErr(error)}`);

      for (const row of legacyRows ?? []) {
        const item = {
          id: row.id,
          entity_type: 'tool_attachment',
          parent_id: row.parent_id ?? null,
          parent_type: row.parent_type ?? null,
          workspace_id: null,
        };
        const reconciliation = classifyLegacyWorkspaceMissing(item);

        candidates.push({
          candidateId: `LEGACY_WORKSPACE_ID_MISSING_${row.id}`,
          type: 'LEGACY_WORKSPACE_ID_MISSING',
          severity: 'medium',
          workspaceId,
          entityType: 'tool_attachment',
          entityId: row.id,
          createdAt: (row as { created_at?: string }).created_at ?? now,
          detectedAt: now,
          likelyCause: reconciliation.description,
          suggestedAction: reconciliation.suggestedRepairPath,
          confidenceLevel: 'high',    // structural issue, cause is unambiguous
          dependencies: [],
          blockingEntities: [],
          recoveryPreview: `Backfill workspace_id = ${workspaceId.slice(0, 8)}… on this row. Makes it visible to all workspace-scoped queries.`,
          requiresManualReview: true,
          reversible: true,
          destructiveRisk: false,
          autoRepairAllowed: false,
          recoverabilityClass: 'migration_required',
          targetEntityId: null,
          targetEntityType: null,
        });
      }
    } catch (e) {
      notes.push(`legacy_workspace_id detection threw: ${sanitiseErr(e)}`);
    }

    // ── Sort, deduplicate by entityId, cap at MAX_CANDIDATES ───────────────
    const seen = new Set<string>();
    const deduplicated = sortCandidates(candidates).filter(c => {
      if (seen.has(c.entityId)) return false;
      seen.add(c.entityId);
      return true;
    });
    const capped = deduplicated.slice(0, MAX_CANDIDATES);

    const criticalCount = capped.filter(c => c.severity === 'critical').length;
    const highCount     = capped.filter(c => c.severity === 'high').length;
    const mediumCount   = capped.filter(c => c.severity === 'medium').length;
    const lowCount      = capped.filter(c => c.severity === 'low').length;

    if (deduplicated.length > MAX_CANDIDATES) {
      notes.push(`${deduplicated.length - MAX_CANDIDATES} additional candidate(s) beyond the ${MAX_CANDIDATES} cap. Re-run after resolving current candidates.`);
    }

    const result: RecoveryCandidateList = {
      generated_at: now,
      workspace_id: workspaceId,
      total_count: capped.length,
      critical_count: criticalCount,
      high_count: highCount,
      medium_count: mediumCount,
      low_count: lowCount,
      candidates: capped,
      notes: [
        'All candidates are advisory. autoRepairAllowed = false on every candidate.',
        'Use simulate endpoint to preview any repair before considering manual execution.',
        'Web platform N/A candidates: LEAD_EXISTS_LOCAL_ONLY, LOCAL_REMOTE_MISMATCH, STALE_PENDING_ENTITY (no local DataStore on web).',
        ...notes,
      ],
    };

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[GET /api/workspace/sync-diagnostics/recovery] Failed:', err);
    return NextResponse.json({ error: 'Recovery analysis failed' }, { status: 500 });
  }
}
