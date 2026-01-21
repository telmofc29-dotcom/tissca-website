import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { CreateRevisionRequest } from '@/types/quotes';

/**
 * POST /api/quotes/:id/create-revision
 * Staff creates a new revision of a locked quote
 * This allows editing accepted quotes by creating a new version
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id;
    const body = (await req.json()) as CreateRevisionRequest;

    if (!body.change_reason) {
      return NextResponse.json(
        { error: 'change_reason is required' },
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

    // Verify user is staff
    const { data: staffMember, error: staffError } = await supabase
      .from('staff_members')
      .select('business_id')
      .eq('user_id', user.id)
      .single();

    if (staffError || !staffMember) {
      return NextResponse.json(
        { error: 'Forbidden: Only staff can create revisions' },
        { status: 403 }
      );
    }

    // Verify quote exists and belongs to staff's business
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .eq('business_id', staffMember.business_id)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    // Quote should be locked (accepted) to create a revision
    if (!quote.is_locked) {
      return NextResponse.json(
        { error: 'Can only create revisions for locked (accepted) quotes' },
        { status: 400 }
      );
    }

    // Get next revision number
    const { data: revisions } = await supabase
      .from('quote_revisions')
      .select('revision_number')
      .eq('quote_id', quoteId)
      .order('revision_number', { ascending: false })
      .limit(1);

    const nextRevisionNumber = revisions && revisions.length > 0
      ? revisions[0].revision_number + 1
      : 1;

    // Get parent revision (latest one)
    const { data: parentRevision } = await supabase
      .from('quote_revisions')
      .select('id')
      .eq('quote_id', quoteId)
      .order('revision_number', { ascending: false })
      .limit(1);

    // Fetch current quote state and items
    const { data: items } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quoteId)
      .order('sort_order', { ascending: true });

    // Calculate totals
    const subtotal = items?.reduce((sum, item) => sum + (item.line_total || 0), 0) || 0;
    const vat_rate = quote.vat_rate || 20;
    const vat_amount = subtotal * (vat_rate / 100);
    const total = subtotal + vat_amount;
    const balance_due = total;

    // Create revision record
    const { data: revision, error: revisionError } = await supabase
      .from('quote_revisions')
      .insert({
        quote_id: quoteId,
        revision_number: nextRevisionNumber,
        parent_revision_id: parentRevision?.[0]?.id || null,
        changed_by: user.id,
        change_reason: body.change_reason,
        quote_data: quote,
        items_data: items || [],
        totals_data: {
          subtotal,
          discount_amount: 0,
          markup_amount: 0,
          vat_amount,
          total,
          balance_due,
        },
      })
      .select()
      .single();

    if (revisionError) {
      return NextResponse.json(
        { error: 'Failed to create revision', details: revisionError },
        { status: 500 }
      );
    }

    // Unlock the quote so staff can edit it
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        is_locked: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to unlock quote', details: updateError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      quote_id: quoteId,
      revision_id: revision.id,
      revision_number: nextRevisionNumber,
      message: 'Quote revision created and unlocked for editing',
    });
  } catch (error: any) {
    console.error('Error creating quote revision:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
