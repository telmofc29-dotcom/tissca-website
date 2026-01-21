import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { validateUpdateInvoice } from '@/lib/validators/invoiceSchemas';

/**
 * GET /api/invoices/:id
 * Get a single invoice with items and payments
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;
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

    // Get user profile
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

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check access based on role
    const isClient = profile.role === 'client' && profile.client_id === invoice.client_id;
    const isStaff = profile.role === 'staff' && profile.business_id === invoice.business_id;
    const isAccountant = profile.role === 'accountant' && profile.business_id === invoice.business_id;
    const isAdmin = profile.role === 'admin';

    if (!isClient && !isStaff && !isAccountant && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: No access to this invoice' },
        { status: 403 }
      );
    }

    // Fetch invoice items
    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('sort_order', { ascending: true });

    // Fetch invoice payments
    const { data: payments } = await supabase
      .from('invoice_payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('paid_at', { ascending: false });

    // Calculate totals from items for response
    const subtotal = items?.reduce((sum, item) => sum + item.line_subtotal, 0) || 0;
    const vat_total = items?.reduce((sum, item) => sum + item.line_vat, 0) || 0;

    const totals = {
      subtotal,
      discount_total: invoice.discount_total,
      vat_total,
      total: invoice.total,
      amount_paid: invoice.amount_paid,
      balance_due: invoice.balance_due,
      payment_status: invoice.status,
    };

    return NextResponse.json({
      success: true,
      data: {
        ...invoice,
        items: items || [],
        payments: payments || [],
        totals,
      },
    });
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/invoices/:id
 * Update a DRAFT invoice
 * Only draft invoices can be updated
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;
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

    // Get user profile
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

    // Only staff and admins can update invoices
    if (profile.role !== 'staff' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only staff can update invoices' },
        { status: 403 }
      );
    }

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check business ownership
    if (profile.role === 'staff' && invoice.business_id !== profile.business_id) {
      return NextResponse.json(
        { error: 'Forbidden: Invoice does not belong to your business' },
        { status: 403 }
      );
    }

    // Only draft invoices can be updated
    if (invoice.status !== 'draft') {
      return NextResponse.json(
        { error: `Cannot update invoice with status: ${invoice.status}. Only draft invoices can be updated.` },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Validate request
    const validation = validateUpdateInvoice(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { issue_date, due_date, currency, notes, terms, status } = validation.data;

    // Prevent status change via update endpoint (use /send or /cancel instead)
    if (status !== undefined && status !== invoice.status) {
      return NextResponse.json(
        { error: 'Cannot change status via update endpoint. Use /send or /cancel endpoints.' },
        { status: 400 }
      );
    }

    // Update invoice
    const { data: updated, error: updateError } = await supabase
      .from('invoices')
      .update({
        issue_date: issue_date || invoice.issue_date,
        due_date: due_date !== undefined ? due_date : invoice.due_date,
        currency: currency || invoice.currency,
        notes: notes !== undefined ? notes : invoice.notes,
        terms: terms !== undefined ? terms : invoice.terms,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update invoice' },
      { status: 500 }
    );
  }
}
