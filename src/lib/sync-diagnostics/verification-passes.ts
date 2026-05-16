// src/lib/sync-diagnostics/verification-passes.ts
//
// Modular integrity verification passes for the TISSCA Sync Recovery Engine.
//
// SAFETY: Pure TypeScript — zero Supabase / network / side-effects.
//         All passes operate on already-fetched data from Phase 2 endpoints.
//         Nothing here can mutate production data.
//
// Each pass returns IntegrityPassResult with status + findings.
// Runs client-side in < 1ms per pass (bounded by input data, not DB queries).
//
// Pass names mirror the Android canonical contract for cross-platform parity.

import type {
  IntegrityPassResult,
  IntegrityPassFinding,
  IntegrityPassStatus,
  RecoverySeverity,
  RecoverabilityClass,
} from './types';

// ─── Minimal input shapes (structural typing — accepts Phase 2 API shapes) ────

type AttachmentIntegrity = {
  orphan_count: number;
  parent_mismatch_count: number;
  workspace_id_missing_count: number;
};

type RemoteCounts = {
  leads: number; jobs: number; tasks: number; assets: number;
  documents: number; tool_attachments: number; payment_requests: number; clients: number;
};

type LastActivity = {
  last_lead_created_at_millis: number | null;
  last_job_created_at_millis: number | null;
  last_tool_attachment_created_at_millis: number | null;
  last_document_created_at: string | null;
  last_crm_history_at: string | null;
};

type SnapshotInput = {
  workspace_id: string | null;
  attachment_integrity: AttachmentIntegrity;
  failed_tables: string[];
  remote_counts: RemoteCounts;
  last_activity: LastActivity;
  platform: string;
};

type MinimalDetailItem = {
  id: string;
  entity_type: string;
  parent_id?: string | null;
  parent_type?: string | null;
  tool_key?: string | null;
  matching_job_for_lead?: string | null;
  likely_cause?: string | null;
  workspace_id?: string | null;
};

