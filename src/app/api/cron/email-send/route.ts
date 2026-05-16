// src/app/api/cron/email-send/route.ts
//
// PURPOSE:
// Scheduled endpoint that drains email_queue and sends emails via Resend.
//
// SECURITY:
// Protected by CRON_SECRET header — Vercel Cron passes this automatically.
//
// SCHEDULE:
// Not in vercel.json (Hobby plan). Call manually or via external scheduler.

import { NextRequest, NextResponse } from 'next/server';
import { processEmailQueue } from '@/lib/email-sender';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // ── Auth: Verify cron secret ──
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processEmailQueue();

    return NextResponse.json({
      ok: true,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
    });
  } catch (err) {
    console.error('[cron/email-send] Error:', err);
    return NextResponse.json(
      { error: 'Email sending failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
