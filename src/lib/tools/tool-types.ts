// src/lib/tools/tool-types.ts
//
// Shared data architecture for the Tool → Lead → Job lifecycle.
//
// DESIGN PRINCIPLES:

import { formatCurrency as _fmtCurrency } from '@/lib/currency';
// - Every tool produces a typed, structured ToolPayload (source of truth).
// - A preview/summary string is derived from the payload, never the reverse.
// - tool_key is a stable identifier used for routing, reopening, and filtering.
// - The same ToolAttachment model works for Lead Detail and Job Detail.
// - Future tools (Flooring, Plumbing, Bathroom, etc.) add new payload variants.
//
// DATABASE ALIGNMENT:
// Maps 1:1 to Supabase `tool_attachments` table.
// The typed payload is stored as jsonb in `result_data`.
// Additional semantic fields (tool_key, preview_text, total_value) are stored
// inside result_data alongside the payload for backward compatibility
// (no schema migration required).

// ─── Tool Keys ───────────────────────────────────────────────────────────────

/**
 * Stable identifier for each tool.
 * Used for: routing, reopening in edit mode, filtering, analytics.
 * New tools extend this union type.
 */
// Android-parity tool keys — MUST match Android exact strings
export type ToolKey =
  | 'general_estimate'
  | 'kitchen'
  | 'kitchen_materials'
  | 'bathroom_quick_fittings'
  | 'bathroom_renovation'
  | 'bedroom_wardrobes'
  | 'bedroom_sliding_wardrobes'
  | 'flooring'
  | 'paint'
  | 'carpentry'
  | 'electrical'
  | 'plumbing'
  | 'roofing'
  | 'hvac'
  | 'tiling'
  | 'windows'
  | 'landscaping'
  | 'cleaning'
  // NOT parity-safe for reopen/edit yet (Android doesn't fully wire these):
  // | 'bedroom_bedside_units'
  // | 'bedroom_chest_of_drawers'
  // | 'bedroom_wall_panelling'
  // | 'bedroom_headboards'
  // | 'bedroom_shelving'
  // | 'bedroom_other_joinery'
  // | 'multitools'
  // DISCONTINUED — do not add:
  // | 'rides'
  ;

/** Map tool key → human-readable title. Matches Android toolTitle. */
export const TOOL_TITLES: Record<ToolKey, string> = {
  general_estimate: 'General Estimate',
  kitchen: 'Kitchen Fitting',
  kitchen_materials: 'Kitchen Materials',
  bathroom_quick_fittings: 'Bathroom Quick Fittings',
  bathroom_renovation: 'Bathroom Renovation',
  bedroom_wardrobes: 'Wardrobes',
  bedroom_sliding_wardrobes: 'Sliding Wardrobes',
  flooring: 'Flooring',
  paint: 'Paint & Decor',
  carpentry: 'Carpentry',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  roofing: 'Roofing',
  hvac: 'HVAC',
  tiling: 'Tiling',
  windows: 'Windows & Doors',
  landscaping: 'Landscaping',
  cleaning: 'Cleaning',
};

/** Map tool key → app route for reopening / navigating. */
export const TOOL_ROUTES: Record<ToolKey, string> = {
  general_estimate: '/app/tools/general',
  kitchen: '/app/tools/kitchen',
  kitchen_materials: '/app/tools/kitchen-materials',
  bathroom_quick_fittings: '/app/tools/bathroom-quick-fittings',
  bathroom_renovation: '/app/tools/bathroom-renovation',
  bedroom_wardrobes: '/app/tools/bedroom-wardrobes',
  bedroom_sliding_wardrobes: '/app/tools/bedroom-sliding-wardrobes',
  flooring: '/app/tools/flooring',
  paint: '/app/tools/paint',
  carpentry: '/app/tools/carpentry',
  electrical: '/app/tools/electrical',
  plumbing: '/app/tools/plumbing',
  roofing: '/app/tools/roofing',
  hvac: '/app/tools/hvac',
  tiling: '/app/tools/tiling',
  windows: '/app/tools/windows',
  landscaping: '/app/tools/landscaping',
  cleaning: '/app/tools/cleaning',
};

