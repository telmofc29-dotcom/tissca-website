import { NextRequest, NextResponse } from 'next/server';
import { getUserBySupabaseId, getUserClients, upsertClient } from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/clients
 * Get all clients for logged-in user
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(
      token.split('.')[0]
    );

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const dbUser = await getUserBySupabaseId(user.id);
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const clients = await getUserClients(dbUser.id);

    return NextResponse.json({
      success: true,
      clients,
    });
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clients
 * Create or update a client
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(
      token.split('.')[0]
    );

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const dbUser = await getUserBySupabaseId(user.id);
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { name, email, phone, address } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Client name is required' },
        { status: 400 }
      );
    }

    const client = await upsertClient(dbUser.id, {
      name,
      email: email || undefined,
      phone: phone || undefined,
      address: address || undefined,
    });

    return NextResponse.json({
      success: true,
      client,
    });
  } catch (error: any) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}
