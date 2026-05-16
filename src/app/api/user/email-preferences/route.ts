// src/app/api/user/email-preferences/route.ts
//
// PURPOSE:
// CRUD for the authenticated user's email preferences.
// GET: Return prefs (create defaults if no row exists).
// PUT: Update prefs.

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

const DEFAULTS = {
  product_updates: true,
  feature_emails: true,
  upgrade_emails: true,
  billing_emails: true,
  reminder_emails: true,
  support_followup: true,
  weekly_summary: true,
  unsubscribed_all: false,
  frequency: 'immediate',
};

async function getAuthUserId(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser(token);
  return user?.id ?? null;
}

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();

  // Try to fetch existing preferences
  const { data: existing } = await supabase
    .from('user_email_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existing) {
    return NextResponse.json(existing);
  }

  // Create defaults
  const { data: created, error } = await supabase
    .from('user_email_preferences')
    .insert({ user_id: userId, ...DEFAULTS })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(created);
}

export async function PUT(request: NextRequest) {
  const userId = await getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const supabase = createServerSupabaseClient();

  // Whitelist allowed fields
  const allowed: Record<string, unknown> = {};
  const boolFields = ['product_updates', 'feature_emails', 'upgrade_emails', 'billing_emails', 'reminder_emails', 'support_followup', 'weekly_summary', 'unsubscribed_all'];
  for (const f of boolFields) {
    if (typeof body[f] === 'boolean') allowed[f] = body[f];
  }
  if (body.frequency && ['immediate', 'daily', 'weekly'].includes(body.frequency)) {
    allowed.frequency = body.frequency;
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
  }

  allowed.updated_at = new Date().toISOString();

  // Upsert — create if not exists
  const { data, error } = await supabase
    .from('user_email_preferences')
    .upsert({ user_id: userId, ...DEFAULTS, ...allowed }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
