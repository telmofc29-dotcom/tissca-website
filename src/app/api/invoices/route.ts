import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { validateCreateInvoice } from '@/lib/validators/invoiceSchemas';
import { calculateInvoiceTotals } from '@/lib/invoiceCalculations';

/**
 * GET /api/invoices
 * Get invoices with filters
 * Query params: status, client_id, date_from, date_to, q (search), page, limit
 */
export async function GET(req: NextRequest) {
  try {
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

    // Get user profile (role, business_id, client_id)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('userId', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const status = url.searchParams.get('status')?.split(',');
    const client_id = url.searchParams.get('client_id');
    const date_from = url.searchParams.get('date_from');
    const date_to = url.searchParams.get('date_to');
    const search = url.searchParams.get('q');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);

    let query = supabase
      .from('invoices')
      .select('*, clients(name, email)', { count: 'exact' });

    // Role-based filtering
    if (profile.role === 'client') {
      // Clients can only see their own invoices
      query = query.eq('client_id', profile.client_id);
    } else if (profile.role === 'staff') {
      // Staff can see invoices in their business
      query = query.eq('business_id', profile.business_id);
    } else if (profile.role === 'accountant') {
      // Accountants can see invoices in their business
      query = query.eq('business_id', profile.business_id);
    }
    // Admins can see all invoices (no business filter)

    // Apply additional filters
    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    if (client_id) {
      query = query.eq('client_id', client_id);
    }

    if (date_from) {
      query = query.gte('issue_date', date_from);
    }

    if (date_to) {
      query = query.lte('issue_date', date_to);
    }

    if (search) {
      // Search by invoice number or client name
      query = query.or(`invoice_number.ilike.%${search}%,clients.name.ilike.%${search}%`);
    }

    // Order by issue_date desc and apply pagination
    const { data: invoices, error: invoiceError, count } = await query
      .order('issue_date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (invoiceError) {
      throw invoiceError;
    }

    const total_pages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      success: true,
      data: invoices || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        total_pages,
      },
    });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invoices
 * Create a new DRAFT invoice with items
 */
export async function POST(req: NextRequest) {
  try {
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
      .from('user_profiles')
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

    const body = await req.json();

    // Validate request
    const validation = validateCreateInvoice(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { client_id, invoice_number, quote_id, issue_date, due_date, currency, notes, terms, items } = validation.data;

    // Verify client exists and belongs to business
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, business_id')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Verify business ownership for staff
    if (profile.role === 'staff' && client.business_id !== profile.business_id) {
      return NextResponse.json(
        { error: 'Forbidden: Client does not belong to your business' },
        { status: 403 }
      );
    }

    // Calculate totals from items
    const totals = calculateInvoiceTotals(
      items.map(item => ({
        qty: item.qty,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate || 0,
      }))
    );

    // Create invoice (status defaults to 'draft' via DB)
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        business_id: client.business_id,
        client_id,
        quote_id: quote_id || null,
        invoice_number,
        issue_date: issue_date || new Date().toISOString().split('T')[0],
        due_date: due_date || null,
        currency: currency || 'GBP',
        subtotal: totals.subtotal,
        discount_total: totals.discount_total,
        vat_total: totals.vat_total,
        total: totals.total,
        amount_paid: 0,
        balance_due: totals.total,
        notes: notes || null,
        terms: terms || null,
      })
      .select()
      .single();

    if (invoiceError) {
      throw invoiceError;
    }

    // Insert invoice items
    const invoice_items = items.map((item, index) => {
      const line_data = calculateInvoiceTotals([item]);
      return {
        invoice_id: invoice.id,
        type: item.type,
        description: item.description,
        qty: item.qty,
        unit: item.unit || null,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate || 0,
        line_subtotal: line_data.subtotal,
        line_vat: line_data.vat_total,
        line_total: line_data.total,
        sort_order: index,
        metadata: item.metadata || null,
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
        data: invoice,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
