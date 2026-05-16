// src/app/api/admin/engineering/stripe/ops/route.ts v1.1
//
// PURPOSE:
// - Engineer-only list of Stripe ops attempts (from stripe_ops_log).
//
// ENDPOINT:
// - GET /api/admin/engineering/stripe/ops?kind=checkout&success=false&limit=50
//   kind: optional
//   success: optional (true/false)
//   workspace_id: optional
//   user_id: optional
//   before: optional ISO timestamp (cursor) - returns items with created_at < before
//
// RETURNS:
// - { items: [...] }
//
// CHANGES (v1.1):
// - LIVE: Add cursor pagination via `before=<iso>` for scalable browsing.
// - LIVE: Include `meta` jsonb in select (safe, non-secret context).
// - KEEP: Proof-based engineer gate + fail-closed behaviour.

import { NextRequest } from 'next/server';
import { requireEngineer, json, clampInt } from '../_utils';

export const dynamic = 'force-dynamic';

function parseBefore(v: string | null): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  // Supabase/Postgres accepts ISO strings fine.
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  const gate = await requireEngineer(req);
  if (!gate.ok) return gate.res;

  try {
    const { searchParams } = new URL(req.url);

    const limit = clampInt(String(searchParams.get('limit') || ''), 1, 200, 50);

    const kind = String(searchParams.get('kind') || '').trim();
    const successRaw = searchParams.get('success'); // null | 'true' | 'false'
    const workspaceId = String(searchParams.get('workspace_id') || '').trim();
    const userId = String(searchParams.get('user_id') || '').trim();
    const before = parseBefore(searchParams.get('before'));

    let q = gate.supabase
      .from('stripe_ops_log')
      .select(
        [
          'id',
          'created_at',
          'kind',
          'route',
          'workspace_id',
          'user_id',
          'stripe_request_id',
          'stripe_customer_id',
          'stripe_subscription_id',
          'stripe_payment_intent_id',
          'success',
          'error_code',
          'error_message',
          'meta',
        ].join(',')
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (kind) q = q.eq('kind', kind);
    if (successRaw === 'true') q = q.eq('success', true);
    if (successRaw === 'false') q = q.eq('success', false);
    if (workspaceId) q = q.eq('workspace_id', workspaceId);
    if (userId) q = q.eq('user_id', userId);
    if (before) q = q.lt('created_at', before);

    const res = await q;

    if (res.error) return json(500, { error: 'QUERY_FAILED', details: res.error.message });

    return json(200, { items: res.data || [] });
  } catch (e: any) {
    return json(500, { error: 'INTERNAL_ERROR', details: String(e?.message ?? e) });
  }
}