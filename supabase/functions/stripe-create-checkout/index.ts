// supabase/functions/stripe-create-checkout/index.ts
//
// PURPOSE:
//   Create a Stripe Checkout Session for upgrading a workspace plan.
//   Called via supabase.functions.invoke('stripe-create-checkout', { body: { plan_tier, workspace_id } })
//
// CONTRACT:
//   Request body: { plan_tier: "pro" | "team_starter" | "team_pro", workspace_id: string }
//   Response:     { url: string }               (302-like redirect URL)
//                 { error: string }              (on failure)
//
// SECURITY:
//   - JWT-authenticated (Supabase passes Authorization header automatically).
//   - Caller must be the workspace owner.
//   - plan_tier is validated against a strict allowlist.
//   - Price ID is resolved server-side from Supabase secrets (never sent by client).
//
// REQUIRED SUPABASE SECRETS:
//   STRIPE_SECRET_KEY
//   STRIPE_PRICE_PRO
//   STRIPE_PRICE_TEAM_STARTER
//   STRIPE_PRICE_TEAM_PRO
//   SITE_URL                     (for success/cancel redirect URLs)
//
// VERSION HISTORY:
//   v2.0 (2026-03-27): Extend tiers from pro|team to pro|team_starter|team_pro.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const ALLOWED_TIERS = ['pro', 'team_starter', 'team_pro'] as const;
type AllowedTier = (typeof ALLOWED_TIERS)[number];

const PRICE_ENV_MAP: Record<AllowedTier, string> = {
  pro: 'STRIPE_PRICE_PRO',
  team_starter: 'STRIPE_PRICE_TEAM_STARTER',
  team_pro: 'STRIPE_PRICE_TEAM_PRO',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Parse & validate body ─────────────────────────────────────────
    const body = await req.json();
    const { plan_tier, workspace_id } = body;

    if (!plan_tier || !workspace_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: plan_tier, workspace_id.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!ALLOWED_TIERS.includes(plan_tier as AllowedTier)) {
      return new Response(
        JSON.stringify({ error: `Invalid plan_tier. Allowed: ${ALLOWED_TIERS.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const tier = plan_tier as AllowedTier;

    // ── Workspace ownership check ─────────────────────────────────────
    // Use service role to read workspace + membership without RLS restrictions
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: membership, error: memberError } = await adminClient
      .from('workspace_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('workspace_id', workspace_id)
      .maybeSingle();

    if (memberError || !membership) {
      return new Response(
        JSON.stringify({ error: 'You are not a member of this workspace.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (membership.role !== 'owner') {
      return new Response(
        JSON.stringify({ error: 'Only the workspace owner can manage billing.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Resolve Stripe price ID from env ──────────────────────────────
    const priceEnvName = PRICE_ENV_MAP[tier];
    const priceId = Deno.env.get(priceEnvName);

    if (!priceId) {
      console.error(`[stripe-create-checkout] Missing env: ${priceEnvName}`);
      return new Response(
        JSON.stringify({ error: 'Billing configuration error. Contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Workspace: get or create Stripe customer ──────────────────────
    const { data: workspace, error: wsError } = await adminClient
      .from('workspaces')
      .select('id, stripe_customer_id')
      .eq('id', workspace_id)
      .maybeSingle();

    if (wsError || !workspace) {
      return new Response(
        JSON.stringify({ error: 'Workspace not found.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error('[stripe-create-checkout] Missing STRIPE_SECRET_KEY');
      return new Response(
        JSON.stringify({ error: 'Billing configuration error. Contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-04-10' });

    let customerId = workspace.stripe_customer_id;

    if (!customerId) {
      // Create a new Stripe customer tied to this workspace + user email
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { workspace_id, user_id: user.id },
      });

      customerId = customer.id;

      // Persist customer ID back to workspace
      await adminClient
        .from('workspaces')
        .update({ stripe_customer_id: customerId })
        .eq('id', workspace_id);
    }

    // ── Create Checkout Session ───────────────────────────────────────
    const siteUrl = Deno.env.get('SITE_URL') || 'https://www.tissca.com';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/app/settings/subscription?stripe=success`,
      cancel_url: `${siteUrl}/app/settings/subscription?stripe=cancel`,
      metadata: {
        workspace_id,
        plan_tier: tier,
        user_id: user.id,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[stripe-create-checkout] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
