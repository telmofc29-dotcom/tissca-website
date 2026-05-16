// src/app/api/workspace/leads/[id]/convert/route.ts v1.0
//
// POST /api/workspace/leads/:id/convert
//
// Converts a lead into a job with full structural continuity:
//   1. Reads document settings for VAT authority
//   2. Aggregates tool attachment financials
//   3. Creates job with correct financial ownership
//   4. Reassigns tool attachments to the new job
//   5. Marks lead as 'won'
//   6. Logs history events
//
// Deposit semantics: deposit is REQUESTED on conversion, NOT paid.
// The job.deposit_paid remains 0 until explicit confirmation.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  resolveUserFromToken,
  createJob,
  updateLead,
  reassignToolAttachmentsToJob,
  sumToolAttachmentTotals,
  logHistory,
} from '@/lib/workspace-data';
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
        { error: 'No workspace found. Please reload the page or sign in again.' },
        { status: 400 },
      );
    }

    const leadId = params.id;

    // ─── 1. Fetch the lead ─────────────────────────────────────────────────
    const supabase = createServerSupabaseClient();
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('workspace_id', resolved.workspaceId ?? resolved.businessId)
      .single();

    if (leadErr || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.status === 'lost') {
      return NextResponse.json(
        { error: 'Cannot convert a lost lead. Change the status first.' },
        { status: 400 },
      );
    }

    // ─── 2. Fetch document settings for VAT authority ──────────────────────
    let settingsVatRate = 0;
    const workspaceId = resolved.workspaceId ?? resolved.businessId;
    if (workspaceId) {
      const { data: pdfInfo } = await supabase
        .from('document_pdf_info')
        .select('vat_rate')
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      if (pdfInfo?.vat_rate != null) {
        settingsVatRate = Number(pdfInfo.vat_rate);
      }
    }

    // ─── 3. Aggregate tool attachment totals ───────────────────────────────
    const { subtotal: toolTotalValue } = await sumToolAttachmentTotals(
      resolved, 'lead', leadId,
    );

    // Use tool aggregate if available, otherwise fall back to lead's estimated_value
    const jobValue = toolTotalValue > 0
      ? toolTotalValue
      : (lead.estimated_value ?? 0);

    // ─── 4. Derive deposit from tool attachments (requested, NOT paid) ────
    // Sum deposit_paid fields from tool payloads as the requested deposit amount.
    // This becomes deposit_requested on the job — deposit_paid stays 0.
    let depositRequested = 0;
    let toolDiscountPercent = 0;
    {
      const { data: attachments } = await supabase
        .from('tool_attachments')
        .select('raw_payload')
        .eq('parent_id', leadId)
        .eq('workspace_id', workspaceId);

      for (const row of (attachments ?? [])) {
        let payload: Record<string, unknown> = {};
        try {
          if (row.raw_payload) payload = JSON.parse(row.raw_payload as string);
        } catch { continue; }
        if (typeof payload.deposit_paid === 'number' || typeof payload.deposit_amount === 'number') {
          depositRequested += (payload.deposit_amount ?? payload.deposit_paid ?? 0) as number;
        }
        // Take the last non-zero discount as the tool suggestion
        if (typeof payload.discount_percent === 'number' && payload.discount_percent > 0) {
          toolDiscountPercent = payload.discount_percent;
        }
      }
    }

    // ─── 6. Create job with full financial ownership ──────────────────────
    const jobResult = await createJob(resolved, {
      client_name: lead.client_name || 'Converted Lead',
      lead_id: leadId,
      client_id: lead.client_id ?? null,
      status: 'SCHEDULED',
      job_value: jobValue,
      notes: lead.notes ?? null,
      start_date_millis: lead.start_date_millis ?? null,
      deposit_amount: depositRequested,
      deposit_status: 'DRAFT',
      vat_percent: settingsVatRate,
      discount_amount: toolDiscountPercent > 0 ? toolDiscountPercent : null,
    });

    if (jobResult.error || !jobResult.data) {
      return NextResponse.json(
        { error: jobResult.error || 'Failed to create job' },
        { status: 400 },
      );
    }

    const job = jobResult.data;

    // ─── 7. Reassign tool attachments: lead → job ─────────────────────────
    const { count: reassigned } = await reassignToolAttachmentsToJob(
      resolved, leadId, job.id,
    );

    // ─── 8. Mark lead as 'won' ────────────────────────────────────────────
    await updateLead(resolved, leadId, { status: 'WON' });

    // ─── 9. Log conversion events (both sides for full audit trail) ──────
    // Lead-side: records what happened to the lead
    await logHistory(resolved, 'lead', leadId, 'converted_to_job', {
      job_id: job.id,
      job_client_name: job.client_name,
      value: jobValue,
      tools_reassigned: reassigned,
      deposit_requested: depositRequested,
      vat_rate: settingsVatRate,
    });

    // Job-side: records the provenance of the job
    await logHistory(resolved, 'job', job.id, 'created_from_lead', {
      lead_id: leadId,
      lead_client_name: lead.client_name,
      value: jobValue,
      tools_reassigned: reassigned,
      deposit_requested: depositRequested,
      vat_rate: settingsVatRate,
    });

    return NextResponse.json({
      job,
      conversion: {
        lead_id: leadId,
        tools_reassigned: reassigned,
        deposit_requested: depositRequested,
        deposit_paid: 0,
        vat_rate: settingsVatRate,
      },
    }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/workspace/leads/:id/convert] Failed:', err);
    return NextResponse.json({ error: 'Failed to convert lead' }, { status: 500 });
  }
}
