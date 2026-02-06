import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { AcceptQuoteRequest } from '@/types/quotes';

/**
 * POST /api/quotes/:id/accept
 * Client accepts a quote - creates immutable snapshot and locks quote
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id;
    const body = (await req.json()) as AcceptQuoteRequest;
    
    const supabase = createServerSupabaseClient();
    
    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify quote exists and user has permission to accept it
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*, clients(id, business_id)')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    // Check if quote is already accepted/rejected
    if (quote.status !== 'draft' && quote.status !== 'sent') {
      return NextResponse.json(
        { error: `Cannot accept quote with status: ${quote.status}` },
        { status: 400 }
      );
    }

    // Verify user is associated with this client
    const { data: clientProfile } = await supabase
      .from('user_profile')
      .select('userId, client_id')
      .eq('userId', user.id)
      .single();

    if (!clientProfile || clientProfile.client_id !== quote.client_id) {
      return NextResponse.json(
        { error: 'Forbidden: Not associated with this quote' },
        { status: 403 }
      );
    }

    // Fetch quote items for snapshot
    const { data: items, error: itemsError } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quoteId)
      .order('sort_order', { ascending: true });

    if (itemsError) {
      return NextResponse.json(
        { error: 'Failed to fetch quote items' },
        { status: 500 }
      );
    }

    // Calculate totals (from items)
    const subtotal = items?.reduce((sum, item) => sum + (item.line_total || 0), 0) || 0;
    const vat_rate = quote.vat_rate || 20;
    const vat_amount = subtotal * (vat_rate / 100);
    const total = subtotal + vat_amount;
    const balance_due = total;

    // Get client IP from request headers
    const clientIp = 
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      'unknown';

    // Create acceptance snapshot
    const { error: snapshotError } = await supabase
      .from('quote_acceptance_snapshot')
      .insert({
        quote_id: quoteId,
        accepted_by: user.id,
        acceptance_ip: clientIp,
        items_snapshot: items || [],
        subtotal,
        discount_amount: 0,
        markup_amount: 0,
        vat_amount,
        total,
        deposit_amount: null,
        balance_due,
        acceptance_note: body.acceptance_note || null,
      });

    if (snapshotError) {
      return NextResponse.json(
        { error: 'Failed to create acceptance snapshot', details: snapshotError },
        { status: 500 }
      );
    }

    // Update quote: set status, acceptance timestamp, lock it
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
        acceptance_ip: clientIp,
        acceptance_note: body.acceptance_note || null,
        is_locked: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update quote', details: updateError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      quote_id: quoteId,
      status: 'accepted',
      message: 'Quote accepted and locked for editing',
    });
  } catch (error: any) {
    console.error('Error accepting quote:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
