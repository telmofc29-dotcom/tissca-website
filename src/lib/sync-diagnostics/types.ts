// src/lib/sync-diagnostics/types.ts
//
// Canonical cross-platform type contracts for the TISSCA Sync Recovery Engine.
//
// Android = source-of-truth for naming, enum values, and field order.
// iOS and Website MUST mirror these exactly so diagnostics reports from all
// three platforms are directly comparable.
//
// Phase 3A: contracts + simulation foundations (implemented here).
// Phase 3B: guided recovery suggestions.
// Phase 3C: safe manual repair execution — will extend AuditEntry.appliedResult.
// Phase 3D: rollback + audit replay — will execute RollbackManifest.
//
// SAFETY: No repair logic lives in this file. It is pure type declarations.

// ─── Recovery candidates ──────────────────────────────────────────────────────

/**
 * All known recovery candidate types, mirrored from Android contract.
 * Add new types here first, then update Android + iOS.
 */
export type RecoveryCandidateType =
  | 'ATTACHMENT_CAN_REPARENT_TO_JOB'       // orphan attachment has matching job via lead_id chain
  | 'LEAD_EXISTS_LOCAL_ONLY'                // lead present locally, missing remotely (N/A on web)
  | 'JOB_BLOCKED_BY_MISSING_LEAD'          // job references a lead not found in this workspace
  | 'LEGACY_WORKSPACE_ID_MISSING'          // tool_attachment row has business_id but workspace_id NULL
  | 'DUPLICATE_REMOTE_ENTITY'              // two remote entities with same content + workspace
  | 'LOCAL_REMOTE_MISMATCH'               // local entity state diverges from remote (N/A on web)
  | 'PARENT_EXISTS_LOCAL_NOT_REMOTE'       // parent found locally, absent remotely (N/A on web)
  | 'REMOTE_ENTITY_MISSING_LOCALLY'        // remote entity not reflected in local store (N/A on web)
  | 'STALE_PENDING_ENTITY'                 // entity unsynced > threshold (N/A on web)
  | 'ORPHAN_ATTACHMENT_RECOVERABLE';       // orphan with no clean recovery path yet detected

export type RecoverySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown';

export type RecoverabilityClass =
  | 'recoverable'           // can be fixed with known safe steps
  | 'needs_manual_review'   // potential fix exists but human must verify
  | 'migration_required'    // DBA-led migration needed (e.g. backfill workspace_id)
  | 'transient'             // likely resolves itself on next sync
  | 'unrecoverable';        // data is effectively lost; document only

/**
 * A single recovery candidate. autoRepairAllowed is a literal false type —
 * TypeScript will reject any attempt to set it to true, preventing accidental
 * automation from creeping in.
 */
export type RecoveryCandidate = {
  candidateId: string;
  type: RecoveryCandidateType;
  severity: RecoverySeverity;
  workspaceId: string;
  entityType: string;                  // 'tool_attachment' | 'lead' | 'job' | ...
  entityId: string;
  createdAt: string;                   // ISO — when the entity itself was created
  detectedAt: string;                  // ISO — when this candidate was generated
  likelyCause: string;                 // human-readable plain English
  suggestedAction: string;             // safe suggested operator step
  confidenceLevel: ConfidenceLevel;
  dependencies: string[];              // entity IDs this entity depends on
  blockingEntities: string[];          // entity IDs that block resolution
  recoveryPreview: string;             // one-sentence description of what repair would do
  requiresManualReview: boolean;
  reversible: boolean;                 // can the repair be undone?
  destructiveRisk: boolean;            // would repair permanently alter data?
  autoRepairAllowed: false;            // NEVER true — no automated mutations
  recoverabilityClass: RecoverabilityClass;
  targetEntityId: string | null;       // job/lead to reparent to
  targetEntityType: string | null;     // 'JOB' | 'LEAD' | null
};

export type RecoveryCandidateList = {
  generated_at: string;
  workspace_id: string;
  total_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  candidates: RecoveryCandidate[];
  notes: string[];
};

// ─── Integrity verification passes ───────────────────────────────────────────

export type IntegrityPassStatus = 'pass' | 'warn' | 'fail' | 'skipped';

export type IntegrityPassFinding = {
  findingId: string;
  entityType: string;
  entityId: string;
  description: string;
  severity: RecoverySeverity;
  recoverabilityClass: RecoverabilityClass;
  suggestedRepair: string;
};

