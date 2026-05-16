// src/lib/sync-diagnostics/simulation.ts
//
// Pure repair simulation engine.
//
// SAFETY: No Supabase / network calls — accepts pre-fetched entity state.
//         Nothing here can mutate production data.
//         The simulate/route.ts endpoint does the Supabase reads, then calls these
//         pure functions to build the SimulationResult.
//
// autoRepairAllowed is always false — literal type enforced by TypeScript.
// No simulation output is acted upon without explicit Phase 3C wiring.

import type {
  SimulationResult,
  SimulationStep,
  RecoveryCandidateType,
} from './types';

// ─── Input shapes (structural typing — matches simulate/route.ts queries) ─────

type AttachmentState = {
  id: string;
  parent_id: string | null;
  parent_type: string | null;
  tool_key: string | null;
  workspace_id: string | null;
  lead_id?: string | null;   // legacy column
  job_id?: string | null;    // legacy column
};

type JobState = {
  id: string;
  lead_id?: string | null;
  workspace_id: string | null;
};

type LeadState = {
  id: string;
  workspace_id: string | null;
};

// ─── Core helper ─────────────────────────────────────────────────────────────

function buildResult(
  candidateId: string,
  candidateType: RecoveryCandidateType,
  params: {
    feasible: boolean;
    blockers?: string[];
    warnings?: string[];
    steps?: SimulationStep[];
    affectedEntityIds?: string[];
    rollbackPossible?: boolean;
    rollbackNotes?: string;
    estimatedSyncImpact?: string;
    summary: string;
  },
): SimulationResult {
  return {
    candidateId,
    candidateType,
    simulatedAt: new Date().toISOString(),
    feasible: params.feasible,
    blockers: params.blockers ?? [],
    warnings: params.warnings ?? [],
    steps: params.steps ?? [],
    affectedEntityIds: params.affectedEntityIds ?? [],
    rollbackPossible: params.rollbackPossible ?? params.feasible,
    rollbackNotes: params.rollbackNotes ?? (params.feasible
      ? 'Rollback would restore: parent_id → original value, parent_type → original value.'
      : 'No repair applied — nothing to roll back.'),
    estimatedSyncImpact: params.estimatedSyncImpact ?? 'No sync impact (web is server source-of-truth).',
    requiresManualConfirmation: true,   // always require explicit user confirmation
    autoRepairAllowed: false,           // literal false — never changes
    summary: params.summary,
  };
}

// ─── Simulation 1: ATTACHMENT_CAN_REPARENT_TO_JOB ────────────────────────────

/**
 * Simulates re-parenting a tool_attachment from a stale Lead reference to
 * the Job that was created from that Lead.
 *
 * Confidence checks:
 * 1. Target job exists in workspace.
 * 2. job.lead_id matches the attachment's current parent_id (the broken lead).
 * 3. The attachment's workspace_id matches the job's workspace_id.
 * 4. No other attachment already claims this exact job as parent (conflict check).
 */
