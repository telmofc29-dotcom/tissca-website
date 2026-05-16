// src/app/api/cron/email-cycle/route.ts
//
// PURPOSE:
// External-scheduler-ready endpoint that runs the full email pipeline:
//   1) Trigger scan (evaluate behaviour → populate email_queue)
//   2) Queue drain (send queued emails via Resend)
//
// SECURITY:
// Protected by CRON_SECRET header — same as other cron endpoints.
// Safe for external schedulers (e.g. cron-job.org, GitHub Actions).
//
// NOT in vercel.json (Hobby plan limitation) — use external triggers.

import { NextRequest, NextResponse } from 'next/server';
import { processEmailTriggers } from '@/lib/email-intelligence';
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
    const triggerResult = await processEmailTriggers();
    const sendResult = await processEmailQueue();

    return NextResponse.json({
      ok: true,
      triggers: {
        queued: triggerResult.triggered.length,
        skipped: triggerResult.skipped.length,
        errors: triggerResult.errors,
      },
      sends: {
        sent: sendResult.sent,
        failed: sendResult.failed,
        errors: sendResult.errors,
      },
    });
  } catch (err) {
    console.error('[cron/email-cycle] Error:', err);
    return NextResponse.json(
      { error: 'Full email cycle failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
