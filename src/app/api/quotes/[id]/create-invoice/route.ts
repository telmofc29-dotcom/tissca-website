import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { generateInvoiceNumber } from '@/lib/invoiceNumberGenerator';
import { calculateInvoiceTotals } from '@/lib/invoiceCalculations';

/**
 * POST /api/quotes/:id/create-invoice
 * Create an invoice from an accepted, locked quote
 * 
 * Creates an immutable invoice snapshot from the accepted quote's items.
 * Uses the quote_acceptance_snapshot as the source of truth for items.
 * 
 * Returns the created invoice ID and invoice number.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id;
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

    // Get user profile (role, business_id)
    const { data: profile, error: profileError } = await supabase
      .from('user_profile')
      .select('*')
      .eq('userId', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Only staff and admins can create invoices
    if (profile.role !== 'staff' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only staff can create invoices' },
        { status: 403 }
      );
    }

    // Fetch quote
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

    // Check business ownership for staff
    if (profile.role === 'staff' && quote.business_id !== profile.business_id) {
      return NextResponse.json(
        { error: 'Forbidden: Quote does not belong to your business' },
        { status: 403 }
      );
    }

    // Quote must be ACCEPTED
    if (quote.status !== 'accepted') {
      return NextResponse.json(
        { error: `Cannot create invoice from quote with status: ${quote.status}. Quote must be accepted first.` },
        { status: 400 }
      );
    }

    // Quote must be LOCKED
    if (!quote.is_locked) {
      return NextResponse.json(
        { error: 'Quote is not locked. Cannot create invoice.' },
        { status: 400 }
      );
    }

    // Fetch the acceptance snapshot (immutable source of truth)
    const { data: snapshot, error: snapshotError } = await supabase
      .from('quote_acceptance_snapshot')
      .select('*')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (snapshotError || !snapshot) {
      return NextResponse.json(
        { error: 'No acceptance snapshot found for quote. Quote may not be properly accepted.' },
        { status: 400 }
      );
    }

    // Fetch quote items from the snapshot
    const items_snapshot = snapshot.items_snapshot || [];

    if (!Array.isArray(items_snapshot) || items_snapshot.length === 0) {
      return NextResponse.json(
        { error: 'Quote has no items. Cannot create invoice.' },
        { status: 400 }
      );
    }

    // Calculate invoice totals from snapshot items
    const totals = calculateInvoiceTotals(
      items_snapshot.map(item => ({
        qty: item.quantity || item.qty || 1,
        unit_price: item.unit_price || 0,
        vat_rate: item.vat_rate || quote.vat_rate || 0,
      }))
    );

    // Generate sequential invoice number (race-safe)
    let invoice_number: string;
    try {
      invoice_number = await generateInvoiceNumber(supabase, quote.business_id);
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Failed to generate invoice number', details: error.message },
        { status: 500 }
      );
    }

    // Create invoice
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        business_id: quote.business_id,
        client_id: quote.client_id,
        quote_id: quoteId,
        invoice_number,
        issue_date: today,
        due_date: quote.valid_until || null,
        currency: 'GBP',
        subtotal: totals.subtotal,
        discount_total: totals.discount_total,
        vat_total: totals.vat_total,
        total: totals.total,
        amount_paid: 0,
        balance_due: totals.total,
        notes: `Created from accepted quote #${quote.quote_number}`,
        terms: quote.terms_and_conditions || null,
      })
      .select()
      .single();

    if (invoiceError) {
      throw invoiceError;
    }

    // Create invoice items from snapshot items
    const invoice_items = items_snapshot.map((item, index) => {
      const line_data = calculateInvoiceTotals([
        {
          qty: item.quantity || item.qty || 1,
          unit_price: item.unit_price || 0,
          vat_rate: item.vat_rate || quote.vat_rate || 0,
        },
      ]);

      return {
        invoice_id: invoice.id,
        type: item.item_type || item.type || 'material',
        description: item.custom_description || item.description || 'Item',
        qty: item.quantity || item.qty || 1,
        unit: item.unit || null,
        unit_price: item.unit_price || 0,
        vat_rate: item.vat_rate || quote.vat_rate || 0,
        line_subtotal: line_data.subtotal,
        line_vat: line_data.vat_total,
        line_total: line_data.total,
        sort_order: index,
        metadata: {
          original_quote_item_id: item.id,
          source: 'quote_snapshot',
        },
      };
    });

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoice_items);

    if (itemsError) {
      // Rollback invoice creation
      await supabase.from('invoices').delete().eq('id', invoice.id);
      throw itemsError;
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          quote_id: quoteId,
          status: 'draft',
          created_at: invoice.created_at,
          message: `Invoice ${invoice_number} created from quote ${quote.quote_number}`,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating invoice from quote:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