export type IntegrityPassResult = {
  passName: string;                           // matches Android contract
  description: string;
  status: IntegrityPassStatus;
  findings: IntegrityPassFinding[];
  affectedEntityCount: number;
  highestSeverity: RecoverySeverity | null;  // null = no findings
  runAt: string;                              // ISO timestamp
  durationMs: number;
  notes: string[];
};

// ─── Reconciliation ───────────────────────────────────────────────────────────

export type MismatchType =
  | 'LOCAL_ONLY'                    // entity exists locally, absent remotely
  | 'REMOTE_ONLY'                   // entity exists remotely, absent locally
  | 'TIMESTAMP_CONFLICT'            // local and remote diverge on timestamps
  | 'PARENT_MISSING_REMOTELY'       // parent_id set but parent not found in workspace
  | 'PARENT_DELETED'                // parent definitively gone (not just pending)
  | 'WORKSPACE_SCOPE_ERROR'         // entity has wrong/missing workspace_id
  | 'DUPLICATE_IDS'                 // multiple entities share a logical identity
  | 'ORPHAN_NO_PARENT'              // parent_id/parent_type both NULL
  | 'LEAD_CONVERTED_PARENT_STALE';  // attachment points to lead that became a job

export type ReconciliationResult = {
  entityId: string;
  entityType: string;
  mismatchType: MismatchType;
  description: string;
  confidenceScore: number;    // 0–100 heuristic
  recoverabilityClass: RecoverabilityClass;
  suggestedRepairPath: string;
  isTransient: boolean;
  isRetryable: boolean;
};

// ─── Simulation ───────────────────────────────────────────────────────────────

export type SimulationStep = {
  stepNumber: number;
  action: string;                  // short imperative description
  targetEntityId: string;
  targetEntityType: string;
  fieldChanges: Array<{
    field: string;
    from: string | null;
    to: string | null;
  }>;
  risk: string;
  reversible: boolean;
};

/**
 * The output of a repair simulation.
 * autoRepairAllowed: false — this can NEVER change until Phase 3C is explicitly
 * wired with full audit trail, confirmation gate, and rollback manifest.
 */
export type SimulationResult = {
  candidateId: string;
  candidateType: RecoveryCandidateType;
  simulatedAt: string;
  feasible: boolean;
  blockers: string[];
  warnings: string[];
  steps: SimulationStep[];
  affectedEntityIds: string[];
  rollbackPossible: boolean;
  rollbackNotes: string;
  estimatedSyncImpact: string;
  requiresManualConfirmation: boolean;
  autoRepairAllowed: false;       // literal false — never automated
  summary: string;                // paste-ready text for incident reports
};

// ─── Audit trail (Phase 3C architecture — contracts only, no execution yet) ───

/**
 * AuditEntry will capture the full lifecycle of a repair action.
 * appliedResult MUST remain null until Phase 3C is wired with:
 *   - explicit user confirmation gate
 *   - RollbackManifest generation
 *   - workspace-scoped write path
 *   - full audit logging
 *
 * Phase 3A/3B: only simulatedResult is populated.
 */
export type AuditEntry = {
  actionId: string;
  initiatedBy: string;                         // user_id — NOT email; no PII stored
  workspaceId: string;
  candidateId: string;
  entityIds: string[];
  beforeSnapshot: Record<string, unknown>;     // serialised entity state pre-repair
  afterSnapshot: Record<string, unknown> | null;
  simulatedResult: SimulationResult;
  appliedResult: unknown | null;               // null until Phase 3C
  rollbackReference: string | null;            // RollbackManifest.manifestId
  createdAt: string;
  appliedAt: string | null;
  success: boolean | null;
  validationChecks: Array<{
    check: string;
    passed: boolean;
    message: string;
  }>;
};

// ─── Rollback manifest (Phase 3D architecture — contracts only) ───────────────

/**
 * RollbackManifest stores everything needed to reverse a committed repair.
 * expiresAt defines the rollback window (recommended: 30 min for field patches).
 *
 * Phase 3D will implement rollback execution by reading entitySnapshots and
 * parentRestoreMap. This type is CONTRACTS ONLY in Phase 3A.
 */
export type RollbackManifest = {
  manifestId: string;
  auditEntryId: string;
  workspaceId: string;
  entitySnapshots: Array<{
    entityId: string;
    entityType: string;
    fieldsBefore: Record<string, unknown>;
    fieldsAfter: Record<string, unknown>;
  }>;
  parentRestoreMap: Array<{
    entityId: string;
    parentIdBefore: string | null;
    parentTypeBefore: string | null;
    parentIdAfter: string | null;
    parentTypeAfter: string | null;
  }>;
  createdAt: string;
  expiresAt: string;
};
