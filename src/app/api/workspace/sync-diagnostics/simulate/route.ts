// src/app/api/workspace/sync-diagnostics/simulate/route.ts
//
// GET /api/workspace/sync-diagnostics/simulate
//
// Runs a READ-ONLY repair simulation for a given recovery candidate.
// Fetches the current entity state from Supabase (fresh read), then applies
// pure simulation logic (from simulation.ts) — zero mutations.
//
// Query params:
//   type         RecoveryCandidateType (required)
//   entityId     tool_attachment UUID (required)
//   targetEntityId  job UUID (required for ATTACHMENT_CAN_REPARENT_TO_JOB)
//
// SAFETY:
// - Read-only — no INSERT, UPDATE, DELETE, or RPC calls.
// - Workspace-scoped — every entity fetch is gated by workspaceId.
// - Role-gated — owner/admin only.
// - No secrets / tokens / rawPayload in response.
// - autoRepairAllowed: false on every SimulationResult.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { resolveUserFromToken } from '@/lib/workspace-data';
import {
  simulateReparentToJob,
  simulateLegacyBackfill,
  simulateOrphanLegacyRestore,
} from '@/lib/sync-diagnostics/simulation';
import type { RecoveryCandidateType, SimulationResult } from '@/lib/sync-diagnostics/types';

const ALLOWED_TYPES = new Set<RecoveryCandidateType>([
  'ATTACHMENT_CAN_REPARENT_TO_JOB',
  'LEGACY_WORKSPACE_ID_MISSING',
  'ORPHAN_ATTACHMENT_RECOVERABLE',
]);

function err(msg: string, status: number) {
  return NextResponse.json({ error: msg }, { status });
}