/** Map tool key → emoji icon for card display. */
export const TOOL_ICONS: Record<ToolKey, string> = {
  general_estimate: '📝',
  kitchen: '🍳',
  kitchen_materials: '🪵',
  bathroom_quick_fittings: '🚿',
  bathroom_renovation: '🛁',
  bedroom_wardrobes: '🚪',
  bedroom_sliding_wardrobes: '🚪',
  flooring: '🪵',
  paint: '🎨',
  carpentry: '🪚',
  electrical: '⚡',
  plumbing: '🔩',
  roofing: '🏠',
  hvac: '❄️',
  tiling: '🔲',
  windows: '🪟',
  landscaping: '🌿',
  cleaning: '🧹',
};

// ─── Cost Bucket Classification ──────────────────────────────────────────────

/**
 * Every structured line item carries a cost bucket for Accountant Hub classification.
 * - Auto-detection is allowed but must always be overridable by the user.
 * - 'unknown' is the safe default when classification is ambiguous.
 */
export type CostBucket =
  | 'labour'
  | 'materials'
  | 'subcontractor'
  | 'plant_hire'
  | 'other_direct_cost'
  | 'overhead'
  | 'unknown';

export const COST_BUCKET_LABELS: Record<CostBucket, string> = {
  labour: 'Labour',
  materials: 'Materials',
  subcontractor: 'Subcontractor',
  plant_hire: 'Plant / Hire',
  other_direct_cost: 'Other Direct Cost',
  overhead: 'Overhead',
  unknown: 'Unclassified',
};

/**
 * Best-effort auto-detection from item description. Always overridable.
 *
 * ACCOUNTING MODEL (construction):
 * - Labour → profit margin (NOT a cost deduction)
 * - Materials/subcontractor/plant_hire → cost of sales
 * - Overhead → operating expenses
 * - Default → other_direct_cost (conservative: treated as cost of sales)
 */
export function detectCostBucket(description: string): CostBucket {
  const d = description.toLowerCase();
  // Labour: work / service / installation / trade roles
  if (/\b(labour|labor|labourer|work(s|manship)?|hours|install(ation)?|fit(ting)?|fix(ing)?|service|joiner|plumber|electrician|decorator|painter|plasterer)\b/.test(d)) return 'labour';
  // Materials: physical goods / building supplies
  if (/\b(material|tile[s]?|wood|timber|mdf|paint|primer|cement|plaster|plasterboard|board|panel|pipe|cable|copper|adhesive|screw|hinge|handle|silicone|grout|brick|block|sand|aggregate|insulation)\b/.test(d)) return 'materials';
  // Plant / hire: equipment rental
  if (/\b(hire|rental|machine|equipment|scaffold|skip|plant|cherry\s*picker)\b/.test(d)) return 'plant_hire';
  // Subcontractor: external labour
  if (/\b(sub\s*contract(or)?|subbie|external|outsourced)\b/.test(d)) return 'subcontractor';
  // Overhead: business running costs
  if (/\b(insurance|software|subscription|fuel|transport|fee|accountant|phone|bank|advertising|office|admin)\b/.test(d)) return 'overhead';
  // Default: treat as direct cost (conservative — counted in cost of sales)
  return 'other_direct_cost';
}

// ─── Line Item (shared across multiple tools) ────────────────────────────────

export interface ToolLineItem {
  /** 1-based index for display. */
  index: number;
  /** Human-readable description. */
  description: string;
  /** Quantity of this item (default 1). */
  quantity: number;
  /** Unit price per single item. */
  unit_price: number;
  /** Line total = quantity × unit_price. Stored for convenience / verification. */
  amount: number;
  /** Cost classification for Accountant Hub breakdowns. */
  cost_bucket: CostBucket;
}

// ─── General Estimate Payload ────────────────────────────────────────────────

export interface GeneralEstimatePayload {
  tool_key: 'general_estimate';

