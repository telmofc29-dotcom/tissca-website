// src/app/api/workspace/documents/route.ts v1.0
//
// GET /api/workspace/documents — returns documents from Supabase-native `documents` table.
// Scoped by business_id. Covers quotes, invoices, PDFs, and other generated documents.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { resolveUserFromToken, getDocuments } from '@/lib/workspace-data';

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolved = await resolveUserFromToken(token);
    if (!resolved) {
      return NextResponse.json({ documents: [] });
    }

    const documents = await getDocuments(resolved);
    return NextResponse.json({ documents });
  } catch (err) {
    console.error('[GET /api/workspace/documents] Failed:', err);
    return NextResponse.json({ error: 'Failed to load documents' }, { status: 500 });
  }
}
