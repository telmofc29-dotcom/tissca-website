// src/app/api/webhooks/stripe/route.ts v2.3
//
// PURPOSE:
//   Handle Stripe webhook events, record financial_events for revenue tracking,
//   log every webhook delivery to stripe_webhook_log for observability, and
//   preserve existing subscription activation/cancellation logic.
//
// CHANGES (v2.0):
//   - Add Stripe signature verification (STRIPE_WEBHOOK_SECRET)
//   - Write financial_events for every money event (idempotent via stripe_event_id UNIQUE)
//   - Write stripe_webhook_log for observability (admin/engineering/stripe/webhooks)
//   - Handle additional events: invoice.payment_failed, charge.refunded, charge.dispute.created
//   - Resolve workspace_id from stripe_customer_id for financial_events
//   - Update workspaces.plan_tier + subscription_status on subscription changes
//   - Fix metadata key mismatch (edge function sends user_id/workspace_id, old code read userId)
//   - Preserve Prisma subscription sync (linkStripeSubscription, cancelSubscription, updateSubscriptionTier)
//
// CHANGES (v2.1 — surgical correction pass):
//   - Fix broken JSON.parse fallback (sync function, .catch does nothing)
//   - Webhook log: INSERT per delivery instead of UPSERT (preserves retry history)
//   - Refund: use latest refund delta, not cumulative amount_refunded
//   - Dispute: resolve workspace via charge → customer lookup
//   - Plan tier: prefer price-based resolution from STRIPE_PRICE_* env vars
//   - Checkout: operational-only — revenue counted at invoice.paid to avoid double-count
//   - Supabase writes: check returned error objects explicitly
//   - Prisma 'premium' divergence documented
//
// CHANGES (v2.2):
//   - Tighten duplicate-key detection for stripe_webhook_log inserts
//   - Checkout session now retrieves subscription when possible to derive plan/customer/period end
//   - Workspace billing sync now supports stripe_customer_id updates
//   - Subscription deleted now clears stripe_subscription_id
//   - Invoice paid now attempts to derive plan_key from subscription price
//   - Fail clearly if Stripe secret key is missing instead of silently falling into dev-style behaviour
//
// CHANGES (v2.3):
//   - invoice.paid is the ONLY canonical successful payment event for revenue recording
//   - invoice.payment_succeeded is now acknowledged but does not write financial_events
//   - Prevents revenue double-counting if Stripe sends both events for the same invoice
//
// IDEMPOTENCY:
//   financial_events has a UNIQUE index on stripe_event_id.
//   If a duplicate event arrives, the INSERT is skipped (ON CONFLICT DO NOTHING).
//
//   stripe_webhook_log uses INSERT per delivery attempt.
//   If your DB still has a UNIQUE constraint/index on stripe_event_id, duplicate deliveries
//   will be ignored gracefully by the handler until that UNIQUE index is removed.
//
// SECURITY:
//   - Stripe signature verification via constructEvent()
//   - Falls back to raw JSON parse only when STRIPE_WEBHOOK_SECRET is not set (dev mode, logged as warning)

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { linkStripeSubscription, cancelSubscription, updateSubscriptionTier } from '@/lib/db';

export const dynamic = 'force-dynamic';

type SupabaseAdmin = ReturnType<typeof createClient<any>>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    '';

  if (!url || !key) return null;

  return createClient<any>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function getStripe(): Stripe | null {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return null;
  return new Stripe(secret, { apiVersion: '2024-04-10' as any });
}

function isDuplicateKeyError(error: any): boolean {
  const message = String(error?.message ?? '').toLowerCase();
  const code = String(error?.code ?? '');
  return (
    code === '23505' ||
    message.includes('duplicate key') ||
    message.includes('already exists') ||
    message.includes('unique constraint') ||
    message.includes('violates unique constraint')
  );
}

/** Resolve workspace_id from stripe_customer_id via workspaces table */
async function resolveWorkspaceFromCustomer(
  supabase: SupabaseAdmin,
  customerId: string | null | undefined,
): Promise<{ workspaceId: string | null; userId: string | null }> {
  if (!customerId) return { workspaceId: null, userId: null };

  const { data, error } = await supabase
    .from('workspaces')
    .select('id, owner_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (error) {
    console.error('[stripe-webhook] resolveWorkspaceFromCustomer error:', error.message);
  }

  return {
    workspaceId: data?.id || null,
    userId: data?.owner_id || null,
  };
}

