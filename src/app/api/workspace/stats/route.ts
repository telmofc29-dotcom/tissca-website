// src/app/api/workspace/stats/route.ts v3.0
//
// PURPOSE:
// - GET /api/workspace/stats
// - Returns workspace-scoped metric counts for the authenticated user.
// - ALL data from Supabase-native tables (leads, jobs, tasks, quotes, invoices).
// - No Prisma tables referenced.
//
// DATA SOURCE (v3.0):
// - Supabase PostgREST (service role), scoped by business_id.
// - Tables: leads, jobs, tasks, quotes, invoices (all Supabase-native).

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { resolveUserFromToken, getWorkspaceStats } from '@/lib/workspace-data';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolved = await resolveUserFromToken(token);
    if (!resolved) {
      return NextResponse.json({
        leads: { total: 0, new: 0, quoted: 0, won: 0, lost: 0 },
        jobs: { total: 0, active: 0, completed: 0 },
        tasks: { total: 0, pending: 0, in_progress: 0, completed: 0 },
        quotes: { total: 0, open: 0, total_value: 0 },
        invoices: { total: 0, outstanding: 0, outstanding_value: 0, paid: 0, draft: 0 },
        earnings: { yearGross: 0, monthGross: 0, monthNet: 0, materials: 0 },
        conversion: 0,
        documents: { invoicesGenerated: 0, quotesGenerated: 0 },
      });
    }

    const stats = await getWorkspaceStats(resolved);
    return NextResponse.json(stats);
  } catch (err) {
    console.error('[GET /api/workspace/stats] Failed:', err);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
