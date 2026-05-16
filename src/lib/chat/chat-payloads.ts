// src/lib/chat/chat-payloads.ts
//
// TissChat structured payload models.
// Android-compatible keys for LEAD / JOB. Backward compat with legacy Website keys.
// Supports IMAGE, DOCUMENT, LEAD, JOB, CLIENT_PROFILE, INVOICE*, QUOTE*, ASSET* (*render-only).

// ─── IMAGE ──────────────────────────────────────────────────────────────────

export interface ChatImagePayload {
  type: 'image';
  // Contract-aligned camelCase keys (new sends use these)
  url?: string;               // proxy URL for retrieval
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  relayBucket?: string;       // "tisschat-relay"
  relayPath?: string;         // storage path inside bucket
  expiresAt?: string | null;  // ISO timestamp — server-side TTL hint
  isEncrypted?: boolean;      // true if blob was encrypted before upload
  // Legacy snake_case keys (old Website payloads — backward compat)
  file_url?: string;
  original_name?: string;
  size_bytes?: number;
  mime_type?: string;
  bucket?: string;            // old "chat-files"
  // Legacy storage path keys (older payloads)
  storageBucket?: string;
  storagePath?: string;
  // Legacy Base64 fallback
  data?: string;              // data URI or base64 string
  // Optional dimensions
  width?: number;
  height?: number;
}

// ─── DOCUMENT ───────────────────────────────────────────────────────────────

export interface ChatDocumentPayload {
  type: 'document';
  // Contract-aligned camelCase keys
  url?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  relayBucket?: string;
  relayPath?: string;
  expiresAt?: string | null;
  isEncrypted?: boolean;
  // Legacy snake_case keys
  file_url?: string;
  original_name?: string;
  size_bytes?: number;
  mime_type?: string;
  bucket?: string;
  // Legacy storage path keys
  storageBucket?: string;
  storagePath?: string;
  // Legacy Base64 fallback
  data?: string;
}

// ─── Media payload normaliser ───────────────────────────────────────────────
// Resolves canonical values from whichever key set is present (contract or legacy).

export function resolveMediaUrl(
  p: ChatImagePayload | ChatDocumentPayload,
  signedUrlResolver?: (bucket: string, path: string) => string | null,
): string | null {
  // 0. Try batch-pre-signed URL from cache (eliminates proxy roundtrip)
  if (signedUrlResolver) {
    const bucket = p.relayBucket ?? p.storageBucket ?? p.bucket;
    const path = p.relayPath ?? p.storagePath;
    if (bucket && path) {
      const signed = signedUrlResolver(bucket, path);
      if (signed) return signed;
    }
  }
  // 1. Contract key
  if (p.url) return p.url;
  // 2. Legacy Website key
  if (p.file_url) return p.file_url;
  // 3. Legacy storageBucket + storagePath → construct proxy URL
  if (p.storageBucket && p.storagePath) return `/api/storage/${p.storageBucket}/${p.storagePath}`;
  // 4. Legacy Base64 data
  if (p.data) {
    if (p.data.startsWith('data:')) return p.data;
    const mt = p.mimeType ?? p.mime_type ?? 'application/octet-stream';
    return `data:${mt};base64,${p.data}`;
  }
  return null;
}

export function resolveMediaName(p: ChatImagePayload | ChatDocumentPayload): string {
  return p.fileName ?? p.original_name ?? 'file';
}

export function resolveMediaSize(p: ChatImagePayload | ChatDocumentPayload): number {
  return p.sizeBytes ?? p.size_bytes ?? 0;
}

export function resolveMediaMime(p: ChatImagePayload | ChatDocumentPayload): string {
  return p.mimeType ?? p.mime_type ?? 'application/octet-stream';
}

// ─── LEAD (Android-compatible + backward compat) ────────────────────────────

export interface ChatLeadPayload {
  type: 'lead';
  // Android-compatible canonical keys (new payloads use these)
  id?: string;
  clientName?: string;
  status?: string;
  value?: number;                    // 0 when includeValues="false"
  includeValues?: string;            // "true" | "false" (string, matches Android)
  sourceToolKey?: string | null;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  postcode?: string | null;
  notes?: string | null;
  shareable?: boolean;
  // Legacy Website keys (backward compat for parsing old stored messages)
  lead_id?: string;
  lead_name?: string;
  lead_status?: string;
  value_estimate?: number | null;
  source?: string | null;
  // Common
  preview: string;
}

// ─── JOB (Android-compatible + backward compat) ─────────────────────────────

export interface ChatJobPayload {
  type: 'job';
  // Android-compatible canonical keys
  id?: string;
  clientName?: string;
  status?: string;
  value?: number;                    // 0 when includeValues="false"
  includeValues?: string;            // "true" | "false"
  sourceToolKey?: string | null;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  postcode?: string | null;
  notes?: string | null;
  shareable?: boolean;
  // Legacy Website keys (backward compat)
  job_id?: string;
  job_title?: string;
  job_status?: string;
  scheduled_date?: string | null;
  // Common
  preview: string;
}

// ─── CLIENT PROFILE (lightweight contact card — no financial data) ──────────

export interface ChatClientProfilePayload {
  type: 'client_profile';
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  preview: string;
}

// ─── Union ──────────────────────────────────────────────────────────────────

export type StructuredPayload =
  | ChatImagePayload
  | ChatDocumentPayload
  | ChatLeadPayload
  | ChatJobPayload
  | ChatClientProfilePayload
  | ChatInvoicePayload
  | ChatQuotePayload
  | ChatAssetPayload
  | ChatCardPayload;

// ─── INVOICE ────────────────────────────────────────────────────────────────

export interface ChatInvoicePayload {
  type: 'invoice';
  invoice_id: string;
  invoice_number: string;
  client_name: string | null;
  status: string;
  total: number | null;
  due_date: string | null;
  preview: string;
}

