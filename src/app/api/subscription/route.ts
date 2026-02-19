import { NextRequest, NextResponse } from 'next/server';
import { getSubscription } from '@/lib/db';
import { getUserBySupabaseId } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/subscription
 * Get user's current subscription
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(
      authHeader.replace('Bearer ', '').split('.')[0]
    );

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const dbUser = await getUserBySupabaseId(user.id);
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const subscription = await getSubscription(dbUser.id);

    return NextResponse.json({
      success: true,
      subscription,
    });
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/subscription/checkout
 * Create Stripe checkout session (premium upgrade)
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(
      authHeader.replace('Bearer ', '').split('.')[0]
    );

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const dbUser = await getUserBySupabaseId(user.id);
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { interval } = await req.json();

    if (!interval || !['monthly', 'annual'].includes(interval)) {
      return NextResponse.json(
        { error: 'Invalid interval' },
        { status: 400 }
      );
    }

    // TODO: Implement Stripe checkout session creation
    // This requires:
    // 1. Stripe API key from environment
    // 2. Product/Price IDs for monthly (£3) and annual (£20) plans
    // 3. Create checkout session with customer email
    // 4. Return checkout URL

    // For now, return placeholder
    return NextResponse.json(
      {
        error: 'Stripe integration not yet configured',
        message: 'Checkout feature coming soon',
      },
      { status: 501 }
    );
  } catch (error: any) {
    console.error('Error creating checkout:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
