// src/app/api/workspace/layouts/[id]/route.ts v1.0
//
// GET /api/workspace/layouts/[id] — fetch a single layout by ID (business_id scoped)

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { resolveUserFromToken, getLayoutById } from '@/lib/workspace-data';

function extractToken(req: NextRequest): string | null {
  return req.headers.get('Authorization')?.replace('Bearer ', '') || null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolved = await resolveUserFromToken(token);
    if (!resolved) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const layout = await getLayoutById(resolved, params.id);
    if (!layout) {
      return NextResponse.json({ error: 'Layout not found' }, { status: 404 });
    }

    return NextResponse.json({ layout });
  } catch (err) {
    console.error(`[GET /api/workspace/layouts/${params.id}] Failed:`, err);
    return NextResponse.json({ error: 'Failed to load layout' }, { status: 500 });
  }
}
