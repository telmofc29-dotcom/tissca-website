import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { RejectQuoteRequest } from '@/types/quotes';

/**
 * POST /api/quotes/:id/reject
 * Client rejects a quote
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id;
    const body = (await req.json()) as RejectQuoteRequest;

    if (!body.rejection_reason) {
      return NextResponse.json(
        { error: 'rejection_reason is required' },
        { status: 400 }
      );
    }

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

    // Verify quote exists and user has permission
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    // Check if quote can be rejected
    if (quote.status !== 'draft' && quote.status !== 'sent') {
      return NextResponse.json(
        { error: `Cannot reject quote with status: ${quote.status}` },
        { status: 400 }
      );
    }

    // Verify user is associated with this client
    const { data: clientProfile } = await supabase
      .from('user_profiles')
      .select('userId, client_id')
      .eq('userId', user.id)
      .single();

    if (!clientProfile || clientProfile.client_id !== quote.client_id) {
      return NextResponse.json(
        { error: 'Forbidden: Not associated with this quote' },
        { status: 403 }
      );
    }

    // Update quote: set status, rejection timestamp, reason
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        rejected_by: user.id,
        rejection_reason: body.rejection_reason,
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
      status: 'rejected',
      message: 'Quote rejected',
    });
  } catch (error: any) {
    console.error('Error rejecting quote:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