  /** Optional project/client name. */
  project_name: string | null;

  /** Itemised line items. */
  line_items: ToolLineItem[];

  /** Financial calculations. */
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  after_discount: number;
  vat_percent: number;
  vat_amount: number;
  total: number;
  /**
   * Configured deposit amount (NOT a confirmed payment).
   * Legacy name: deposit_paid. Semantically this is deposit_requested.
   * Kept as deposit_paid for backward compatibility with stored payloads.
   */
  deposit_paid: number;
  balance_due: number;

  /** Free-text notes. */
  notes: string | null;

  /** ISO timestamp of generation. */
  generated_at: string;
}

// ─── Discriminated Payload Union ─────────────────────────────────────────────

/**
 * All tool payloads discriminated by `tool_key`.
 * GeneralEstimatePayload = quick-quote / general
 * TradeToolPayload = all Android-parity section-based trade tools
 */
export type ToolPayload = GeneralEstimatePayload | TradeToolPayload;

// ─── Android-Parity Trade Tool Payload ───────────────────────────────────────

/**
 * Generic section-based payload matching Android trade tool structure.
 * Stores the full structured form state for edit/reopen compatibility.
 *
 * ANDROID CONTRACT:
 * - toolKey → tool_key
 * - toolTitle → tool_title
 * - valuesText → values_text (summary for display / PDF)
 * - total → total
 * - userNotes → user_notes (free-text notes from notes UI)
 * - rawPayload → raw_payload (structured editable form state)
 */
export interface TradeToolPayload {
  tool_key: Exclude<ToolKey, 'general_estimate'>;
  tool_title: string;

  /** Structured sections with rows. Source of truth for form state. */
  sections: TradeToolSection[];

  /** Financial calculations. */
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  after_discount: number;
  vat_percent: number;
  vat_amount: number;
  total: number;
  deposit_amount: number;
  balance_due: number;

  /** Free-text notes — stored in userNotes, NOT in rawPayload. */
  notes: string | null;

  /** ISO timestamp of generation. */
  generated_at: string;
}

/** A section within a trade tool (maps to Android visible section). */
export interface TradeToolSection {
  key: string;
  title: string;
  rows: TradeToolRow[];
}

/** A row within a trade tool section (materials/items/labour). */
export interface TradeToolRow {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
  cost_bucket: CostBucket;
}

// ─── Android ToolAttachment Contract ─────────────────────────────────────────

/**
 * Android-compatible ToolAttachment.
 * Maps to Supabase tool_attachments table columns.
 *
 * CRITICAL: This is the canonical cross-platform attachment shape.
 * toolKey must match Android exact strings.
 * toolTitle must always be explicitly populated.
 * userNotes stores notes (NOT in rawPayload).
 * rawPayload stores structured editable form state.
 * valuesText stores summary text.
 */
export interface AndroidToolAttachment {
  id: string;
  parentId: string;
  parentType: 'LEAD' | 'JOB';
  toolKey: string;
  toolTitle: string;
  valuesText: string;
  total: number;
  userNotes?: string | null;
  rawPayload?: string | null;
  createdAtMillis: number;
  updatedAtMillis: number;
}

/**
 * Build an Android-compatible values_text summary from a TradeToolPayload.
 * Pattern:
 *   TISSCA – TOOL NAME
 *   Item x1 @ £X.XX = £X.XX
 *   ...
 *   Subtotal: £X.XX
 *   Discount: ...
 *   VAT: ...
 *   Total: £X.XX
 *   Deposit: ...
 *   Balance due: ...
 */
