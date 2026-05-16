// supabase/functions/stripe-create-portal/index.ts
//
// PURPOSE:
//   Create a Stripe Billing Portal Session for managing an existing subscription.
//   Called via supabase.functions.invoke('stripe-create-portal', { body: { workspace_id } })
//
// CONTRACT:
//   Request body: { workspace_id: string }
//   Response:     { url: string }               (Stripe portal URL)
//                 { error: string }              (on failure)
//
// SECURITY:
//   - JWT-authenticated (Supabase passes Authorization header automatically).
//   - Caller must be the workspace owner.
//   - Workspace must have an existing stripe_customer_id.
//
// REQUIRED SUPABASE SECRETS:
//   STRIPE_SECRET_KEY
//   SITE_URL                     (for portal return URL)
//
// VERSION HISTORY:
//   v2.0 (2026-03-27): Align contract to snake_case (workspace_id).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

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

    // ── Parse body ───────────────────────────────────────────────────
    const body = await req.json();
    const { workspace_id } = body;

    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: workspace_id.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Workspace ownership check ─────────────────────────────────────
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

    // ── Get workspace Stripe customer ─────────────────────────────────
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

    if (!workspace.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'No billing account found for this workspace. Subscribe to a plan first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Create Portal Session ─────────────────────────────────────────
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error('[stripe-create-portal] Missing STRIPE_SECRET_KEY');
      return new Response(
        JSON.stringify({ error: 'Billing configuration error. Contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-04-10' });
    const siteUrl = Deno.env.get('SITE_URL') || 'https://www.tissca.com';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: workspace.stripe_customer_id,
      return_url: `${siteUrl}/app/settings/subscription`,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[stripe-create-portal] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
