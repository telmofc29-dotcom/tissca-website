// src/app/api/unsubscribe/route.ts
//
// PURPOSE:
// Handles unsubscribe requests via token.
// Validates token, sets user_email_preferences.unsubscribed_all = true.

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Look up the token
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('unsubscribe_tokens')
      .select('user_id')
      .eq('token', token)
      .single();

    if (tokenErr || !tokenRow) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 404 });
    }

    const userId = tokenRow.user_id;

    // Set unsubscribed_all = true (upsert in case no row exists yet)
    const { error: upsertErr } = await supabase
      .from('user_email_preferences')
      .upsert(
        {
          user_id: userId,
          unsubscribed_all: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (upsertErr) {
      console.error('[unsubscribe] Failed to update preferences:', upsertErr.message);
      return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
    }

    // Cancel any pending emails for this user
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (profile?.email) {
      await supabase
        .from('email_queue')
        .update({ status: 'cancelled' })
        .eq('email', profile.email)
        .in('status', ['pending', 'processing']);
    }

    return NextResponse.json({ ok: true, message: 'Successfully unsubscribed' });
  } catch (err) {
    console.error('[unsubscribe] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
