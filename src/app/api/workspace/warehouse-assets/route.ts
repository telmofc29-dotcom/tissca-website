// src/app/api/workspace/warehouse-assets/route.ts
//
// GET    /api/workspace/warehouse-assets   — list warehouse assets (system presets + workspace custom)
// POST   /api/workspace/warehouse-assets   — create a custom warehouse asset
// PATCH  /api/workspace/warehouse-assets   — update a warehouse asset (requires id in body)
// DELETE /api/workspace/warehouse-assets   — delete a warehouse asset (requires id in body)

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  resolveUserFromToken,
  getWarehouseAssets,
  createWarehouseAsset,
  updateWarehouseAsset,
  deleteWarehouseAsset,
} from '@/lib/workspace-data';

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
      return NextResponse.json({ assets: [] });
    }

    const assets = await getWarehouseAssets(resolved);
    return NextResponse.json({ assets });
  } catch (err) {
    console.error('[GET /api/workspace/warehouse-assets] Failed:', err);
    return NextResponse.json({ error: 'Failed to load warehouse assets' }, { status: 500 });
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
    if (!body.name || !body.category || !body.subtype) {
      return NextResponse.json(
        { error: 'name, category, and subtype are required' },
        { status: 400 },
      );
    }

    const { data, error } = await createWarehouseAsset(resolved, body);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
    return NextResponse.json({ asset: data }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/workspace/warehouse-assets] Failed:', err);
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 });
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
      return NextResponse.json({ error: 'Asset id is required' }, { status: 400 });
    }

    const { id, ...updates } = body;
    const { data, error } = await updateWarehouseAsset(resolved, id, updates);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
    return NextResponse.json({ asset: data });
  } catch (err) {
    console.error('[PATCH /api/workspace/warehouse-assets] Failed:', err);
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
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
      return NextResponse.json({ error: 'Asset id is required' }, { status: 400 });
    }

    const { error } = await deleteWarehouseAsset(resolved, body.id);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/workspace/warehouse-assets] Failed:', err);
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}
