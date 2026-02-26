import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { validateRecordPayment } from '@/lib/validators/invoiceSchemas';
import { applyPayment, validatePaymentAmount } from '@/lib/invoiceCalculations';

/**
 * POST /api/invoices/:id/record-payment
 * Record a payment for an invoice
 * Recalculates amount_paid, balance_due, and status
 */
export async function POST(
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

    // Only staff and admins can record payments
    if (profile.role !== 'staff' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only staff can record payments' },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Validate request
    const validation = validateRecordPayment(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { amount, method, reference, notes, paid_at } = validation.data;

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

    // Cannot record payment on draft invoices
    if (invoice.status === 'draft') {
      return NextResponse.json(
        { error: 'Cannot record payment on draft invoice. Send invoice first.' },
        { status: 400 }
      );
    }

    // Cannot record payment on cancelled invoices
    if (invoice.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot record payment on cancelled invoice' },
        { status: 400 }
      );
    }

    // Validate payment amount
    const paymentError = validatePaymentAmount(amount, invoice.balance_due);
    if (paymentError) {
      return NextResponse.json(
        { error: paymentError },
        { status: 400 }
      );
    }

    // Fetch all existing payments to recalculate totals
    const { data: existingPayments } = await supabase
      .from('invoice_payments')
      .select('amount')
      .eq('invoice_id', invoiceId);

    // Create payment record
    const { data: payment, error: paymentCreateError } = await supabase
      .from('invoice_payments')
      .insert({
        invoice_id: invoiceId,
        amount,
        method,
        reference: reference || null,
        notes: notes || null,
        paid_at: paid_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (paymentCreateError) {
      throw paymentCreateError;
    }

    // Recalculate totals with new payment
    const allPayments = existingPayments ? [...existingPayments, { amount }] : [{ amount }];
    const paymentResult = applyPayment(
      { total: invoice.total, sent_at: invoice.sent_at },
      allPayments
    );

    // Update invoice with new payment totals and status
    const { data: updated, error: updateError } = await supabase
      .from('invoices')
      .update({
        amount_paid: paymentResult.amount_paid,
        balance_due: paymentResult.balance_due,
        status: paymentResult.status,
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
      data: {
        invoice: updated,
        payment,
        totals: {
          amount_paid: paymentResult.amount_paid,
          balance_due: paymentResult.balance_due,
          status: paymentResult.status,
        },
      },
    });
  } catch (error: any) {
    console.error('Error recording payment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record payment' },
      { status: 500 }
    );
  }
}
