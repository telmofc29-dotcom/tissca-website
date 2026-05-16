// src/app/api/email/click/route.ts
//
// PURPOSE:
// Click tracking endpoint. Logs the click and redirects to the original URL.
// Links in emails are wrapped: /api/email/click?url=ENCODED_URL&id=EMAIL_HISTORY_ID

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encodedUrl = request.nextUrl.searchParams.get('url');
  const emailId = request.nextUrl.searchParams.get('id');

  if (!encodedUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  let targetUrl: string;
  try {
    targetUrl = decodeURIComponent(encodedUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid url parameter' }, { status: 400 });
  }

  // Validate URL to prevent open redirect
  try {
    const parsed = new URL(targetUrl);
    const allowedHosts = [
      'tissca.com',
      'www.tissca.com',
    ];
    if (!allowedHosts.includes(parsed.hostname)) {
      return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  // Log the click
  if (emailId) {
    try {
      const supabase = createServerSupabaseClient();

      const { data: setting } = await supabase
        .from('email_system_settings')
        .select('value')
        .eq('key', 'tracking_enabled')
        .single();

      if (!setting || setting.value === 'true') {
        await supabase.from('email_clicks').insert({
          email_id: emailId,
          url: targetUrl,
          clicked_at: new Date().toISOString(),
          user_agent: request.headers.get('user-agent')?.slice(0, 500) || null,
        });
      }
    } catch (err) {
      console.error('[email/click] Tracking error:', err);
    }
  }

  return NextResponse.redirect(targetUrl, 302);
}