/** Extract metadata user/workspace — handle both camelCase and snake_case */
function extractMetadata(metadata: any) {
  return {
    userId: metadata?.user_id || metadata?.userId || null,
    workspaceId: metadata?.workspace_id || metadata?.workspaceId || null,
    planTier: metadata?.plan_tier || metadata?.planTier || null,
    priceId: metadata?.price_id || metadata?.priceId || null,
  };
}

/** Map Stripe plan tier to our canonical plan_key */
function normalizePlanKey(tier: string | null | undefined): string {
  if (!tier) return 'pro'; // default for paid / legacy fallback
  const t = tier.toLowerCase().trim();

  if (t === 'team_starter') return 'team_starter';
  if (t === 'team_pro') return 'team_pro';
  if (t === 'team') return 'team_starter'; // legacy "team" maps to team_starter
  if (t === 'pro') return 'pro';
  if (t === 'premium') return 'pro'; // legacy "premium" maps to pro

  return t;
}

/** Resolve plan tier from Stripe price ID using STRIPE_PRICE_* env vars */
function resolvePlanFromPrice(priceId: string | null | undefined): string | null {
  if (!priceId) return null;

  const map: Record<string, string> = {};

  if (process.env.STRIPE_PRICE_PRO) {
    map[process.env.STRIPE_PRICE_PRO] = 'pro';
  }
  if (process.env.STRIPE_PRICE_TEAM_STARTER) {
    map[process.env.STRIPE_PRICE_TEAM_STARTER] = 'team_starter';
  }
  if (process.env.STRIPE_PRICE_TEAM_PRO) {
    map[process.env.STRIPE_PRICE_TEAM_PRO] = 'team_pro';
  }

  return map[priceId] || null;
}

async function resolvePlanFromSubscription(
  stripe: Stripe | null,
  subscriptionId: string | null | undefined,
  metadataPlanTier: string | null | undefined,
): Promise<{
  planKey: string;
  priceId: string | null;
  stripeCustomerId: string | null;
  currentPeriodEnd: string | null;
}> {
  if (!stripe || !subscriptionId) {
    return {
      planKey: normalizePlanKey(metadataPlanTier),
      priceId: null,
      stripeCustomerId: null,
      currentPeriodEnd: null,
    };
  }

  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId) as any;
    const priceId = sub.items?.data?.[0]?.price?.id || null;
    const planKey = resolvePlanFromPrice(priceId) || normalizePlanKey(metadataPlanTier);
    const stripeCustomerId =
      typeof sub.customer === 'string' ? sub.customer : sub.customer?.id || null;

    return {
      planKey,
      priceId,
      stripeCustomerId,
      currentPeriodEnd: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
    };
  } catch (err) {
    console.warn('[stripe-webhook] resolvePlanFromSubscription failed, falling back to metadata:', err);
    return {
      planKey: normalizePlanKey(metadataPlanTier),
      priceId: null,
      stripeCustomerId: null,
      currentPeriodEnd: null,
    };
  }
}

// ---------------------------------------------------------------------------
// Webhook log helper
// ---------------------------------------------------------------------------

async function logWebhook(
  supabase: SupabaseAdmin,
  event: any,
  signatureValid: boolean | null,
  httpStatus: number,
  processed: boolean,
  errorMessage: string | null,
) {
  try {
    const { error } = await supabase.from('stripe_webhook_log').insert({
      stripe_event_id: event.id || `unknown_${Date.now()}`,
      event_type: event.type || 'unknown',
      livemode: event.livemode ?? null,
      api_version: event.api_version || null,
      stripe_created: event.created ? new Date(event.created * 1000).toISOString() : null,
      stripe_request_id: event.request?.id || null,
      idempotency_key: event.request?.idempotency_key || null,
      signature_valid: signatureValid,
      http_status: httpStatus,
      processed,
      processed_at: processed ? new Date().toISOString() : null,
      error_message: errorMessage,
      raw_payload: event,
    });

    // If the old UNIQUE index still exists, duplicate deliveries will hit this path.
    // That is acceptable temporarily until the UNIQUE index is removed.
    if (error && !isDuplicateKeyError(error)) {
      console.error('[stripe-webhook] Webhook log insert error:', error.message);
    }
  } catch (err) {
    console.error('[stripe-webhook] Failed to write webhook log:', err);
  }
}

