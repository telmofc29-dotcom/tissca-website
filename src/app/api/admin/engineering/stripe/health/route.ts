// src/app/api/admin/engineering/stripe/health/route.ts v1.0
//
// PURPOSE:
// - Engineering Stripe Backbone health check (staff-only).
// - Shows env sanity + optional Stripe ping.
// - Never returns secrets; fail-closed.
//
// ENDPOINT:
// - GET /api/admin/engineering/stripe/health
//
// RETURNS:
// - { ok, env: {...}, stripe?: {...}, now }

import { NextRequest } from 'next/server';
import { requireEngineer, json } from '../_utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const gate = await requireEngineer(req);
  if (!gate.ok) return gate.res;

  try {
    const hasSecret = Boolean(process.env.STRIPE_SECRET_KEY);
    const hasWebhookSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET);

    const env = {
      stripe_secret_key_present: hasSecret,
      stripe_webhook_secret_present: hasWebhookSecret,
      node_env: process.env.NODE_ENV || 'unknown',
    };

    // Optional ping (safe): only if secret exists
    let stripePing: any = null;

    if (hasSecret) {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
          apiVersion: '2026-01-28.clover',
        });

        // lightweight call (does not create anything)
        const acct = await stripe.accounts.retrieve();
        stripePing = {
          ok: true,
          account_id: acct?.id || null,
          charges_enabled: Boolean((acct as any)?.charges_enabled),
          details_submitted: Boolean((acct as any)?.details_submitted),
        };
      } catch (e: any) {
        stripePing = {
          ok: false,
          error: String(e?.message ?? e),
        };
      }
    }

    return json(200, {
      ok: true,
      now: new Date().toISOString(),
      env,
      stripe: stripePing,
    });
  } catch (e: any) {
    return json(500, { error: 'INTERNAL_ERROR', details: String(e?.message ?? e) });
  }
}