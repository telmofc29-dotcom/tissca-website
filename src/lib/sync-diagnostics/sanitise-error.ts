// src/lib/sync-diagnostics/sanitise-error.ts
//
// PURPOSE:
//   Single source of truth for stringifying unknown errors surfaced in the
//   diagnostics `notes[]` arrays. Supabase / PostgREST errors are plain
//   objects of shape { message, code, hint, details } and are NOT Error
//   instances — so `String(error)` collapses to "[object Object]".
//
//   This helper extracts the structured fields when present, falls back to
//   `Error.message` for thrown errors, and applies the same redaction rules
//   used previously (JWT / Supabase key / email).
//
// SAFETY:
//   - No secrets / tokens / API keys are ever emitted.
//   - Output is hard-capped at 500 chars.
//   - Pure function; no side-effects, no I/O.

const REDACTORS: Array<[RegExp, string]> = [
  [/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED_JWT]'],
  [/sbp_[A-Za-z0-9]+/g, '[REDACTED_SUPABASE_KEY]'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[REDACTED_EMAIL]'],
];

function redact(raw: string): string {
  let out = raw;
  for (const [re, sub] of REDACTORS) out = out.replace(re, sub);
  return out.slice(0, 500);
}

/**
 * Structured stringifier for Supabase PostgREST errors and generic throwables.
 *
 * Recognised PostgREST error shape: { message, code, hint, details }
 *
 * Output examples:
 *   "42703 column \"business_id\" does not exist — hint: perhaps you meant workspace_id"
 *   "PGRST301 relation \"clients\" does not exist"
 *   "Network request failed"
 *   "[unstringifiable error]"
 */
export function sanitiseSupabaseError(e: unknown): string {
  if (e == null) return 'unknown error';

  // Error instance — preserve previous behaviour.
  if (e instanceof Error) return redact(e.message || 'Error');

  // Primitive — preserve previous behaviour.
  if (typeof e !== 'object') return redact(String(e));

  // PostgREST / Supabase error object: { message, code, hint, details }.
  const obj = e as Record<string, unknown>;
  const message = typeof obj.message === 'string' ? obj.message : '';
  const code = typeof obj.code === 'string' ? obj.code : '';
  const hint = typeof obj.hint === 'string' ? obj.hint : '';
  const details = typeof obj.details === 'string' ? obj.details : '';

  const parts: string[] = [];
  if (code) parts.push(code);
  if (message) parts.push(message);
  if (details && details !== message) parts.push(`details: ${details}`);
  if (hint) parts.push(`hint: ${hint}`);

  if (parts.length > 0) return redact(parts.join(' — '));

  // Last-resort: try JSON, fall back to a marker (never "[object Object]").
  try {
    const json = JSON.stringify(obj);
    if (json && json !== '{}') return redact(json);
  } catch {
    /* noop */
  }
  return '[unstringifiable error]';
}
