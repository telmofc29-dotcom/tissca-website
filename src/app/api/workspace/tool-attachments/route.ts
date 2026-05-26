// src/app/api/workspace/tool-attachments/route.ts v5.1
//
// GET    /api/workspace/tool-attachments — returns tool/calculator results
// POST   /api/workspace/tool-attachments — creates a new tool attachment + recalculates parent totals
// PATCH  /api/workspace/tool-attachments — updates an existing tool attachment + recalculates parent totals
// DELETE /api/workspace/tool-attachments — deletes a tool attachment (requires id in body) + recalculates parent totals
//
// Supabase-native `tool_attachments` table. Structured calculation
// outputs attached to leads/jobs via parent_id/parent_type. Scoped by workspace_id.
// Recalculation after create/update/delete matches CrmViewModel.kt v5.74.9 recalculateParentTotal().

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
  lookupLeadByClientRecordId,
  lookupJobByClientRecordId,
} from '@/lib/workspace-data';
import { createServerSupabaseClient } from '@/lib/supabase';

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
    // resolvedParentId is client_record_id; updateLead/updateJob require leads.id/jobs.id
    // so we look up the Postgres id first.
    let recalculated: { entity: string; new_total: number } | null = null;
    try {
      const entityType = resolvedParentType === 'LEAD' ? 'lead' : 'job';
      const { subtotal } = await sumToolAttachmentTotals(resolved, entityType, resolvedParentId);
      if (subtotal > 0) {
        const entityPkId = entityType === 'lead'
          ? await lookupLeadByClientRecordId(resolved, resolvedParentId)
          : await lookupJobByClientRecordId(resolved, resolvedParentId);
        if (entityPkId) {
          if (entityType === 'lead') {
            await updateLead(resolved, entityPkId, { estimated_value: subtotal });
          } else {
            await updateJob(resolved, entityPkId, { job_value: subtotal });
          }
          recalculated = { entity: entityType, new_total: subtotal };
        }
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

    // Recalculate parent total after update — matches CrmViewModel.kt v5.74.9 updateAttachment()
    // data.parent_id is client_record_id; updateLead/updateJob require the Postgres id.
    let recalculated: { entity: string; new_total: number } | null = null;
    if (data && data.parent_id && data.parent_type) {
      try {
        const entityType = data.parent_type === 'LEAD' ? 'lead' : 'job';
        const { subtotal } = await sumToolAttachmentTotals(resolved, entityType, data.parent_id);
        const entityPkId = entityType === 'lead'
          ? await lookupLeadByClientRecordId(resolved, data.parent_id)
          : await lookupJobByClientRecordId(resolved, data.parent_id);
        if (entityPkId) {
          if (entityType === 'lead') {
            await updateLead(resolved, entityPkId, { estimated_value: subtotal });
          } else {
            await updateJob(resolved, entityPkId, { job_value: subtotal });
          }
          recalculated = { entity: entityType, new_total: subtotal };
        }
      } catch (recalcErr) {
        console.error('[PATCH /api/workspace/tool-attachments] Recalculation failed:', recalcErr);
      }
    }

    return NextResponse.json({ toolAttachment: data, recalculated });
  } catch (err) {
    console.error('[PATCH /api/workspace/tool-attachments] Failed:', err);
    return NextResponse.json({ error: 'Failed to update tool attachment' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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
    const { id } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Attachment id is required' }, { status: 400 });
    }

    const wsId = resolved.workspaceId ?? resolved.businessId;
    if (!wsId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Fetch parent context before deleting so we can recalculate the parent total afterwards
    const { data: existing, error: fetchErr } = await supabase
      .from('tool_attachments')
      .select('id, parent_id, parent_type')
      .eq('id', id)
      .eq('workspace_id', wsId)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Tool attachment not found' }, { status: 404 });
    }

    // Workspace-scoped hard delete — matches OperationalSyncRepository.kt v1.16.0
    const { error: deleteErr } = await supabase
      .from('tool_attachments')
      .delete()
      .eq('id', id)
      .eq('workspace_id', wsId);

    if (deleteErr) {
      console.error('[DELETE /api/workspace/tool-attachments] Failed:', deleteErr.message);
      return NextResponse.json({ error: deleteErr.message }, { status: 500 });
    }

    // Recalculate parent total after deletion — matches CrmViewModel.kt v5.74.9 deleteAttachment()
    // existing.parent_id is client_record_id; updateLead/updateJob require the Postgres id.
    let recalculated: { entity: string; new_total: number } | null = null;
    if (existing.parent_id && existing.parent_type) {
      try {
        const entityType = existing.parent_type === 'LEAD' ? 'lead' : 'job';
        const { subtotal } = await sumToolAttachmentTotals(resolved, entityType, existing.parent_id);
        const entityPkId = entityType === 'lead'
          ? await lookupLeadByClientRecordId(resolved, existing.parent_id)
          : await lookupJobByClientRecordId(resolved, existing.parent_id);
        if (entityPkId) {
          if (entityType === 'lead') {
            await updateLead(resolved, entityPkId, { estimated_value: subtotal });
          } else {
            await updateJob(resolved, entityPkId, { job_value: subtotal });
          }
          recalculated = { entity: entityType, new_total: subtotal };
        }
      } catch (recalcErr) {
        console.error('[DELETE /api/workspace/tool-attachments] Recalculation failed:', recalcErr);
      }
    }

    return NextResponse.json({ deleted: true, id, recalculated });
  } catch (err) {
    console.error('[DELETE /api/workspace/tool-attachments] Failed:', err);
    return NextResponse.json({ error: 'Failed to delete tool attachment' }, { status: 500 });
  }
}
