import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * POST /api/user/delete
 *
 * Deletes the authenticated user's account:
 * 1. Verifies the user's auth token
 * 2. Cancels any active Stripe subscription (via stripe_subscription_id on workspace)
 * 3. Deletes the user from auth.users (cascades to profiles via FK)
 *
 * Requires: Authorization header with valid Bearer token.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();

    // Verify the token and get ID
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Cancel active Stripe subscription if exists (best-effort)
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('current_workspace_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.current_workspace_id) {
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('stripe_subscription_id')
          .eq('id', profile.current_workspace_id)
          .maybeSingle();

        if (workspace?.stripe_subscription_id) {
          // Cancel via Stripe API if STRIPE_SECRET_KEY is available
          const stripeKey = process.env.STRIPE_SECRET_KEY;
          if (stripeKey) {
            await fetch(`https://api.stripe.com/v1/subscriptions/${workspace.stripe_subscription_id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${stripeKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            });
          }
        }
      }
    } catch (stripErr) {
      console.warn('[DELETE /api/user/delete] Stripe cancellation failed (non-blocking):', stripErr);
    }

    // Delete the user from auth.users (service role)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('[DELETE /api/user/delete] Failed to delete user:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete account. Please try again or contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: 'Account deleted successfully.' });
  } catch (error) {
    console.error('[DELETE /api/user/delete] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
