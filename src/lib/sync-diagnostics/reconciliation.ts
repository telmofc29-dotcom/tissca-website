// src/lib/sync-diagnostics/reconciliation.ts
//
// Pure reconciliation classification helpers.
//
// SAFETY: No Supabase / network calls. Pure TypeScript logic.
//         Accepts data already fetched by Phase 2 drill-down endpoints.
//
// Used by: Phase 3 recovery/route.ts (server) and page (client display).

import type {
  MismatchType,
  ReconciliationResult,
  RecoverabilityClass,
  ConfidenceLevel,
} from './types';

// ─── Minimal item shapes (structural typing — accepts Phase 2 DetailItem) ─────

type ReconciliationItem = {
  id: string;
  entity_type: string;
  parent_id?: string | null;
  parent_type?: string | null;
  tool_key?: string | null;
  matching_job_for_lead?: string | null;
  likely_cause?: string | null;
  workspace_id?: string | null;
};

// ─── Confidence scoring ───────────────────────────────────────────────────────

/**
 * Assigns a 0–100 confidence score to a recovery path.
 * Higher = more confident the suggested repair is correct.
 */
export function assignConfidenceScore(item: ReconciliationItem): number {
  let score = 50; // base

  // Strong positive signals
  if (item.matching_job_for_lead) score += 30;   // clear lead→job conversion path
  if (item.parent_type === 'LEAD' && item.parent_id) score += 5; // at least parent type is set
  if (item.tool_key) score += 5;                 // tool key helps confirm correct parent

  // Negative signals
  if (!item.parent_id && !item.parent_type) score -= 20;  // fully orphaned
  if (!item.workspace_id) score -= 15;                    // workspace scope unknown

  // Likely-cause hints
  if (item.likely_cause?.includes('legacy') || item.likely_cause?.includes('pre-v5')) score += 10;
  if (item.likely_cause?.includes('deleted') || item.likely_cause?.includes('unknown')) score -= 10;

  return Math.max(0, Math.min(100, score));
}

/**
 * Maps a numeric confidence score to ConfidenceLevel enum.
 */
export function scoreToConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 75) return 'high';
  if (score >= 50) return 'medium';
  if (score > 0)   return 'low';
  return 'unknown';
}

// ─── Repair path suggestion ───────────────────────────────────────────────────

/**
 * Returns a human-readable suggested repair path for a given mismatch type.
 * Suggestions are advisory — no automation. Operator must confirm.
 */
export function suggestRepairPath(mismatchType: MismatchType, item: ReconciliationItem): string {
  switch (mismatchType) {
    case 'LEAD_CONVERTED_PARENT_STALE':
      return item.matching_job_for_lead
        ? `Re-parent attachment to job ${item.matching_job_for_lead.slice(0, 8)}… (run simulation to validate).`
        : 'No matching job found — manual investigation required.';

    case 'PARENT_MISSING_REMOTELY':
      return item.matching_job_for_lead
        ? `Check if parent lead was converted to job ${item.matching_job_for_lead.slice(0, 8)}… before re-parenting.`
        : 'Confirm parent entity was not accidentally deleted. If deleted intentionally, this attachment may be archivable.';

    case 'ORPHAN_NO_PARENT':
      return 'Inspect attachment created_at and tool_key against leads/jobs from same timeframe to find intended parent.';

    case 'WORKSPACE_SCOPE_ERROR':
      return 'DBA backfill: SET workspace_id = business_id WHERE workspace_id IS NULL AND business_id = <workspace_id>.';

    case 'PARENT_DELETED':
      return 'Parent entity was definitively removed. Document for audit. If attachment data valuable, consider associating to an archival entity.';

    case 'DUPLICATE_IDS':
      return 'Compare created_at, updated_at, and content fields between duplicates. Keep most recent; archive or soft-delete older.';

    case 'TIMESTAMP_CONFLICT':
      return 'Fetch both local and remote versions. The higher updated_at is likely authoritative. Confirm with data owner before overwriting.';

    case 'LOCAL_ONLY':
      return 'Entity exists only in local store (N/A on web). Force-push from device or confirm if intentionally not synced.';

    case 'REMOTE_ONLY':
      return 'Entity exists only remotely. Pull on device to resolve (N/A on web — remote IS source of truth).';

    default:
      return 'Unknown mismatch type — manual investigation required.';
  }
}