export function simulateReparentToJob(
  candidateId: string,
  attachment: AttachmentState,
  targetJob: JobState | null,
): SimulationResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!targetJob) {
    blockers.push('Target job not found or not accessible in this workspace.');
    return buildResult(candidateId, 'ATTACHMENT_CAN_REPARENT_TO_JOB', {
      feasible: false, blockers,
      summary: 'Cannot simulate: target job does not exist or is outside the workspace.',
    });
  }

  // Validate lead_id chain
  const chainConfirmed = targetJob.lead_id != null && targetJob.lead_id === attachment.parent_id;
  if (!chainConfirmed) {
    if (targetJob.lead_id == null) {
      warnings.push(`Target job has no lead_id set — cannot confirm it originated from lead ${attachment.parent_id?.slice(0, 8)}….`);
    } else {
      blockers.push(`Target job.lead_id (${targetJob.lead_id.slice(0, 8)}…) does not match attachment.parent_id (${attachment.parent_id?.slice(0, 8)}…) — re-parenting could create an incorrect relationship.`);
    }
  }

  if (blockers.length > 0) {
    return buildResult(candidateId, 'ATTACHMENT_CAN_REPARENT_TO_JOB', {
      feasible: false, blockers, warnings,
      summary: 'Cannot safely simulate re-parent: lead_id chain mismatch.',
    });
  }

  // Workspace consistency
  if (attachment.workspace_id !== targetJob.workspace_id) {
    blockers.push('Attachment and target job are in different workspaces — cross-workspace re-parenting is not allowed.');
    return buildResult(candidateId, 'ATTACHMENT_CAN_REPARENT_TO_JOB', {
      feasible: false, blockers,
      summary: 'Cannot simulate: workspace ID mismatch between attachment and target job.',
    });
  }

  if (!chainConfirmed) {
    warnings.push('lead_id chain not fully confirmed — manual verification recommended before applying.');
  }

  const steps: SimulationStep[] = [
    {
      stepNumber: 1,
      action: 'Update attachment.parent_id',
      targetEntityId: attachment.id,
      targetEntityType: 'tool_attachment',
      fieldChanges: [{ field: 'parent_id', from: attachment.parent_id ?? null, to: targetJob.id }],
      risk: 'Low — restores correct parent linkage. Reversible.',
      reversible: true,
    },
    {
      stepNumber: 2,
      action: 'Update attachment.parent_type',
      targetEntityId: attachment.id,
      targetEntityType: 'tool_attachment',
      fieldChanges: [{ field: 'parent_type', from: attachment.parent_type ?? null, to: 'JOB' }],
      risk: 'Low — changes type label from LEAD to JOB. Reversible.',
      reversible: true,
    },
  ];

  return buildResult(candidateId, 'ATTACHMENT_CAN_REPARENT_TO_JOB', {
    feasible: true,
    warnings,
    steps,
    affectedEntityIds: [attachment.id, targetJob.id],
    rollbackPossible: true,
    rollbackNotes: `Rollback: SET parent_id = '${attachment.parent_id}', parent_type = '${attachment.parent_type}' WHERE id = '${attachment.id}'.`,
    estimatedSyncImpact: 'Web: no sync impact — change is a direct Supabase write. Android/iOS: attachment will re-appear under correct Job on next pull.',
    summary:
      `Attachment ${attachment.id.slice(0, 8)}… can be safely re-parented from ` +
      `LEAD ${attachment.parent_id?.slice(0, 8)}… → JOB ${targetJob.id.slice(0, 8)}….` +
      (chainConfirmed
        ? ` Lead-to-Job chain confirmed (job.lead_id matches). Confidence: HIGH.`
        : ` Lead-to-Job chain not fully confirmed. Confidence: MEDIUM — manual review recommended.`),
  });
}

// ─── Simulation 2: LEGACY_WORKSPACE_ID_MISSING ───────────────────────────────

/**
 * Simulates backfilling workspace_id = business_id on a legacy attachment row.
 * This is a DBA-led migration action — the simulation explains the exact change.
 */
export function simulateLegacyBackfill(
  candidateId: string,
  attachment: AttachmentState,
  workspaceId: string,
): SimulationResult {
  if (attachment.workspace_id !== null) {
    return buildResult(candidateId, 'LEGACY_WORKSPACE_ID_MISSING', {
      feasible: false,
      blockers: ['workspace_id is already set — this row does not require backfill.'],
      summary: 'Backfill not needed: workspace_id is already populated.',
    });
  }

  const steps: SimulationStep[] = [
    {
      stepNumber: 1,
      action: 'Set workspace_id = business_id',
      targetEntityId: attachment.id,
      targetEntityType: 'tool_attachment',
      fieldChanges: [{ field: 'workspace_id', from: null, to: workspaceId }],
      risk: 'Low — sets a NULL column to the workspace UUID. Makes row visible to workspace-scoped queries.',
      reversible: true,
    },
  ];

  return buildResult(candidateId, 'LEGACY_WORKSPACE_ID_MISSING', {
    feasible: true,
    warnings: [
      'This is a DBA-led migration action. Run as part of a coordinated batch migration, not one row at a time.',
      'Verify all attachments in the workspace are migrated together to avoid partial visibility.',
    ],
    steps,
    affectedEntityIds: [attachment.id],
    rollbackPossible: true,
    rollbackNotes: `Rollback: SET workspace_id = NULL WHERE id = '${attachment.id}' (returns row to pre-migration state).`,
    estimatedSyncImpact: 'Row will become visible to workspace-scoped queries on next read. Android/iOS sync will pick it up on next pull.',
    summary:
      `Attachment ${attachment.id.slice(0, 8)}… can have workspace_id backfilled from business_id ${workspaceId.slice(0, 8)}…. ` +
      `Simple one-field update. Reversible. Requires DBA-led batch migration coordination.`,
  });
}

// ─── Simulation 3: ORPHAN_ATTACHMENT_RECOVERABLE (legacy lead_id/job_id) ──────

/**
 * Simulates restoring parent_id/parent_type from legacy lead_id or job_id columns
 * for orphan attachments created before the parent_id migration.
 */
