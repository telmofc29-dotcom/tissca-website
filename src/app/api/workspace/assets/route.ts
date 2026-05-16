// src/app/api/workspace/assets/route.ts v1.0
//
// GET /api/workspace/assets — returns assets from Supabase-native `assets` table.
// Scoped by business_id.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { resolveUserFromToken, getAssets } from '@/lib/workspace-data';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolved = await resolveUserFromToken(token);
    if (!resolved) {
      return NextResponse.json({ assets: [] });
    }

    const assets = await getAssets(resolved);
    return NextResponse.json({ assets });
  } catch (err) {
    console.error('[GET /api/workspace/assets] Failed:', err);
    return NextResponse.json({ error: 'Failed to load assets' }, { status: 500 });
  }
}