// ---------------------------------------------------------------------------
// Financial event writer (idempotent)
// ---------------------------------------------------------------------------

async function recordFinancialEvent(
  supabase: SupabaseAdmin,
  params: {
    stripeEventId: string;
    eventType: string;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    stripeInvoiceId?: string | null;
    stripePaymentIntentId?: string | null;
    stripeChargeId?: string | null;
    workspaceId?: string | null;
    userId?: string | null;
    planKey?: string | null;
    currency?: string;
    grossAmount?: number;
    feeAmount?: number;
    netAmount?: number;
    status?: string;
    occurredAt?: string;
    rawPayload?: any;
    description?: string;
  },
) {
  try {
    const { error } = await supabase.from('financial_events').upsert(
      {
        source: 'stripe',
        event_type: params.eventType,
        stripe_event_id: params.stripeEventId,
        stripe_customer_id: params.stripeCustomerId || null,
        stripe_subscription_id: params.stripeSubscriptionId || null,
        stripe_invoice_id: params.stripeInvoiceId || null,
        stripe_payment_intent_id: params.stripePaymentIntentId || null,
        stripe_charge_id: params.stripeChargeId || null,
        workspace_id: params.workspaceId || null,
        user_id: params.userId || null,
        plan_key: params.planKey || null,
        currency: (params.currency || 'gbp').toLowerCase(),
        gross_amount: params.grossAmount ?? 0,
        fee_amount: params.feeAmount ?? 0,
        net_amount: params.netAmount ?? (params.grossAmount ?? 0) - (params.feeAmount ?? 0),
        status: params.status || 'completed',
        occurred_at: params.occurredAt || new Date().toISOString(),
        raw_payload: params.rawPayload || null,
        description: params.description || null,
      },
      { onConflict: 'stripe_event_id' },
    );

    if (error) {
      console.error('[stripe-webhook] financial_events upsert error:', error.message);
    }
  } catch (err) {
    console.error('[stripe-webhook] Failed to record financial event:', err);
  }
}

// ---------------------------------------------------------------------------
// Update workspace billing fields
// ---------------------------------------------------------------------------