// ─── QUOTE ──────────────────────────────────────────────────────────────────

export interface ChatQuotePayload {
  type: 'quote';
  quote_id: string;
  quote_title: string;
  client_name: string | null;
  status: string;
  total: number | null;
  valid_until: string | null;
  preview: string;
}

// ─── ASSET ──────────────────────────────────────────────────────────────────

export interface ChatAssetPayload {
  type: 'asset';
  asset_id: string;
  asset_name: string;
  asset_type: string | null;
  status: string | null;
  serial_number: string | null;
  preview: string;
}

// ─── CARD ───────────────────────────────────────────────────────────────────

export interface ChatCardPayload {
  type: 'card';
  card_title: string;
  card_description: string | null;
  card_url: string | null;
  preview: string;
}

// ─── Safe Parsers ───────────────────────────────────────────────────────────

/** Safely parse a JSON payload string. Returns null on failure. */
export function parsePayload(raw: string | null): StructuredPayload | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (typeof obj !== 'object' || obj === null || typeof obj.type !== 'string') return null;
    return obj as StructuredPayload;
  } catch {
    return null;
  }
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export function isImagePayload(p: StructuredPayload | null): p is ChatImagePayload {
  if (p === null || p.type !== 'image') return false;
  const a = p as any;
  return typeof a.url === 'string' || typeof a.file_url === 'string'
    || (typeof a.storageBucket === 'string' && typeof a.storagePath === 'string')
    || typeof a.data === 'string';
}

export function isDocumentPayload(p: StructuredPayload | null): p is ChatDocumentPayload {
  if (p === null || p.type !== 'document') return false;
  const a = p as any;
  return typeof a.url === 'string' || typeof a.file_url === 'string'
    || (typeof a.storageBucket === 'string' && typeof a.storagePath === 'string')
    || typeof a.data === 'string';
}

export function isLeadPayload(p: StructuredPayload | null): p is ChatLeadPayload {
  return p !== null && p.type === 'lead' &&
    (typeof (p as any).id === 'string' || typeof (p as any).lead_id === 'string');
}

export function isJobPayload(p: StructuredPayload | null): p is ChatJobPayload {
  return p !== null && p.type === 'job' &&
    (typeof (p as any).id === 'string' || typeof (p as any).job_id === 'string');
}

export function isClientProfilePayload(p: StructuredPayload | null): p is ChatClientProfilePayload {
  return p !== null && p.type === 'client_profile' && typeof (p as any).name === 'string';
}

export function isInvoicePayload(p: StructuredPayload | null): p is ChatInvoicePayload {
  return p !== null && p.type === 'invoice' && typeof p.invoice_id === 'string';
}

export function isQuotePayload(p: StructuredPayload | null): p is ChatQuotePayload {
  return p !== null && p.type === 'quote' && typeof p.quote_id === 'string';
}

export function isAssetPayload(p: StructuredPayload | null): p is ChatAssetPayload {
  return p !== null && p.type === 'asset' && typeof p.asset_id === 'string';
}

export function isCardPayload(p: StructuredPayload | null): p is ChatCardPayload {
  return p !== null && p.type === 'card' && typeof p.card_title === 'string';
}

// ─── Serializers ────────────────────────────────────────────────────────────

export function serializePayload(payload: StructuredPayload): string {
  return JSON.stringify(payload);
}

// ─── Normalizers (extract canonical values from Android OR legacy Website keys) ─

export function normLeadPayload(p: ChatLeadPayload) {
  return {
    entityId: p.id ?? p.lead_id ?? '',
    name: p.clientName ?? p.lead_name ?? '',
    status: p.status ?? p.lead_status ?? '',
    value: p.value ?? p.value_estimate ?? null,
    includeValues: p.includeValues !== 'false',
    source: p.sourceToolKey ?? p.source ?? null,
    phone: p.phone ?? null,
    email: p.email ?? null,
    addressLine1: p.addressLine1 ?? null,
    city: p.city ?? null,
    postcode: p.postcode ?? null,
    notes: p.notes ?? null,
  };
}

export function normJobPayload(p: ChatJobPayload) {
  return {
    entityId: p.id ?? p.job_id ?? '',
    name: p.clientName ?? p.job_title ?? '',
    status: p.status ?? p.job_status ?? '',
    value: p.value ?? null,
    includeValues: p.includeValues !== 'false',
    source: p.sourceToolKey ?? null,
    phone: p.phone ?? null,
    email: p.email ?? null,
    addressLine1: p.addressLine1 ?? null,
    city: p.city ?? null,
    postcode: p.postcode ?? null,
    notes: p.notes ?? null,
    scheduledDate: p.scheduled_date ?? null,
  };
}

// ─── Preview Text Generators ────────────────────────────────────────────────
// Format aligned with Android: emoji · Type · Name · £Value · Location

export function imagePreviewText(name: string): string {
  return `📷 ${name}`;
}

export function documentPreviewText(name: string): string {
  return `📎 ${name}`;
}

export function leadPreviewText(name: string, value: number | null, location?: string | null): string {
  let s = `👤 Lead · ${name}`;
  if (value != null && value > 0) s += ` · ${formatCurrency(value)}`;
  if (location) s += ` · ${location}`;
  return s;
}

export function jobPreviewText(title: string, value: number | null, location?: string | null): string {
  let s = `🔧 Job · ${title}`;
  if (value != null && value > 0) s += ` · ${formatCurrency(value)}`;
  if (location) s += ` · ${location}`;
  return s;
}

export function clientProfilePreviewText(name: string): string {
  return `👤 Contact · ${name}`;
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(v);
}

// ─── File Size Formatter ────────────────────────────────────────────────────

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