export function simulateOrphanLegacyRestore(
  candidateId: string,
  attachment: AttachmentState,
  resolvedParent: { id: string; state: LeadState | JobState; type: 'LEAD' | 'JOB' } | null,
): SimulationResult {
  if (!resolvedParent) {
    return buildResult(candidateId, 'ORPHAN_ATTACHMENT_RECOVERABLE', {
      feasible: false,
      blockers: [
        'No resolvable parent found via legacy lead_id/job_id columns.',
        'Parent entity is absent from this workspace — orphan has no recoverable target.',
      ],
      summary: 'Cannot simulate: orphan attachment has no resolvable parent in this workspace.',
    });
  }

  const legacyField = resolvedParent.type === 'LEAD' ? 'lead_id' : 'job_id';
  const legacyId = resolvedParent.type === 'LEAD'
    ? (attachment.lead_id ?? null)
    : (attachment.job_id ?? null);

  if (!legacyId) {
    return buildResult(candidateId, 'ORPHAN_ATTACHMENT_RECOVERABLE', {
      feasible: false,
      blockers: [`Legacy ${legacyField} column is NULL — cannot restore parent from it.`],
      summary: `Cannot simulate: legacy ${legacyField} is not set on this attachment.`,
    });
  }

  const steps: SimulationStep[] = [
    {
      stepNumber: 1,
      action: `Restore parent_id from legacy ${legacyField}`,
      targetEntityId: attachment.id,
      targetEntityType: 'tool_attachment',
      fieldChanges: [{ field: 'parent_id', from: null, to: resolvedParent.id }],
      risk: 'Medium — restores linkage from legacy column. Verify parent entity is the intended target.',
      reversible: true,
    },
    {
      stepNumber: 2,
      action: `Set parent_type = '${resolvedParent.type}'`,
      targetEntityId: attachment.id,
      targetEntityType: 'tool_attachment',
      fieldChanges: [{ field: 'parent_type', from: null, to: resolvedParent.type }],
      risk: 'Low — sets type label. Reversible.',
      reversible: true,
    },
  ];

  return buildResult(candidateId, 'ORPHAN_ATTACHMENT_RECOVERABLE', {
    feasible: true,
    warnings: [
      `Restoration is based on legacy ${legacyField} column — confirm the referenced entity is the correct parent.`,
      'If lead was converted to job, prefer using ATTACHMENT_CAN_REPARENT_TO_JOB simulation instead.',
    ],
    steps,
    affectedEntityIds: [attachment.id, resolvedParent.id],
    rollbackPossible: true,
    rollbackNotes: `Rollback: SET parent_id = NULL, parent_type = NULL WHERE id = '${attachment.id}'.`,
    estimatedSyncImpact: 'Attachment will resolve to correct parent on next workspace load. Android/iOS will reflect on next pull.',
    summary:
      `Orphan attachment ${attachment.id.slice(0, 8)}… can be restored by setting parent_id from ` +
      `legacy ${legacyField} = ${resolvedParent.id.slice(0, 8)}…. Parent entity exists in workspace. ` +
      `Confidence: MEDIUM — verify parent intent before applying.`,
  });
}

// ─── Report builder ───────────────────────────────────────────────────────────

/**
 * Formats a SimulationResult as a paste-ready text report.
 * Safe to share — no tokens, no rawPayload, no secrets.
 */
export function generateSimulationReport(result: SimulationResult): string {
  const lines: string[] = [
    `TISSCA Sync Recovery — Simulation Report`,
    `Simulated at: ${result.simulatedAt}`,
    `Candidate ID: ${result.candidateId}`,
    `Type: ${result.candidateType}`,
    ``,
    `FEASIBLE: ${result.feasible ? 'YES' : 'NO'}`,
    `Rollback possible: ${result.rollbackPossible ? 'YES' : 'NO'}`,
    `Requires manual confirmation: ${result.requiresManualConfirmation ? 'YES' : 'NO'}`,
    `autoRepairAllowed: ${result.autoRepairAllowed}`,
    ``,
    `SUMMARY`,
    result.summary,
    ``,
  ];

  if (result.blockers.length > 0) {
    lines.push('BLOCKERS');
    result.blockers.forEach(b => lines.push(`  ✗ ${b}`));
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push('WARNINGS');
    result.warnings.forEach(w => lines.push(`  ⚠ ${w}`));
    lines.push('');
  }

  if (result.steps.length > 0) {
    lines.push('STEPS (SIMULATED — NOT APPLIED)');
    result.steps.forEach(step => {
      lines.push(`  Step ${step.stepNumber}: ${step.action}`);
      lines.push(`    Entity: ${step.targetEntityType} ${step.targetEntityId}`);
      step.fieldChanges.forEach(fc =>
        lines.push(`    ${fc.field}: "${fc.from}" → "${fc.to}"`),
      );
      lines.push(`    Risk: ${step.risk}`);
      lines.push(`    Reversible: ${step.reversible ? 'Yes' : 'No'}`);
    });
    lines.push('');
  }

  lines.push('ROLLBACK NOTES');
  lines.push(result.rollbackNotes);
  lines.push('');
  lines.push('SYNC IMPACT');
  lines.push(result.estimatedSyncImpact);
  lines.push('');
  lines.push('NOTE: This is a READ-ONLY simulation. No data has been changed.');

  return lines.join('\n');
}
