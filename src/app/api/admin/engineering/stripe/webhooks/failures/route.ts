// src/app/api/admin/engineering/stripe/webhooks/failures/route.ts v1.0
//
// PURPOSE:
// - Engineer-only list of Stripe webhook failures (processed=false OR error_message not null OR http_status>=400).
//
// ENDPOINT:
// - GET /api/admin/engineering/stripe/webhooks/failures?limit=50

import { NextRequest } from 'next/server';
import { requireEngineer, json, clampInt } from '../../_utils';

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
        'id,received_at,stripe_event_id,event_type,livemode,stripe_request_id,signature_valid,http_status,processed,processed_at,error_message'
      )
      .or('processed.eq.false,error_message.not.is.null,http_status.gte.400')
      .order('received_at', { ascending: false })
      .limit(limit);

    if (res.error) return json(500, { error: 'QUERY_FAILED', details: res.error.message });

    return json(200, { items: res.data || [] });
  } catch (e: any) {
    return json(500, { error: 'INTERNAL_ERROR', details: String(e?.message ?? e) });
  }
}