// src/app/api/email/open/route.ts
//
// PURPOSE:
// Tracking pixel endpoint. Returns a 1x1 transparent GIF and logs the open.
// Called via: <img src="/api/email/open?id=EMAIL_HISTORY_ID" />

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(request: NextRequest) {
  const emailId = request.nextUrl.searchParams.get('id');

  // Always return the pixel, even if logging fails
  const headers = {
    'Content-Type': 'image/gif',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  };

  if (emailId) {
    try {
      const supabase = createServerSupabaseClient();

      // Check system setting
      const { data: setting } = await supabase
        .from('email_system_settings')
        .select('value')
        .eq('key', 'tracking_enabled')
        .single();

      if (!setting || setting.value === 'true') {
        await supabase.from('email_opens').insert({
          email_id: emailId,
          opened_at: new Date().toISOString(),
          user_agent: request.headers.get('user-agent')?.slice(0, 500) || null,
        });
      }
    } catch (err) {
      console.error('[email/open] Tracking error:', err);
    }
  }

  return new NextResponse(PIXEL, { status: 200, headers });
}
