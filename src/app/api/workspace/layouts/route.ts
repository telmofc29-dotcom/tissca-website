// src/app/api/workspace/layouts/route.ts v1.0
//
// GET    /api/workspace/layouts         — list layouts (business_id scoped)
// POST   /api/workspace/layouts         — create a new layout
// PATCH  /api/workspace/layouts         — update an existing layout (requires id in body)
// DELETE /api/workspace/layouts         — delete a layout (requires id in body)

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  resolveUserFromToken,
  getLayouts,
  createLayout,
  updateLayout,
  deleteLayout,
} from '@/lib/workspace-data';
import type { CreateLayoutInput, UpdateLayoutInput } from '@/lib/workspace-data';

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
      return NextResponse.json({ layouts: [] });
    }

    const layouts = await getLayouts(resolved);
    return NextResponse.json({ layouts });
  } catch (err) {
    console.error('[GET /api/workspace/layouts] Failed:', err);
    return NextResponse.json({ error: 'Failed to load layouts' }, { status: 500 });
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

    const body = await req.json();
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'Layout name is required' }, { status: 400 });
    }
    if (!body.layout_data || typeof body.layout_data !== 'object') {
      return NextResponse.json({ error: 'Layout data is required' }, { status: 400 });
    }

    const input: CreateLayoutInput = {
      name: body.name.trim(),
      description: body.description,
      layout_type: body.layout_type,
      layout_data: body.layout_data,
      lead_id: body.lead_id,
      job_id: body.job_id,
    };

    const { data, error } = await createLayout(resolved, input);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
    return NextResponse.json({ layout: data }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/workspace/layouts] Failed:', err);
    return NextResponse.json({ error: 'Failed to create layout' }, { status: 500 });
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

    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Layout id is required' }, { status: 400 });
    }

    const input: UpdateLayoutInput = {};
    if (body.name !== undefined) input.name = body.name;
    if (body.description !== undefined) input.description = body.description;
    if (body.layout_type !== undefined) input.layout_type = body.layout_type;
    if (body.status !== undefined) input.status = body.status;
    if (body.layout_data !== undefined) input.layout_data = body.layout_data;
    if (body.lead_id !== undefined) input.lead_id = body.lead_id;
    if (body.job_id !== undefined) input.job_id = body.job_id;
    if (body.quote_id !== undefined) input.quote_id = body.quote_id;

    const { data, error } = await updateLayout(resolved, body.id, input);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
    return NextResponse.json({ layout: data });
  } catch (err) {
    console.error('[PATCH /api/workspace/layouts] Failed:', err);
    return NextResponse.json({ error: 'Failed to update layout' }, { status: 500 });
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

    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Layout id is required' }, { status: 400 });
    }

    const { error } = await deleteLayout(resolved, body.id);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/workspace/layouts] Failed:', err);
    return NextResponse.json({ error: 'Failed to delete layout' }, { status: 500 });
  }
}
