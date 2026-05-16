// src/app/api/workspace/tool-attachments/route.ts v5.0
//
// GET   /api/workspace/tool-attachments — returns tool/calculator results
// POST  /api/workspace/tool-attachments — creates a new tool attachment + recalculates parent totals
// PATCH /api/workspace/tool-attachments — updates an existing tool attachment (requires id in body)
//
// Supabase-native `tool_attachments` table. Structured calculation
// outputs attached to leads/jobs via parent_id/parent_type. Scoped by workspace_id.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  resolveUserFromToken,
  getToolAttachments,
  createToolAttachment,
  updateToolAttachment,
  sumToolAttachmentTotals,
  updateLead,
  updateJob,
} from '@/lib/workspace-data';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolved = await resolveUserFromToken(token);
    if (!resolved) {
      return NextResponse.json({ toolAttachments: [] });
    }

    const toolAttachments = await getToolAttachments(resolved);
    return NextResponse.json({ toolAttachments });
  } catch (err) {
    console.error('[GET /api/workspace/tool-attachments] Failed:', err);
    return NextResponse.json({ error: 'Failed to load tool attachments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolved = await resolveUserFromToken(token);
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      parent_id, parent_type,
      tool_key, tool_title, values_text, total, user_notes, raw_payload,
      client_record_id,
      labour_total, materials_total, subcontractor_total,
      plant_hire_total, other_direct_cost_total, overhead_total, unknown_total,
      // Legacy compat: accept lead_id/job_id and map to parent_id/parent_type
      lead_id, job_id, tool_type, tool_name,
    } = body;

    // Resolve parent_id / parent_type from either new or legacy fields
    const resolvedParentId = parent_id ?? lead_id ?? job_id;
    const resolvedParentType = parent_type ?? (lead_id ? 'LEAD' : job_id ? 'JOB' : null);
    const resolvedToolKey = tool_key ?? tool_type ?? '';
    const resolvedToolTitle = tool_title ?? tool_name ?? '';

    if (!resolvedParentId || !resolvedParentType) {
      return NextResponse.json({ error: 'parent_id and parent_type are required' }, { status: 400 });
    }
    if (!resolvedToolKey) {
      return NextResponse.json({ error: 'tool_key is required' }, { status: 400 });
    }

    const { data, error } = await createToolAttachment(resolved, {
      parent_id: resolvedParentId,
      parent_type: resolvedParentType as 'LEAD' | 'JOB',
      tool_key: resolvedToolKey,
      tool_title: resolvedToolTitle,
      values_text: values_text ?? null,
      total: total != null ? Number(total) : null,
      user_notes: user_notes ?? null,
      raw_payload: raw_payload ?? null,
      client_record_id: client_record_id ?? null,
      labour_total: labour_total != null ? Number(labour_total) : null,
      materials_total: materials_total != null ? Number(materials_total) : null,
      subcontractor_total: subcontractor_total != null ? Number(subcontractor_total) : null,
      plant_hire_total: plant_hire_total != null ? Number(plant_hire_total) : null,
      other_direct_cost_total: other_direct_cost_total != null ? Number(other_direct_cost_total) : null,
      overhead_total: overhead_total != null ? Number(overhead_total) : null,
      unknown_total: unknown_total != null ? Number(unknown_total) : null,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    // Recalculate parent totals after attaching a tool
    let recalculated: { entity: string; new_total: number } | null = null;
    try {
      const entityType = resolvedParentType === 'LEAD' ? 'lead' : 'job';
      const { subtotal } = await sumToolAttachmentTotals(resolved, entityType, resolvedParentId);
      if (subtotal > 0) {
        if (entityType === 'lead') {
          await updateLead(resolved, resolvedParentId, { estimated_value: subtotal });
        } else {
          await updateJob(resolved, resolvedParentId, { job_value: subtotal });
        }
        recalculated = { entity: entityType, new_total: subtotal };
      }
    } catch (recalcErr) {
      console.error('[POST /api/workspace/tool-attachments] Recalculation failed:', recalcErr);
    }

    return NextResponse.json({ toolAttachment: data, recalculated }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/workspace/tool-attachments] Failed:', err);
    return NextResponse.json({ error: 'Failed to create tool attachment' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolved = await resolveUserFromToken(token);
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, tool_key, tool_title, values_text, total, user_notes, raw_payload,
            labour_total, materials_total, subcontractor_total,
            plant_hire_total, other_direct_cost_total, overhead_total, unknown_total } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Attachment id is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (tool_key !== undefined) updates.tool_key = tool_key;
    if (tool_title !== undefined) updates.tool_title = tool_title;
    if (values_text !== undefined) updates.values_text = values_text;
    if (total !== undefined) updates.total = total != null ? Number(total) : null;
    if (user_notes !== undefined) updates.user_notes = user_notes;
    if (raw_payload !== undefined) updates.raw_payload = raw_payload;
    if (labour_total !== undefined) updates.labour_total = labour_total;
    if (materials_total !== undefined) updates.materials_total = materials_total;
    if (subcontractor_total !== undefined) updates.subcontractor_total = subcontractor_total;
    if (plant_hire_total !== undefined) updates.plant_hire_total = plant_hire_total;
    if (other_direct_cost_total !== undefined) updates.other_direct_cost_total = other_direct_cost_total;
    if (overhead_total !== undefined) updates.overhead_total = overhead_total;
    if (unknown_total !== undefined) updates.unknown_total = unknown_total;

    const { data, error } = await updateToolAttachment(resolved, id, updates as Parameters<typeof updateToolAttachment>[2]);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ toolAttachment: data });
  } catch (err) {
    console.error('[PATCH /api/workspace/tool-attachments] Failed:', err);
    return NextResponse.json({ error: 'Failed to update tool attachment' }, { status: 500 });
  }
}
