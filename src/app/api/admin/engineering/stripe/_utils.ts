// src/app/api/admin/engineering/stripe/_utils.ts v1.1
//
// PURPOSE:
// - Shared helpers for Engineering Stripe Backbone APIs.
// - Proof-based token validation + engineer gate.
// - Fail closed.
//
// CHANGES (v1.1):
// - HARDEN: Add request-id extraction + passthrough on all JSON responses (helps correlate UI + server logs).
// - HARDEN: Add UUID validator helper (used by endpoints to fail-closed early).
// - HARDEN: Standardise error payload shape (include request_id when present).
// - KEEP: Proof-based token validation via supabase.auth.getUser(token) + staff role gate unchanged.

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ENGINEERING_ROLES = new Set(['superadmin', 'engineer']);

export function getRequestId(req: NextRequest) {
  return (
    req.headers.get('x-request-id') ||
    req.headers.get('x-vercel-id') ||
    req.headers.get('cf-ray') ||
    req.headers.get('x-amzn-trace-id') ||
    null
  );
}

export function json(status: number, body: any, reqId?: string | null) {
  const requestId = reqId ?? null;

  const payload =
    requestId && body && typeof body === 'object' && !Array.isArray(body)
      ? { ...body, request_id: requestId }
      : body;

  const headers: Record<string, string> = {};
  if (requestId) headers['x-request-id'] = requestId;

  return NextResponse.json(payload, { status, headers });
}

export function extractBearerToken(req: NextRequest): string | null {
  const h = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

export function clampInt(v: string, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v || '').trim());
}

export async function requireEngineer(req: NextRequest) {
  const reqId = getRequestId(req);

  const token = extractBearerToken(req);
  if (!token) return { ok: false as const, res: json(401, { error: 'UNAUTHENTICATED' }, reqId) };

  const supabase = createServerSupabaseClient();

  // 1) Validate caller identity from token (proof-based)
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) return { ok: false as const, res: json(401, { error: 'UNAUTHENTICATED' }, reqId) };

  // 2) Staff gate (proof-based)
  const staff = await supabase.from('tissca_staff').select('is_active, role').eq('user_id', userData.user.id).maybeSingle();

  if (staff.error) {
    return {
      ok: false as const,
      res: json(500, { error: 'STAFF_LOOKUP_FAILED', details: staff.error.message }, reqId),
    };
  }

  if (!staff.data?.is_active) return { ok: false as const, res: json(403, { error: 'NOT_STAFF' }, reqId) };

  // 3) Engineer role gate
  const role = String(staff.data.role || '').toLowerCase().trim();
  if (!ENGINEERING_ROLES.has(role)) return { ok: false as const, res: json(403, { error: 'NOT_ENGINEER' }, reqId) };

  return { ok: true as const, supabase, user: userData.user, token, reqId };
}