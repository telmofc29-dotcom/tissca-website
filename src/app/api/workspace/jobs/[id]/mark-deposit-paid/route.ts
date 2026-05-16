// src/app/api/workspace/jobs/[id]/mark-deposit-paid/route.ts v1.0
//
// POST /api/workspace/jobs/:id/mark-deposit-paid
//
// Explicitly marks the deposit as paid on a job.
// This is the ONLY path that sets deposit_paid > 0 and deposit_paid_at.
// Deposit semantics:
//   - Job is created with deposit_requested > 0, deposit_paid = 0
//   - This endpoint confirms payment: deposit_paid = deposit_requested, deposit_paid_at = now
//   - Only after this should PDFs show "Deposit paid" and "Balance due"

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { resolveUserFromToken, updateJob, logHistory } from '@/lib/workspace-data';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolved = await resolveUserFromToken(token);
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!resolved.businessId) {
      return NextResponse.json(
        { error: 'No workspace found.' },
        { status: 400 },
      );
    }

    const jobId = params.id;

    // Fetch current job
    const supabase = createServerSupabaseClient();
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('workspace_id', resolved.businessId)
      .single();

    if (jobErr || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const depositRequested = Number(job.deposit_amount ?? 0);
    if (depositRequested <= 0) {
      return NextResponse.json(
        { error: 'No deposit requested on this job.' },
        { status: 400 },
      );
    }

    // Allow optional override amount from body (e.g. partial payment)
    let paidAmount = depositRequested;
    try {
      const body = await req.json();
      if (body.amount != null && typeof body.amount === 'number' && body.amount > 0) {
        paidAmount = body.amount;
      }
    } catch {
      // No body — use full deposit_requested as paid amount
    }

    const result = await updateJob(resolved, jobId, {
      deposit_paid_amount: paidAmount,
      deposit_status: 'PAID',
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await logHistory(resolved, 'job', jobId, 'deposit_paid', {
      deposit_requested: depositRequested,
      deposit_paid: paidAmount,
      deposit_paid_at: Date.now(),
    });

    return NextResponse.json({ job: result.data });
  } catch (err) {
    console.error('[POST /api/workspace/jobs/:id/mark-deposit-paid] Failed:', err);
    return NextResponse.json({ error: 'Failed to mark deposit as paid' }, { status: 500 });
  }
}
