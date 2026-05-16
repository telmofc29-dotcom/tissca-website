// src/app/api/workspace/clients/route.ts v1.0
//
// GET    /api/workspace/clients       — list clients (business_id scoped)
// POST   /api/workspace/clients       — create a new client

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  resolveUserFromToken,
  getClients,
  createClient,
} from '@/lib/workspace-data';
import type { CreateClientInput } from '@/lib/workspace-data';

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
      return NextResponse.json({ clients: [] });
    }

    const clients = await getClients(resolved);
    return NextResponse.json({ clients });
  } catch (err) {
    console.error('[GET /api/workspace/clients] Failed:', err);
    return NextResponse.json({ error: 'Failed to load clients' }, { status: 500 });
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
    const input: CreateClientInput = {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      address_line_1: body.address_line_1 || null,
      city: body.city || null,
      postcode: body.postcode || null,
      company_name: body.company_name || null,
    };

    if (!input.name || typeof input.name !== 'string' || !input.name.trim()) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    const result = await createClient(resolved, input);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ client: result.data }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/workspace/clients] Failed:', err);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
