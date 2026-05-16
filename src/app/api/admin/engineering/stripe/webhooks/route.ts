// src/app/api/admin/engineering/stripe/webhooks/route.ts v1.0
//
// PURPOSE:
// - Engineer-only list of recent Stripe webhooks from stripe_webhook_log.
// - Proof-based gate, fail-closed.
//
// ENDPOINT:
// - GET /api/admin/engineering/stripe/webhooks?limit=50
//
// RETURNS:
// - { items: [...] }

import { NextRequest } from 'next/server';
import { requireEngineer, json, clampInt } from '../_utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const gate = await requireEngineer(req);
  if (!gate.ok) return gate.res;

  try {
    const { searchParams } = new URL(req.url);
    const limit = clampInt(String(searchParams.get('limit') || ''), 1, 200, 50);

    const res = await gate.supabase
      .from('stripe_webhook_log')
      .select(
        'id,received_at,stripe_event_id,event_type,livemode,api_version,stripe_created,stripe_request_id,idempotency_key,signature_valid,http_status,processed,processed_at,error_message'
      )
      .order('received_at', { ascending: false })
      .limit(limit);

    if (res.error) return json(500, { error: 'QUERY_FAILED', details: res.error.message });

    return json(200, { items: res.data || [] });
  } catch (e: any) {
    return json(500, { error: 'INTERNAL_ERROR', details: String(e?.message ?? e) });
  }
}