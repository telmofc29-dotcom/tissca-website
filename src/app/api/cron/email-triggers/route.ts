// src/app/api/cron/email-triggers/route.ts
//
// PURPOSE:
// Scheduled endpoint that evaluates all recent user behaviour,
// classifies trigger-worthy users, and populates email_queue.
//
// SECURITY:
// Protected by CRON_SECRET header — Vercel Cron passes this automatically.
// Never call from the frontend.
//
// SCHEDULE:
// Not in vercel.json (Hobby plan). Call manually or via external scheduler.

import { NextRequest, NextResponse } from 'next/server';
import { processEmailTriggers } from '@/lib/email-intelligence';

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
    const result = await processEmailTriggers();

    return NextResponse.json({
      ok: true,
      triggered: result.triggered.length,
      skipped: result.skipped.length,
      errors: result.errors,
      summary: result.triggered.map((t) => ({
        visitorId: t.visitorId,
        trigger: t.triggerType,
        template: t.templateKey,
        priority: t.priority,
        reasons: t.reasons,
      })),
    });
  } catch (err) {
    console.error('[cron/email-triggers] Error:', err);
    return NextResponse.json(
      { error: 'Trigger processing failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