export function buildValuesText(payload: TradeToolPayload): string {
  const lines: string[] = [];
  lines.push(`TISSCA – ${payload.tool_title.toUpperCase()}`);
  lines.push('');

  for (const section of payload.sections) {
    if (section.rows.length === 0) continue;
    lines.push(`${section.title}`);
    for (const row of section.rows) {
      if (row.quantity !== 1) {
        lines.push(`  ${row.description} x${row.quantity} @ ${fmtToolCurrency(row.unit_price)} = ${fmtToolCurrency(row.amount)}`);
      } else {
        lines.push(`  ${row.description} @ ${fmtToolCurrency(row.unit_price)} = ${fmtToolCurrency(row.amount)}`);
      }
    }
    lines.push('');
  }

  lines.push(`Subtotal: ${fmtToolCurrency(payload.subtotal)}`);
  if (payload.discount_percent > 0) {
    lines.push(`Discount (${payload.discount_percent}%): -${fmtToolCurrency(payload.discount_amount)}`);
  }
  if (payload.vat_percent > 0) {
    lines.push(`VAT (${payload.vat_percent}%): ${fmtToolCurrency(payload.vat_amount)}`);
  }
  lines.push(`Total: ${fmtToolCurrency(payload.total)}`);
  if (payload.deposit_amount > 0) {
    lines.push(`Deposit: ${fmtToolCurrency(payload.deposit_amount)}`);
    lines.push(`Balance due: ${fmtToolCurrency(payload.balance_due)}`);
  }

  return lines.join('\n');
}

/**
 * Build rawPayload JSON string from a TradeToolPayload.
 * Includes _toolKey metadata and full structured form state for future restoration.
 */
export function buildRawPayload(payload: TradeToolPayload): string {
  return JSON.stringify({
    _toolKey: payload.tool_key,
    sections: payload.sections,
    subtotal: payload.subtotal,
    discount_percent: payload.discount_percent,
    discount_amount: payload.discount_amount,
    after_discount: payload.after_discount,
    vat_percent: payload.vat_percent,
    vat_amount: payload.vat_amount,
    total: payload.total,
    deposit_amount: payload.deposit_amount,
    balance_due: payload.balance_due,
    generated_at: payload.generated_at,
  });
}

// ─── Tool Attachment (matches Supabase tool_attachments) ─────────────────────

/**
 * Full tool attachment record as stored in Supabase.
 * The `result_data` jsonb column contains:
 *   - The typed ToolPayload
 *   - Semantic metadata fields
 */
export interface ToolAttachment {
  id: string;
  workspace_id: string;
  parent_id: string;
  parent_type: 'LEAD' | 'JOB';
  tool_key: string;
  tool_title: string;
  values_text: string | null;
  total: number | null;
  user_notes: string | null;
  raw_payload: string | null;
  created_at_millis: number;
  updated_at_millis: number | null;
  created_by: string | null;
  labour_total: number | null;
  materials_total: number | null;
  subcontractor_total: number | null;
  plant_hire_total: number | null;
  other_direct_cost_total: number | null;
  overhead_total: number | null;
  unknown_total: number | null;
}

/**
 * The contents of `result_data` jsonb.
 * Contains the full typed payload plus semantic metadata fields.
 */
export interface ToolAttachmentResultData {
  /** Stable tool identifier for routing/filtering. */
  tool_key: ToolKey;
  /** Human-readable summary (derived from payload, not user-edited). */
  preview_text: string;
  /** Total financial value for metrics/filtering. */
  total_value: number;
  /** The full structured payload (source of truth). */
  payload: ToolPayload;
}

// ─── Card Summary (for Lead Detail / Job Detail rendering) ───────────────────