async function syncWorkspaceBilling(
  supabase: SupabaseAdmin,
  workspaceId: string | null,
  updates: {
    plan_tier?: string;
    subscription_status?: string;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    current_period_end?: string | null;
  },
) {
  if (!workspaceId) return;

  try {
    const { error } = await supabase.from('workspaces').update(updates).eq('id', workspaceId);

    if (error) {
      console.error('[stripe-webhook] Workspace billing sync error:', error.message);
    }
  } catch (err) {
    console.error('[stripe-webhook] Failed to sync workspace billing:', err);
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(
  supabase: SupabaseAdmin,
  stripe: Stripe | null,
  event: any,
) {
  const session = event.data.object;
  const meta = extractMetadata(session.metadata);
  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id || null;
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id || null;

  // Resolve workspace from metadata first, then customer fallback
  let workspaceId = meta.workspaceId;
  let userId = meta.userId;

  if (!workspaceId && customerId) {
    const resolved = await resolveWorkspaceFromCustomer(supabase, customerId);
    workspaceId = resolved.workspaceId;
    userId = userId || resolved.userId;
  }

  const resolvedPlan = await resolvePlanFromSubscription(stripe, subscriptionId, meta.planTier);
  const planKey = resolvedPlan.planKey;
  const resolvedPriceId = meta.priceId || resolvedPlan.priceId;
  const resolvedCustomerId = resolvedPlan.stripeCustomerId || customerId;
  const currentPeriodEnd = resolvedPlan.currentPeriodEnd;

  // NOTE:
  // No financial_event here — invoice.paid is the canonical money event.
  // Recording amount_total here would double-count revenue because Stripe fires
  // both checkout.session.completed AND invoice.paid for the same transaction.

  await syncWorkspaceBilling(supabase, workspaceId, {
    plan_tier: planKey,
    subscription_status: 'active',
    stripe_customer_id: resolvedCustomerId,
    stripe_subscription_id: subscriptionId,
    current_period_end: currentPeriodEnd,
  });

  if (userId) {
    try {
      await linkStripeSubscription(
        userId,
        subscriptionId || '',
        resolvedPriceId || '',
        'active',
      );
    } catch (err) {
      // Prisma table may not exist — non-fatal
      console.warn('[stripe-webhook] Prisma linkStripeSubscription failed (non-fatal):', err);
    }
  }

  console.log(
    `[stripe-webhook] checkout_completed: workspace=${workspaceId} plan=${planKey} sub=${subscriptionId}`,
  );
}

async function handleInvoicePaid(
  supabase: SupabaseAdmin,
  stripe: Stripe | null,
  event: any,
) {
  const invoice = event.data.object;
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id || null;
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id || null;

  const resolved = await resolveWorkspaceFromCustomer(supabase, customerId);

  // Try to resolve plan from the related subscription
  let planKey: string | null = null;
  if (subscriptionId) {
    const resolvedPlan = await resolvePlanFromSubscription(stripe, subscriptionId, null);
    planKey = resolvedPlan.planKey;
  }

  // Try to extract fee from the charge (requires Stripe API call)
  let feeAmount = 0;
  const chargeId =
    typeof invoice.charge === 'string' ? invoice.charge : invoice.charge?.id || null;

  if (stripe && chargeId) {
    try {
      const charge = await stripe.charges.retrieve(chargeId, {
        expand: ['balance_transaction'],
      });
      const bt = charge.balance_transaction;
      if (bt && typeof bt === 'object' && 'fee' in bt) {
        feeAmount = bt.fee ?? 0;
      }
    } catch (err) {
      console.warn('[stripe-webhook] Could not retrieve charge fees:', err);
    }
  }

  const grossAmount = invoice.amount_paid ?? 0;

  await recordFinancialEvent(supabase, {
    stripeEventId: event.id,
    eventType: 'subscription_payment',
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripeInvoiceId: invoice.id,
    stripePaymentIntentId:
      typeof invoice.payment_intent === 'string'
        ? invoice.payment_intent
        : invoice.payment_intent?.id || null,
    stripeChargeId: chargeId,
    workspaceId: resolved.workspaceId,
    userId: resolved.userId,
    planKey,
    currency: invoice.currency || 'gbp',
    grossAmount,
    feeAmount,
    netAmount: grossAmount - feeAmount,
    status: 'completed',
    occurredAt: event.created ? new Date(event.created * 1000).toISOString() : undefined,
    rawPayload: event,
    description: `Invoice paid: ${invoice.id}`,
  });

  if (resolved.workspaceId) {
    await syncWorkspaceBilling(supabase, resolved.workspaceId, {
      subscription_status: 'active',
    });
  }

  console.log(
    `[stripe-webhook] invoice_paid: ${invoice.id} amount=${grossAmount} fee=${feeAmount}`,
  );
}

async function handleInvoicePaymentFailed(
  supabase: SupabaseAdmin,
  event: any,
) {
  const invoice = event.data.object;
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id || null;
  const resolved = await resolveWorkspaceFromCustomer(supabase, customerId);

  await recordFinancialEvent(supabase, {
    stripeEventId: event.id,
    eventType: 'payment_failed',
    stripeCustomerId: customerId,
    stripeSubscriptionId:
      typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id || null,
    stripeInvoiceId: invoice.id,
    stripePaymentIntentId:
      typeof invoice.payment_intent === 'string'
        ? invoice.payment_intent
        : invoice.payment_intent?.id || null,
    workspaceId: resolved.workspaceId,
    userId: resolved.userId,
    currency: invoice.currency || 'gbp',
    grossAmount: invoice.amount_due ?? 0,
    status: 'failed',
    occurredAt: event.created ? new Date(event.created * 1000).toISOString() : undefined,
    rawPayload: event,
    description: `Payment failed: ${invoice.id}`,
  });

  if (resolved.workspaceId) {
    await syncWorkspaceBilling(supabase, resolved.workspaceId, {
      subscription_status: 'past_due',
    });
  }

  console.log(`[stripe-webhook] invoice_payment_failed: ${invoice.id}`);
}

async function handleSubscriptionUpdated(
  supabase: SupabaseAdmin,
  event: any,
) {
  const sub = event.data.object;
  const meta = extractMetadata(sub.metadata);
  const customerId =
    typeof sub.customer === 'string' ? sub.customer : sub.customer?.id || null;

  const resolved = await resolveWorkspaceFromCustomer(supabase, customerId);
  const workspaceId = meta.workspaceId || resolved.workspaceId;
  const userId = meta.userId || resolved.userId;

  // Prefer price-based tier resolution; fall back to metadata
  const priceId = sub.items?.data?.[0]?.price?.id || null;
  const planKey = resolvePlanFromPrice(priceId) || normalizePlanKey(meta.planTier);

  let subscriptionStatus = sub.status;
  if (subscriptionStatus === 'canceled') {
    subscriptionStatus = 'cancelled';
  }

  await syncWorkspaceBilling(supabase, workspaceId, {
    plan_tier: sub.status === 'active' ? planKey : undefined,
    subscription_status: subscriptionStatus,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
  });

  if (userId) {
    try {
      if (sub.status === 'active') {
        // Prisma subscription model uses 'premium' (legacy); workspace uses 'pro' (canonical).
        // These intentionally diverge until the Prisma schema is migrated.
        await updateSubscriptionTier(userId, 'premium');
      }
    } catch (err) {
      console.warn('[stripe-webhook] Prisma updateSubscriptionTier failed (non-fatal):', err);
    }
  }

  console.log(`[stripe-webhook] subscription_updated: ${sub.id} status=${sub.status}`);
}

async function handleSubscriptionDeleted(
  supabase: SupabaseAdmin,
  event: any,
) {
  const sub = event.data.object;
  const meta = extractMetadata(sub.metadata);
  const customerId =
    typeof sub.customer === 'string' ? sub.customer : sub.customer?.id || null;

  const resolved = await resolveWorkspaceFromCustomer(supabase, customerId);
  const workspaceId = meta.workspaceId || resolved.workspaceId;
  const userId = meta.userId || resolved.userId;

  await recordFinancialEvent(supabase, {
    stripeEventId: event.id,
    eventType: 'subscription_cancelled',
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    workspaceId,
    userId,
    status: 'completed',
    occurredAt: event.created ? new Date(event.created * 1000).toISOString() : undefined,
    rawPayload: event,
    description: `Subscription cancelled: ${sub.id}`,
  });

  await syncWorkspaceBilling(supabase, workspaceId, {
    plan_tier: 'free',
    subscription_status: 'cancelled',
    stripe_customer_id: customerId,
    stripe_subscription_id: null,
    current_period_end: null,
  });

  if (userId) {
    try {
      await cancelSubscription(userId);
    } catch (err) {
      console.warn('[stripe-webhook] Prisma cancelSubscription failed (non-fatal):', err);
    }
  }

  console.log(`[stripe-webhook] subscription_deleted: ${sub.id}`);
}

async function handleChargeRefunded(
  supabase: SupabaseAdmin,
  event: any,
) {
  const charge = event.data.object;
  const customerId =
    typeof charge.customer === 'string' ? charge.customer : charge.customer?.id || null;

  const resolved = await resolveWorkspaceFromCustomer(supabase, customerId);

  // Extract the latest individual refund amount (not cumulative amount_refunded).
  // charge.refunds.data is ordered newest-first; [0] is the refund that triggered this event.
  const latestRefund = charge.refunds?.data?.[0];
  const refundedAmount = latestRefund?.amount ?? charge.amount_refunded ?? 0;

  await recordFinancialEvent(supabase, {
    stripeEventId: event.id,
    eventType: 'refund',
    stripeCustomerId: customerId,
    stripeChargeId: charge.id,
    stripePaymentIntentId:
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id || null,
    workspaceId: resolved.workspaceId,
    userId: resolved.userId,
    currency: charge.currency || 'gbp',
    grossAmount: -refundedAmount,
    feeAmount: 0,
    status: 'refunded',
    occurredAt: event.created ? new Date(event.created * 1000).toISOString() : undefined,
    rawPayload: event,
    description: `Charge refunded: ${charge.id}`,
  });

  console.log(`[stripe-webhook] charge_refunded: ${charge.id} amount=${refundedAmount}`);
}

async function handleDisputeCreated(
  supabase: SupabaseAdmin,
  stripe: Stripe | null,
  event: any,
) {
  const dispute = event.data.object;
  const chargeId =
    typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id || null;

  let customerId: string | null = null;
  let workspaceId: string | null = null;
  let userId: string | null = null;

  if (stripe && chargeId) {
    try {
      const charge = await stripe.charges.retrieve(chargeId);
      customerId =
        typeof charge.customer === 'string' ? charge.customer : charge.customer?.id || null;
    } catch (err) {
      console.warn('[stripe-webhook] Could not retrieve charge for dispute:', err);
    }
  }

  if (customerId) {
    const resolved = await resolveWorkspaceFromCustomer(supabase, customerId);
    workspaceId = resolved.workspaceId;
    userId = resolved.userId;
  }

  const disputeAmount = dispute.amount ?? 0;

  await recordFinancialEvent(supabase, {
    stripeEventId: event.id,
    eventType: 'dispute',
    stripeCustomerId: customerId,
    stripeChargeId: chargeId,
    stripePaymentIntentId:
      typeof dispute.payment_intent === 'string'
        ? dispute.payment_intent
        : dispute.payment_intent?.id || null,
    workspaceId,
    userId,
    currency: dispute.currency || 'gbp',
    grossAmount: -disputeAmount,
    feeAmount: 0,
    status: 'disputed',
    occurredAt: event.created ? new Date(event.created * 1000).toISOString() : undefined,
    rawPayload: event,
    description: `Dispute created: ${dispute.id} reason=${dispute.reason}`,
  });

  console.log(`[stripe-webhook] dispute_created: ${dispute.id} amount=${disputeAmount}`);
}

// ---------------------------------------------------------------------------
// Main webhook handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const supabase = getServiceSupabase();
  const stripe = getStripe();
  let event: any = null;
  let signatureValid: boolean | null = null;

  try {
    const rawBody = await req.text();
    const sig = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (webhookSecret) {
      if (!sig) {
        return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
      }
      if (!stripe) {
        return NextResponse.json({ error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 });
      }

      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
        signatureValid = true;
      } catch (err: any) {
        console.error('[stripe-webhook] Signature verification failed:', err.message);
        signatureValid = false;

        if (supabase) {
          let parsed: any = {};
          try {
            parsed = JSON.parse(rawBody);
          } catch {
            // invalid JSON, keep empty fallback
          }

          await logWebhook(
            supabase,
            { id: parsed.id || `sig_fail_${Date.now()}`, type: parsed.type },
            false,
            400,
            false,
            err.message,
          );
        }

        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
    } else {
      console.warn('[stripe-webhook] STRIPE_WEBHOOK_SECRET not set — skipping signature verification');
      event = JSON.parse(rawBody);
      signatureValid = null;
    }

    const eventType = event.type;
    let processed = false;
    let errorMessage: string | null = null;

    try {
      switch (eventType) {
        case 'checkout.session.completed':
          if (supabase) await handleCheckoutCompleted(supabase, stripe, event);
          processed = true;
          break;

        case 'invoice.paid':
          if (supabase) await handleInvoicePaid(supabase, stripe, event);
          processed = true;
          break;

        case 'invoice.payment_succeeded':
          console.log('[stripe-webhook] invoice.payment_succeeded acknowledged but ignored; invoice.paid is canonical for revenue');
          processed = true;
          break;

        case 'invoice.payment_failed':
          if (supabase) await handleInvoicePaymentFailed(supabase, event);
          processed = true;
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          if (supabase) await handleSubscriptionUpdated(supabase, event);
          processed = true;
          break;

        case 'customer.subscription.deleted':
          if (supabase) await handleSubscriptionDeleted(supabase, event);
          processed = true;
          break;

        case 'charge.refunded':
          if (supabase) await handleChargeRefunded(supabase, event);
          processed = true;
          break;

        case 'charge.dispute.created':
          if (supabase) await handleDisputeCreated(supabase, stripe, event);
          processed = true;
          break;

        default:
          console.log(`[stripe-webhook] Unhandled event: ${eventType}`);
          processed = true;
          break;
      }
    } catch (handlerErr: any) {
      errorMessage = String(handlerErr?.message ?? handlerErr);
      console.error(`[stripe-webhook] Handler error for ${eventType}:`, errorMessage);
    }

    if (supabase) {
      await logWebhook(
        supabase,
        event,
        signatureValid,
        processed ? 200 : 500,
        processed,
        errorMessage,
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[stripe-webhook] Fatal error:', error);

    if (supabase && event) {
      await logWebhook(
        supabase,
        event,
        signatureValid,
        500,
        false,
        String(error?.message ?? error),
      );
    }

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    );
  }
}