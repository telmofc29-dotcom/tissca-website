// src/app/api/workspace/leads/route.ts v4.1
//
// GET    /api/workspace/leads         — list leads (workspace_id scoped)
// POST   /api/workspace/leads         — create a new lead
// PATCH  /api/workspace/leads         — update an existing lead (requires id in body)
// DELETE /api/workspace/leads         — delete a lead (requires id in body)

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  resolveUserFromToken,
  getLeads,
  createLead,
  updateLead,
  deleteLead,
} from '@/lib/workspace-data';
import type { CreateLeadInput, UpdateLeadInput } from '@/lib/workspace-data';

function extractToken(req: NextRequest): string | null {
  return req.headers.get('Authorization')?.replace('Bearer ', '') || null;
}

export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolved = await resolveUserFromToken(token);
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leads = await getLeads(resolved);
    return NextResponse.json({ leads });
  } catch (err) {
    console.error('[GET /api/workspace/leads] Failed:', err);
    return NextResponse.json({ error: 'Failed to load leads' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolved = await resolveUserFromToken(token);
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const wsId = resolved.workspaceId ?? resolved.businessId;
    if (!wsId) {
      console.error('[POST /api/workspace/leads] No workspaceId for user:', resolved.authId);
      return NextResponse.json(
        { error: 'No workspace found. Please reload the page or sign in again.' },
        { status: 400 },
      );
    }

    const body = await req.json();
    const input: CreateLeadInput = {
      client_name: body.client_name || body.name,
      status: body.status,
      source: body.source,
      source_tool_key: body.source_tool_key ?? null,
      job_type: body.job_type ?? null,
      estimated_value: body.estimated_value != null ? Number(body.estimated_value) : (body.value_estimate != null ? Number(body.value_estimate) : null),
      quoted_value: body.quoted_value != null ? Number(body.quoted_value) : null,
      follow_up_at_millis: body.follow_up_at_millis != null ? Number(body.follow_up_at_millis) : null,
      notes: body.notes,
      user_notes: body.user_notes ?? null,
      values_text: body.values_text ?? null,
      client_id: body.client_id || null,
      client_record_id: body.client_record_id ?? null,
      client_reference: body.client_reference ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      address_text: body.address_text ?? null,
      address_line1: body.address_line1 ?? null,
      city: body.city ?? null,
      postcode: body.postcode ?? null,
      country: body.country ?? null,
      location_text: body.location_text ?? null,
      start_date_millis: body.start_date_millis != null ? Number(body.start_date_millis) : null,
      due_date_millis: body.due_date_millis != null ? Number(body.due_date_millis) : null,
      survey_date_millis: body.survey_date_millis != null ? Number(body.survey_date_millis) : null,
      materials_delivery_date_millis: body.materials_delivery_date_millis != null ? Number(body.materials_delivery_date_millis) : null,
      deposit_amount: body.deposit_amount != null ? Number(body.deposit_amount) : null,
      deposit_due_date_millis: body.deposit_due_date_millis != null ? Number(body.deposit_due_date_millis) : null,
      deposit_sent_at_millis: body.deposit_sent_at_millis != null ? Number(body.deposit_sent_at_millis) : null,
      deposit_paid_at_millis: body.deposit_paid_at_millis != null ? Number(body.deposit_paid_at_millis) : null,
      deposit_status: body.deposit_status ?? null,
      quote_amount: body.quote_amount != null ? Number(body.quote_amount) : null,
      quote_status: body.quote_status ?? null,
      quote_sent_at_millis: body.quote_sent_at_millis != null ? Number(body.quote_sent_at_millis) : null,
      payment_due_date_millis: body.payment_due_date_millis != null ? Number(body.payment_due_date_millis) : null,
      vat_percent: body.vat_percent != null ? Number(body.vat_percent) : null,
      discount_amount: body.discount_amount != null ? Number(body.discount_amount) : null,
      discount_percent: body.discount_percent != null ? Number(body.discount_percent) : null,
      top_pdf_notes: body.top_pdf_notes ?? null,
      bottom_pdf_notes: body.bottom_pdf_notes ?? null,
      start_time_hour: body.start_time_hour != null ? Number(body.start_time_hour) : null,
      start_time_minute: body.start_time_minute != null ? Number(body.start_time_minute) : null,
    };

    if (!input.client_name || typeof input.client_name !== 'string' || !input.client_name.trim()) {
      return NextResponse.json({ error: 'Lead client_name is required' }, { status: 400 });
    }

    const result = await createLead(resolved, input);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ lead: result.data }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/workspace/leads] Failed:', err);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolved = await resolveUserFromToken(token);
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const wsId2 = resolved.workspaceId ?? resolved.businessId;
    if (!wsId2) {
      console.error('[PATCH /api/workspace/leads] No workspaceId for user:', resolved.authId);
      return NextResponse.json(
        { error: 'No workspace found. Please reload the page or sign in again.' },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { id, ...fields } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Lead id is required' }, { status: 400 });
    }

    const input: UpdateLeadInput = {};
    if (fields.client_name !== undefined) input.client_name = fields.client_name;
    if (fields.name !== undefined && fields.client_name === undefined) input.client_name = fields.name;
    if (fields.status !== undefined) input.status = fields.status;
    if (fields.source !== undefined) input.source = fields.source;
    if (fields.source_tool_key !== undefined) input.source_tool_key = fields.source_tool_key;
    if (fields.job_type !== undefined) input.job_type = fields.job_type;
    if (fields.estimated_value !== undefined) input.estimated_value = fields.estimated_value != null ? Number(fields.estimated_value) : null;
    if (fields.quoted_value !== undefined) input.quoted_value = fields.quoted_value != null ? Number(fields.quoted_value) : null;
    if (fields.follow_up_at_millis !== undefined) input.follow_up_at_millis = fields.follow_up_at_millis;
    if (fields.notes !== undefined) input.notes = fields.notes;
    if (fields.user_notes !== undefined) input.user_notes = fields.user_notes;
    if (fields.values_text !== undefined) input.values_text = fields.values_text;
    if (fields.client_id !== undefined) input.client_id = fields.client_id || null;
    if (fields.client_record_id !== undefined) input.client_record_id = fields.client_record_id;
    if (fields.client_reference !== undefined) input.client_reference = fields.client_reference;
    if (fields.phone !== undefined) input.phone = fields.phone;
    if (fields.email !== undefined) input.email = fields.email;
    if (fields.address_text !== undefined) input.address_text = fields.address_text;
    if (fields.address_line1 !== undefined) input.address_line1 = fields.address_line1;
    if (fields.city !== undefined) input.city = fields.city;
    if (fields.postcode !== undefined) input.postcode = fields.postcode;
    if (fields.country !== undefined) input.country = fields.country;
    if (fields.location_text !== undefined) input.location_text = fields.location_text;
    if (fields.start_date_millis !== undefined) input.start_date_millis = fields.start_date_millis;
    if (fields.due_date_millis !== undefined) input.due_date_millis = fields.due_date_millis;
    if (fields.survey_date_millis !== undefined) input.survey_date_millis = fields.survey_date_millis;
    if (fields.materials_delivery_date_millis !== undefined) input.materials_delivery_date_millis = fields.materials_delivery_date_millis;
    if (fields.deposit_amount !== undefined) input.deposit_amount = fields.deposit_amount;
    if (fields.deposit_due_date_millis !== undefined) input.deposit_due_date_millis = fields.deposit_due_date_millis;
    if (fields.deposit_sent_at_millis !== undefined) input.deposit_sent_at_millis = fields.deposit_sent_at_millis;
    if (fields.deposit_paid_at_millis !== undefined) input.deposit_paid_at_millis = fields.deposit_paid_at_millis;
    if (fields.deposit_status !== undefined) input.deposit_status = fields.deposit_status;
    if (fields.quote_amount !== undefined) input.quote_amount = fields.quote_amount;
    if (fields.quote_status !== undefined) input.quote_status = fields.quote_status;
    if (fields.quote_sent_at_millis !== undefined) input.quote_sent_at_millis = fields.quote_sent_at_millis;
    if (fields.payment_due_date_millis !== undefined) input.payment_due_date_millis = fields.payment_due_date_millis;
    if (fields.vat_percent !== undefined) input.vat_percent = fields.vat_percent;
    if (fields.discount_amount !== undefined) input.discount_amount = fields.discount_amount;
    if (fields.discount_percent !== undefined) input.discount_percent = fields.discount_percent;
    if (fields.top_pdf_notes !== undefined) input.top_pdf_notes = fields.top_pdf_notes;
    if (fields.bottom_pdf_notes !== undefined) input.bottom_pdf_notes = fields.bottom_pdf_notes;
    if (fields.start_time_hour !== undefined) input.start_time_hour = fields.start_time_hour;
    if (fields.start_time_minute !== undefined) input.start_time_minute = fields.start_time_minute;

    const result = await updateLead(resolved, id, input);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ lead: result.data });
  } catch (err) {
    console.error('[PATCH /api/workspace/leads] Failed:', err);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolved = await resolveUserFromToken(token);
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const wsId3 = resolved.workspaceId ?? resolved.businessId;
    if (!wsId3) {
      console.error('[DELETE /api/workspace/leads] No workspaceId for user:', resolved.authId);
      return NextResponse.json(
        { error: 'No workspace found. Please reload the page or sign in again.' },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { id } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Lead id is required' }, { status: 400 });
    }

    const result = await deleteLead(resolved, id);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/workspace/leads] Failed:', err);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}