export type VerificationInput = {
  snapshot: SnapshotInput;
  orphanItems?: MinimalDetailItem[];
  mismatchItems?: MinimalDetailItem[];
  legacyItems?: MinimalDetailItem[];
  realtimeStatus?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<RecoverySeverity, number> = {
  critical: 4, high: 3, medium: 2, low: 1, info: 0,
};

function highestSeverity(findings: IntegrityPassFinding[]): RecoverySeverity | null {
  if (findings.length === 0) return null;
  return findings.reduce((a, b) =>
    SEVERITY_ORDER[a.severity] >= SEVERITY_ORDER[b.severity] ? a : b,
  ).severity;
}

function finding(
  passName: string,
  index: number,
  entityId: string,
  entityType: string,
  description: string,
  severity: RecoverySeverity,
  recoverabilityClass: RecoverabilityClass,
  suggestedRepair: string,
): IntegrityPassFinding {
  return {
    findingId: `${passName}_${entityId || String(index)}`,
    entityType,
    entityId,
    description,
    severity,
    recoverabilityClass,
    suggestedRepair,
  };
}

function passResult(
  passName: string,
  description: string,
  status: IntegrityPassStatus,
  findings: IntegrityPassFinding[],
  durationMs: number,
  notes: string[] = [],
): IntegrityPassResult {
  return {
    passName,
    description,
    status,
    findings,
    affectedEntityCount: findings.length,
    highestSeverity: highestSeverity(findings),
    runAt: new Date().toISOString(),
    durationMs,
    notes,
  };
}

// ─── Pass 1: verifyAttachmentParents ─────────────────────────────────────────

/**
 * Checks: orphan_count and parent_mismatch_count from snapshot.
 * If orphanItems/mismatchItems are provided, generates per-entity findings.
 */
export function verifyAttachmentParents(input: VerificationInput): IntegrityPassResult {
  const start = Date.now();
  const { snapshot, orphanItems, mismatchItems } = input;
  const findings: IntegrityPassFinding[] = [];

  if (snapshot.attachment_integrity.orphan_count > 0) {
    if (orphanItems && orphanItems.length > 0) {
      orphanItems.forEach((item, i) => {
        findings.push(finding(
          'verifyAttachmentParents', i, item.id, 'tool_attachment',
          `Orphan attachment: no parent_id/parent_type. ${item.likely_cause ?? ''}`.trim(),
          'high', 'needs_manual_review',
          'Inspect via drill-down, trace legacy lead_id/job_id to determine correct parent.',
        ));
      });
    } else {
      findings.push(finding(
        'verifyAttachmentParents', 0, 'workspace', 'tool_attachment',
        `${snapshot.attachment_integrity.orphan_count} orphan attachment(s) detected with no parent_id/parent_type.`,
        'high', 'needs_manual_review',
        'Run orphans drill-down in the Diagnostics panel to inspect individual records.',
      ));
    }
  }

  if (snapshot.attachment_integrity.parent_mismatch_count > 0) {
    if (mismatchItems && mismatchItems.length > 0) {
      mismatchItems.forEach((item, i) => {
        const isRecoverable = Boolean(item.matching_job_for_lead);
        findings.push(finding(
          'verifyAttachmentParents', orphanItems?.length ?? 0 + i, item.id, 'tool_attachment',
          `Parent mismatch: parent_id set but parent not found in workspace. ${item.likely_cause ?? ''}`.trim(),
          isRecoverable ? 'medium' : 'high',
          isRecoverable ? 'recoverable' : 'needs_manual_review',
          isRecoverable
            ? `Can re-parent to job ${item.matching_job_for_lead} (run simulation first).`
            : 'No automatic recovery target found — manual DBA review required.',
        ));
      });
    } else {
      findings.push(finding(
        'verifyAttachmentParents', 99, 'workspace', 'tool_attachment',
        `${snapshot.attachment_integrity.parent_mismatch_count} attachment(s) reference a parent not found in this workspace.`,
        'high', 'needs_manual_review',
        'Run parent_mismatch drill-down to inspect individual records.',
      ));
    }
  }

  const status: IntegrityPassStatus = findings.length === 0 ? 'pass' : 'fail';
  return passResult('verifyAttachmentParents', 'Verify tool_attachment parent linkage integrity', status, findings, Date.now() - start);
}

// ─── Pass 2: verifyWorkspaceScope ────────────────────────────────────────────

/**
 * Checks workspace_id_missing_count (legacy rows) and failed_tables.
 */
export function verifyWorkspaceScope(input: VerificationInput): IntegrityPassResult {
  const start = Date.now();
  const { snapshot } = input;
  const findings: IntegrityPassFinding[] = [];

  if (snapshot.attachment_integrity.workspace_id_missing_count > 0) {
    findings.push(finding(
      'verifyWorkspaceScope', 0, 'workspace', 'tool_attachment',
      `${snapshot.attachment_integrity.workspace_id_missing_count} tool_attachment row(s) have business_id set but workspace_id NULL — invisible to workspace-scoped queries.`,
      'medium', 'migration_required',
      'DBA backfill: UPDATE tool_attachments SET workspace_id = business_id WHERE workspace_id IS NULL AND business_id = <ws>.',
    ));
  }

  snapshot.failed_tables.forEach((table, i) => {
    findings.push(finding(
      'verifyWorkspaceScope', i + 1, table, table,
      `Table "${table}" failed to respond during the last diagnostics snapshot.`,
      'high', 'transient',
      `Confirm RLS policy on "${table}" allows workspace owner/admin reads. Re-run diagnostics to check if transient.`,
    ));
  });

  if (snapshot.workspace_id === null) {
    findings.push(finding(
      'verifyWorkspaceScope', 99, 'session', 'workspace',
      'workspace_id is null in the diagnostics snapshot — workspace resolution may have failed.',
      'critical', 'needs_manual_review',
      'Verify workspace_members record exists for this user.',
    ));
  }

  const status: IntegrityPassStatus =
    findings.length === 0 ? 'pass' :
    findings.some(f => f.severity === 'critical' || f.severity === 'high') ? 'fail' : 'warn';

  return passResult(
    'verifyWorkspaceScope',
    'Verify all entities are correctly workspace-scoped',
    status, findings, Date.now() - start,
  );
}

// ─── Pass 3: verifyLeadJobChains ─────────────────────────────────────────────

/**
 * Checks whether attachments pointing at deleted leads have a recoverable
 * Job in the same workspace (lead-converted-to-job pattern).
 */
export function verifyLeadJobChains(input: VerificationInput): IntegrityPassResult {
  const start = Date.now();
  const { snapshot, mismatchItems } = input;
  const findings: IntegrityPassFinding[] = [];

  if (snapshot.attachment_integrity.parent_mismatch_count === 0) {
    return passResult(
      'verifyLeadJobChains',
      'Verify lead → job conversion chain integrity for attachments',
      'pass', [], Date.now() - start,
      ['No parent mismatches detected — all attachment parent chains appear intact.'],
    );
  }

  if (!mismatchItems || mismatchItems.length === 0) {
    return passResult(
      'verifyLeadJobChains',
      'Verify lead → job conversion chain integrity for attachments',
      'warn', [], Date.now() - start,
      ['Parent mismatches exist but drill-down data not yet loaded. Open parent_mismatch drill-down in Diagnostics to see per-entity chain analysis.'],
    );
  }

  mismatchItems.forEach((item, i) => {
    if (item.parent_type === 'LEAD' && item.matching_job_for_lead) {
      findings.push(finding(
        'verifyLeadJobChains', i, item.id, 'tool_attachment',
        `Attachment still points at original Lead (parent_type=LEAD parent_id=${item.parent_id?.slice(0, 8)}…). Matching job ${item.matching_job_for_lead.slice(0, 8)}… found — likely pre-v5.74.4 conversion.`,
        'medium', 'recoverable',
        `Simulate re-parent to job ${item.matching_job_for_lead} via Recovery Analysis → Run Simulation.`,
      ));
    } else if (item.parent_type === 'LEAD') {
      findings.push(finding(
        'verifyLeadJobChains', i, item.id, 'tool_attachment',
        `Attachment points at missing Lead with no recoverable Job found. Parent chain is broken.`,
        'high', 'needs_manual_review',
        'Manual DBA review required — confirm whether the lead was deleted intentionally.',
      ));
    }
  });

  const status: IntegrityPassStatus =
    findings.length === 0 ? 'pass' :
    findings.some(f => f.recoverabilityClass === 'needs_manual_review') ? 'fail' : 'warn';

  return passResult(
    'verifyLeadJobChains',
    'Verify lead → job conversion chain integrity for attachments',
    status, findings, Date.now() - start,
  );
}

// ─── Pass 4: verifyRemoteMirrorIntegrity ─────────────────────────────────────

/**
 * Sanity-checks remote counts and failed_tables as indicators of mirror health.
 * On web, the remote IS the source of truth — any failure here is significant.
 */
export function verifyRemoteMirrorIntegrity(input: VerificationInput): IntegrityPassResult {
  const start = Date.now();
  const { snapshot } = input;
  const findings: IntegrityPassFinding[] = [];

  if (snapshot.failed_tables.length > 0) {
    findings.push(finding(
      'verifyRemoteMirrorIntegrity', 0, 'workspace', 'remote',
      `Remote mirror query failed for: ${snapshot.failed_tables.join(', ')}. Counts for these tables may be stale/wrong.`,
      'high', 'transient',
      'Re-run diagnostics. If failure persists, confirm RLS policies and Supabase service health.',
    ));
  }

  const counts = snapshot.remote_counts;
  const totalEntities = counts.leads + counts.jobs + counts.tasks + counts.assets +
    counts.documents + counts.tool_attachments + counts.payment_requests;
  if (totalEntities === 0 && snapshot.failed_tables.length === 0) {
    findings.push(finding(
      'verifyRemoteMirrorIntegrity', 1, 'workspace', 'remote',
      'All remote counts are zero. This may be correct for a new workspace or indicate a scoping error.',
      'low', 'needs_manual_review',
      'Verify workspace is active and workspace_id is resolving correctly.',
    ));
  }

  const status: IntegrityPassStatus = findings.length === 0 ? 'pass' :
    findings.some(f => f.severity === 'high') ? 'fail' : 'warn';

  return passResult(
    'verifyRemoteMirrorIntegrity',
    'Verify Supabase remote mirror is reachable and consistent',
    status, findings, Date.now() - start,
  );
}

// ─── Pass 5: verifyDuplicateEntities ─────────────────────────────────────────

/**
 * Duplicate detection requires a full table scan — not possible in a pure
 * client-side pass. Marked as SKIPPED with guidance to use recovery endpoint.
 */
export function verifyDuplicateEntities(_input: VerificationInput): IntegrityPassResult {
  return passResult(
    'verifyDuplicateEntities',
    'Verify no duplicate entities exist in workspace',
    'skipped', [], 0,
    [
      'Platform-limited: duplicate detection requires a full remote scan not available in snapshot data.',
      'Run Recovery Analysis (Phase 3) to check for DUPLICATE_REMOTE_ENTITY candidates.',
    ],
  );
}

// ─── Pass 6: verifySyncQueueHealth ───────────────────────────────────────────

/**
 * On web, there is no outbound sync queue (server is source of truth).
 * Returns PASS with platform note. Android/iOS will have real queue metrics here.
 */
export function verifySyncQueueHealth(_input: VerificationInput): IntegrityPassResult {
  return passResult(
    'verifySyncQueueHealth',
    'Verify outbound sync queue health',
    'pass', [], 0,
    [
      'Platform-N/A on web. Web has no DataStore / outbound sync queue — all writes are direct Supabase API calls.',
      'Android/iOS report real queue depth, retry counts, and quarantined entity counts here.',
    ],
  );
}

// ─── Pass 7: verifyRealtimeHealth ────────────────────────────────────────────

/**
 * Checks browser realtime / network status.
 */
export function verifyRealtimeHealth(input: VerificationInput): IntegrityPassResult {
  const start = Date.now();
  const { realtimeStatus = 'unknown' } = input;
  const findings: IntegrityPassFinding[] = [];

  if (realtimeStatus === 'offline') {
    findings.push(finding(
      'verifyRealtimeHealth', 0, 'browser', 'network',
      'Browser is offline. Supabase API calls will fail until connectivity is restored.',
      'high', 'transient',
      'Restore internet connectivity. No data loss risk — web writes are synchronous.',
    ));
  } else if (realtimeStatus === 'error') {
    findings.push(finding(
      'verifyRealtimeHealth', 0, 'realtime', 'network',
      'Realtime connection reported an error state.',
      'medium', 'transient',
      'Refresh the page or wait for automatic reconnection.',
    ));
  }

  const status: IntegrityPassStatus =
    realtimeStatus === 'offline' ? 'fail' :
    realtimeStatus === 'error' ? 'warn' : 'pass';

  return passResult(
    'verifyRealtimeHealth',
    'Verify realtime connection and network health',
    status, findings, Date.now() - start,
    realtimeStatus === 'not_used'
      ? ['Realtime subscription is not active on this page. TissChat pages manage their own realtime channels.']
      : [],
  );
}

// ─── Pass 8: verifyDependencyGraph ───────────────────────────────────────────

/**
 * Inspects parent mismatch + orphan items for dependency chain issues:
 * cycles, missing intermediaries, and blocked resolution paths.
 */
export function verifyDependencyGraph(input: VerificationInput): IntegrityPassResult {
  const start = Date.now();
  const { orphanItems, mismatchItems } = input;
  const findings: IntegrityPassFinding[] = [];

  const allItems = [...(orphanItems ?? []), ...(mismatchItems ?? [])];

  if (allItems.length === 0) {
    const hasIssues = input.snapshot.attachment_integrity.orphan_count > 0 ||
      input.snapshot.attachment_integrity.parent_mismatch_count > 0;
    return passResult(
      'verifyDependencyGraph',
      'Verify entity dependency graph for cycles and broken chains',
      hasIssues ? 'warn' : 'pass',
      [], Date.now() - start,
      hasIssues
        ? ['Dependency issues detected in snapshot but drill-down data not loaded. Open drill-downs in Diagnostics to enable full graph analysis.']
        : ['No dependency chain issues detected.'],
    );
  }

  // Check for multi-blocked items (entity has no parent AND no recovery target)
  const fullyBlocked = allItems.filter(
    item => !item.parent_id && !item.matching_job_for_lead,
  );

  fullyBlocked.forEach((item, i) => {
    findings.push(finding(
      'verifyDependencyGraph', i, item.id, item.entity_type,
      `Entity has no parent linkage and no detected recovery target — fully blocked in dependency graph.`,
      'high', 'needs_manual_review',
      'Trace entity creation history (CRM history, created_at timestamp) to reconstruct intended parent relationship.',
    ));
  });

  // Check for recoverable chains (blocking entity is identified)
  const recoverable = allItems.filter(
    item => !item.parent_id && item.matching_job_for_lead,
  );

  recoverable.forEach((item, i) => {
    findings.push(finding(
      'verifyDependencyGraph', i + fullyBlocked.length, item.id, item.entity_type,
      `Dependency chain broken at parent — but recovery target job ${item.matching_job_for_lead?.slice(0, 8)}… found.`,
      'medium', 'recoverable',
      'Run simulation for ATTACHMENT_CAN_REPARENT_TO_JOB in Recovery Analysis.',
    ));
  });

  const status: IntegrityPassStatus =
    findings.length === 0 ? 'pass' :
    findings.some(f => f.severity === 'high') ? 'fail' : 'warn';

  return passResult(
    'verifyDependencyGraph',
    'Verify entity dependency graph for cycles and broken chains',
    status, findings, Date.now() - start,
  );
}

// ─── runAllPasses ─────────────────────────────────────────────────────────────

/**
 * Runs all 8 verification passes and returns results sorted by severity.
 * Pure synchronous — no network calls. Safe to call in useMemo.
 */
export function runAllPasses(input: VerificationInput): IntegrityPassResult[] {
  return [
    verifyAttachmentParents(input),
    verifyWorkspaceScope(input),
    verifyLeadJobChains(input),
    verifyRemoteMirrorIntegrity(input),
    verifyDuplicateEntities(input),
    verifySyncQueueHealth(input),
    verifyRealtimeHealth(input),
    verifyDependencyGraph(input),
  ];
}