/** Minimal shape needed to render a tool attachment card in a list. */
export interface ToolCardSummary {
  id: string;
  tool_key: ToolKey;
  tool_title: string;
  icon: string;
  preview_text: string;
  total_value: number;
  created_at_millis: number;
  parent_id: string;
  parent_type: 'LEAD' | 'JOB';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Look up a tool's human-readable title from its key. Falls back to key. */
export function toolKeyToTitle(key: ToolKey | string): string {
  return TOOL_TITLES[key as ToolKey] ?? key;
}

/** Look up a tool's app route from its key. Returns null if unknown. */
export function toolKeyToRoute(key: ToolKey | string): string | null {
  return TOOL_ROUTES[key as ToolKey] ?? null;
}

/** Look up a tool's icon from its key. */
export function toolKeyToIcon(key: ToolKey | string): string {
  return TOOL_ICONS[key as ToolKey] ?? '🔧';
}

/** Format a currency value. */
export function fmtToolCurrency(v: number, currencyCode?: string | null): string {
  return _fmtCurrency(v, currencyCode);
}

/**
 * Build a human-readable preview string from a typed tool payload.
 * This is the canonical way to generate summary text.
 * Never parse this text to extract data — use the payload directly.
 */
export function buildPreviewText(payload: ToolPayload): string {
  switch (payload.tool_key) {
    case 'general_estimate':
      return buildGeneralEstimatePreview(payload);
    default:
      // All Android-parity trade tools
      return buildTradeToolPreview(payload as TradeToolPayload);
  }
}

function buildGeneralEstimatePreview(p: GeneralEstimatePayload): string {
  const lines: string[] = [];

  if (p.project_name) {
    lines.push(`Project: ${p.project_name}`);
  }

  const totalQty = p.line_items.reduce((s, li) => s + (li.quantity ?? 1), 0);
  lines.push(`${p.line_items.length} item${p.line_items.length !== 1 ? 's' : ''} (${totalQty} units)`);

  if (p.discount_percent > 0) {
    lines.push(`${p.discount_percent}% discount`);
  }
  if (p.vat_percent > 0) {
    lines.push(`${p.vat_percent}% VAT`);
  }

  lines.push(`Total: ${fmtToolCurrency(p.total)}`);

  if (p.deposit_paid > 0) {
    lines.push(`Balance: ${fmtToolCurrency(p.balance_due)}`);
  }

  return lines.join(' · ');
}

function buildTradeToolPreview(p: TradeToolPayload): string {
  const lines: string[] = [];
  const rowCount = p.sections.reduce((s, sec) => s + sec.rows.length, 0);
  lines.push(`${p.tool_title}`);
  lines.push(`${rowCount} item${rowCount !== 1 ? 's' : ''}`);
  if (p.discount_percent > 0) lines.push(`${p.discount_percent}% discount`);
  if (p.vat_percent > 0) lines.push(`${p.vat_percent}% VAT`);
  lines.push(`Total: ${fmtToolCurrency(p.total)}`);
  if (p.deposit_amount > 0) lines.push(`Balance: ${fmtToolCurrency(p.balance_due)}`);
  return lines.join(' · ');
}

/**
 * Build the full ToolAttachmentResultData ready for storing in result_data jsonb.
 */
export function buildResultData(payload: ToolPayload): ToolAttachmentResultData {
  return {
    tool_key: payload.tool_key,
    preview_text: buildPreviewText(payload),
    total_value: extractTotalValue(payload),
    payload,
  };
}

/** Extract the total financial value from any tool payload. */
function extractTotalValue(payload: ToolPayload): number {
  return payload.total;
}

/**
 * Convert a raw ToolAttachment (from API) into a ToolCardSummary for rendering.
 * Handles both new-format (with tool_key in result_data) and legacy attachments.
 */
export function attachmentToCard(att: ToolAttachment): ToolCardSummary {
  const toolKey = (att.tool_key || 'general_estimate') as ToolKey;
  return {
    id: att.id,
    tool_key: toolKey,
    tool_title: att.tool_title || toolKeyToTitle(toolKey),
    icon: toolKeyToIcon(toolKey),
    preview_text: att.values_text || `Total: ${fmtToolCurrency(att.total || 0)}`,
    total_value: att.total || 0,
    created_at_millis: att.created_at_millis,
    parent_id: att.parent_id,
    parent_type: att.parent_type,
  };
}

// ─── Draft Persistence ───────────────────────────────────────────────────────
//
// SECURITY: Draft keys MUST be scoped per user/workspace to prevent
// cross-account data leakage when multiple accounts share a browser.
// Key format: tissca_tool_draft_{userId}_{toolKey}
// Falls back to global key only when userId is unavailable (anonymous/unauthenticated).

const DRAFT_STORAGE_PREFIX = 'tissca_tool_draft_';

/**
 * Resolve the current authenticated user's ID from the Supabase client session.
 * Returns the user ID string, or null if unauthenticated.
 * This is synchronous/cached — Supabase stores the session in localStorage already.
 */
function getDraftScopeId(): string {
  try {
    // Supabase stores its auth token in localStorage under a known key pattern.
    // We read it directly to avoid async imports in this utility module.
    const sbKey = Object.keys(localStorage).find(
      k => k.startsWith('sb-') && k.endsWith('-auth-token'),
    );
    if (!sbKey) return 'anon';
    const raw = localStorage.getItem(sbKey);
    if (!raw) return 'anon';
    const parsed = JSON.parse(raw);
    // The session object has user.id
    const userId: string | undefined = parsed?.user?.id;
    return userId ?? 'anon';
  } catch {
    return 'anon';
  }
}

/** Save a tool draft to localStorage, scoped to the current authenticated user. */
export function saveDraft<T>(toolKey: ToolKey, draft: T): void {
  try {
    const scopeId = getDraftScopeId();
    const key = `${DRAFT_STORAGE_PREFIX}${scopeId}_${toolKey}`;
    const data = JSON.stringify({ draft, saved_at: Date.now() });
    localStorage.setItem(key, data);
  } catch {
    // localStorage may be unavailable — silently fail
  }
}

/** Load a tool draft from localStorage, scoped to the current authenticated user. */
export function loadDraft<T>(toolKey: ToolKey): T | null {
  try {
    const scopeId = getDraftScopeId();
    const key = `${DRAFT_STORAGE_PREFIX}${scopeId}_${toolKey}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Expire drafts older than 7 days
    if (Date.now() - parsed.saved_at > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.draft as T;
  } catch {
    return null;
  }
}

/** Clear a tool draft from localStorage for the current authenticated user. */
export function clearDraft(toolKey: ToolKey): void {
  try {
    const scopeId = getDraftScopeId();
    localStorage.removeItem(`${DRAFT_STORAGE_PREFIX}${scopeId}_${toolKey}`);
  } catch {
    // silently fail
  }
}

/** Check if a draft exists for a tool for the current authenticated user. */
export function hasDraft(toolKey: ToolKey): boolean {
  try {
    const scopeId = getDraftScopeId();
    return localStorage.getItem(`${DRAFT_STORAGE_PREFIX}${scopeId}_${toolKey}`) !== null;
  } catch {
    return false;
  }
}

/**
 * Clear ALL tool drafts for a specific user from localStorage.
 * Call this on logout to prevent stale drafts leaking to the next user.
 */
export function clearAllDraftsForUser(userId: string): void {
  try {
    const prefix = `${DRAFT_STORAGE_PREFIX}${userId}_`;
    const keysToRemove = Object.keys(localStorage).filter(k => k.startsWith(prefix));
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {
    // silently fail
  }
}

// ─── Backward-Compatible Line Item Normalizer ────────────────────────────────

/**
 * Normalize a line item from any stored version to the current shape.
 * Handles payloads saved before quantity / cost_bucket were added.
 *  - Missing quantity → 1
 *  - Missing unit_price → amount (the old flat-amount field)
 *  - Missing cost_bucket → 'unknown'
 *  - Recalculates amount = quantity × unit_price for consistency
 */
export function normalizeLineItem(raw: Record<string, unknown>): ToolLineItem {
  const qty = typeof raw.quantity === 'number' && raw.quantity > 0 ? raw.quantity : 1;
  const unitPrice = typeof raw.unit_price === 'number' ? raw.unit_price : (typeof raw.amount === 'number' ? raw.amount : 0);
  const bucket = (typeof raw.cost_bucket === 'string' && raw.cost_bucket in COST_BUCKET_LABELS)
    ? raw.cost_bucket as CostBucket : 'unknown';
  return {
    index: typeof raw.index === 'number' ? raw.index : 0,
    description: typeof raw.description === 'string' ? raw.description : '',
    quantity: qty,
    unit_price: unitPrice,
    amount: qty * unitPrice,
    cost_bucket: bucket,
  };
}