export async function GET(req: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return err('Unauthorized', 401);

    const resolved = await resolveUserFromToken(token);
    if (!resolved) return err('Unauthorized', 401);

    const workspaceId = resolved.workspaceId ?? resolved.businessId;
    if (!workspaceId) return err('No workspace', 400);

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
      return err('Simulation is restricted to workspace owners and admins.', 403);
    }

    // ── Parse params ────────────────────────────────────────────────────────
    const typeParam   = req.nextUrl.searchParams.get('type') as RecoveryCandidateType | null;
    const entityId    = req.nextUrl.searchParams.get('entityId')?.trim();
    const targetId    = req.nextUrl.searchParams.get('targetEntityId')?.trim() ?? null;

    if (!typeParam || !ALLOWED_TYPES.has(typeParam)) {
      return err(`Unsupported simulation type. Allowed: ${[...ALLOWED_TYPES].join(', ')}`, 400);
    }
    if (!entityId) return err('entityId is required', 400);

    const candidateId = `${typeParam}_${entityId}`;

    // ── Fetch the attachment — workspace-scoped ──────────────────────────────
    let attachment: {
      id: string;
      parent_id: string | null;
      parent_type: string | null;
      tool_key: string | null;
      workspace_id: string | null;
      lead_id: string | null;
      job_id: string | null;
    } | null = null;

    try {
      // Try workspace_id-scoped first
      const { data, error } = await supabase
        .from('tool_attachments')
        .select('id, parent_id, parent_type, tool_key, workspace_id, lead_id, job_id')
        .eq('id', entityId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (!error && data) {
        attachment = {
          id: data.id,
          parent_id: data.parent_id ?? null,
          parent_type: data.parent_type ?? null,
          tool_key: (data as { tool_key?: string }).tool_key ?? null,
          workspace_id: (data as { workspace_id?: string }).workspace_id ?? null,
          lead_id: (data as { lead_id?: string }).lead_id ?? null,
          job_id: (data as { job_id?: string }).job_id ?? null,
        };
      } else if (typeParam === 'LEGACY_WORKSPACE_ID_MISSING') {
        // Legacy rows have workspace_id = NULL — scope by business_id instead
        const { data: legData } = await supabase
          .from('tool_attachments')
          .select('id, parent_id, parent_type, tool_key, workspace_id, lead_id, job_id')
          .eq('id', entityId)
          .eq('business_id', workspaceId)
          .is('workspace_id', null)
          .maybeSingle();

        if (legData) {
          attachment = {
            id: legData.id,
            parent_id: legData.parent_id ?? null,
            parent_type: legData.parent_type ?? null,
            tool_key: (legData as { tool_key?: string }).tool_key ?? null,
            workspace_id: null,
            lead_id: (legData as { lead_id?: string }).lead_id ?? null,
            job_id: (legData as { job_id?: string }).job_id ?? null,
          };
        }
      }
    } catch { /* handled below */ }

    if (!attachment) {
      const notFoundResult: SimulationResult = {
        candidateId,
        candidateType: typeParam,
        simulatedAt: new Date().toISOString(),
        feasible: false,
        blockers: ['Entity not found or not accessible in this workspace. It may have already been fixed or deleted.'],
        warnings: [],
        steps: [],
        affectedEntityIds: [],
        rollbackPossible: false,
        rollbackNotes: 'No repair applied — entity not found.',
        estimatedSyncImpact: 'None.',
        requiresManualConfirmation: true,
        autoRepairAllowed: false,
        summary: `Entity ${entityId} not found in workspace ${workspaceId.slice(0, 8)}…. Candidate may be stale — re-run recovery analysis.`,
      };
      return NextResponse.json(notFoundResult, { headers: { 'Cache-Control': 'no-store' } });
    }

    // ── Run simulation based on type ────────────────────────────────────────

    let result: SimulationResult;

    // ── ATTACHMENT_CAN_REPARENT_TO_JOB ──────────────────────────────────────
    if (typeParam === 'ATTACHMENT_CAN_REPARENT_TO_JOB') {
      if (!targetId) {
        return err('targetEntityId (job UUID) is required for ATTACHMENT_CAN_REPARENT_TO_JOB', 400);
      }

      let targetJob: { id: string; lead_id: string | null; workspace_id: string | null } | null = null;
      try {
        const { data } = await supabase
          .from('jobs')
          .select('id, lead_id, workspace_id')
          .eq('id', targetId)
          .eq('workspace_id', workspaceId)
          .maybeSingle();
        if (data) {
          targetJob = {
            id: data.id,
            lead_id: (data as { lead_id?: string }).lead_id ?? null,
            workspace_id: (data as { workspace_id?: string }).workspace_id ?? null,
          };
        }
      } catch { /* targetJob stays null */ }

      result = simulateReparentToJob(candidateId, attachment, targetJob);
    }

    // ── LEGACY_WORKSPACE_ID_MISSING ─────────────────────────────────────────
    else if (typeParam === 'LEGACY_WORKSPACE_ID_MISSING') {
      result = simulateLegacyBackfill(candidateId, attachment, workspaceId);
    }

    // ── ORPHAN_ATTACHMENT_RECOVERABLE ───────────────────────────────────────
    else {
      // Try to resolve a parent from legacy lead_id or job_id columns
      let resolvedParent: { id: string; state: { id: string; workspace_id: string | null }; type: 'LEAD' | 'JOB' } | null = null;

      if (attachment.lead_id) {
        try {
          const { data } = await supabase
            .from('leads')
            .select('id, workspace_id')
            .eq('id', attachment.lead_id)
            .eq('workspace_id', workspaceId)
            .maybeSingle();
          if (data) {
            resolvedParent = {
              id: data.id,
              state: { id: data.id, workspace_id: (data as { workspace_id?: string }).workspace_id ?? null },
              type: 'LEAD',
            };
          }
        } catch { /* noop */ }
      }

      if (!resolvedParent && attachment.job_id) {
        try {
          const { data } = await supabase
            .from('jobs')
            .select('id, workspace_id')
            .eq('id', attachment.job_id)
            .eq('workspace_id', workspaceId)
            .maybeSingle();
          if (data) {
            resolvedParent = {
              id: data.id,
              state: { id: data.id, workspace_id: (data as { workspace_id?: string }).workspace_id ?? null },
              type: 'JOB',
            };
          }
        } catch { /* noop */ }
      }

      result = simulateOrphanLegacyRestore(candidateId, attachment, resolvedParent);
    }

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[GET /api/workspace/sync-diagnostics/simulate] Failed:', err);
    return NextResponse.json({ error: 'Simulation failed' }, { status: 500 });
  }
}
