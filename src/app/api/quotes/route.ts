import { NextRequest, NextResponse } from 'next/server';
import {
  getUserBySupabaseId,
  getUserQuotes,
  createQuote,
} from '@/lib/db';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/quotes
 * Get all quotes for logged-in user
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

    const quotes = await getUserQuotes(dbUser.id);

    return NextResponse.json({
      success: true,
      quotes,
    });
  } catch (error: any) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quotes
 * Create a new quote
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

    const { title, description, clientId, items, subtotal, tax, total, expiresAt } =
      await req.json();

    if (!title || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Quote title and items are required' },
        { status: 400 }
      );
    }

    try {
      const quote = await createQuote(dbUser.id, {
        title,
        description: description || undefined,
        clientId: clientId || undefined,
        items,
        subtotal,
        tax: tax || undefined,
        total,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      return NextResponse.json({
        success: true,
        quote,
      });
    } catch (err: any) {
      if (err.message?.includes('FREE_TIER_LIMIT')) {
        return NextResponse.json(
          { error: 'Maximum 5 quotes per month on free tier' },
          { status: 403 }
        );
      }
      throw err;
    }
  } catch (error: any) {
    console.error('Error creating quote:', error);
    return NextResponse.json(
      { error: 'Failed to create quote' },
      { status: 500 }
    );
  }
}