// ─── Recoverability classification ───────────────────────────────────────────

function classifyRecoverability(
  mismatchType: MismatchType,
  score: number,
  item: ReconciliationItem,
): RecoverabilityClass {
  if (mismatchType === 'WORKSPACE_SCOPE_ERROR') return 'migration_required';
  if (mismatchType === 'PARENT_DELETED')        return 'needs_manual_review';
  if (mismatchType === 'DUPLICATE_IDS')         return 'needs_manual_review';
  if (mismatchType === 'LOCAL_ONLY')            return 'transient';
  if (mismatchType === 'REMOTE_ONLY')           return 'transient';
  if (mismatchType === 'TIMESTAMP_CONFLICT')    return 'needs_manual_review';
  if (item.matching_job_for_lead)               return 'recoverable';
  if (score < 30)                               return 'unrecoverable';
  return 'needs_manual_review';
}

function isTransient(mismatchType: MismatchType): boolean {
  return mismatchType === 'LOCAL_ONLY' || mismatchType === 'REMOTE_ONLY' || mismatchType === 'TIMESTAMP_CONFLICT';
}

function isRetryable(mismatchType: MismatchType): boolean {
  return mismatchType === 'LOCAL_ONLY' || mismatchType === 'REMOTE_ONLY';
}

// ─── Public classify functions ────────────────────────────────────────────────

/**
 * Classify a parent-mismatch tool_attachment (parent_id set but not found remotely).
 */
export function classifyAttachmentMismatch(item: ReconciliationItem): ReconciliationResult {
  const mismatchType: MismatchType = item.matching_job_for_lead
    ? 'LEAD_CONVERTED_PARENT_STALE'
    : 'PARENT_MISSING_REMOTELY';

  const score = assignConfidenceScore(item);

  return {
    entityId: item.id,
    entityType: item.entity_type,
    mismatchType,
    description: item.likely_cause ??
      (mismatchType === 'LEAD_CONVERTED_PARENT_STALE'
        ? 'Lead was converted to Job; attachment still references the original Lead.'
        : 'Attachment parent_id references an entity not found in this workspace.'),
    confidenceScore: score,
    recoverabilityClass: classifyRecoverability(mismatchType, score, item),
    suggestedRepairPath: suggestRepairPath(mismatchType, item),
    isTransient: isTransient(mismatchType),
    isRetryable: isRetryable(mismatchType),
  };
}

/**
 * Classify an orphan tool_attachment (parent_id/parent_type NULL).
 */
export function classifyOrphanAttachment(item: ReconciliationItem): ReconciliationResult {
  const mismatchType: MismatchType = 'ORPHAN_NO_PARENT';
  const score = assignConfidenceScore(item);

  const description =
    item.likely_cause?.includes('legacy')
      ? 'Legacy row created before parent_id/parent_type columns existed. Has lead_id/job_id legacy links.'
      : 'Attachment has no parent linkage at all — origin unclear.';

  return {
    entityId: item.id,
    entityType: item.entity_type,
    mismatchType,
    description,
    confidenceScore: score,
    recoverabilityClass: classifyRecoverability(mismatchType, score, item),
    suggestedRepairPath: suggestRepairPath(mismatchType, item),
    isTransient: false,
    isRetryable: false,
  };
}

/**
 * Classify a legacy row with workspace_id = NULL.
 */
export function classifyLegacyWorkspaceMissing(item: ReconciliationItem): ReconciliationResult {
  return {
    entityId: item.id,
    entityType: item.entity_type,
    mismatchType: 'WORKSPACE_SCOPE_ERROR',
    description: 'Row was created before workspace_id column existed. business_id is set but workspace_id is NULL, making it invisible to workspace-scoped queries.',
    confidenceScore: 95,     // very high confidence — cause is structural, not ambiguous
    recoverabilityClass: 'migration_required',
    suggestedRepairPath: suggestRepairPath('WORKSPACE_SCOPE_ERROR', item),
    isTransient: false,
    isRetryable: false,
  };
}
