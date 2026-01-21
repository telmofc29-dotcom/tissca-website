import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * POST /api/invoices/:id/send
 * Send invoice to client
 * Transitions draft → sent, sets sent_at timestamp
 */
export async function POST(
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

    // Only staff and admins can send invoices
    if (profile.role !== 'staff' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only staff can send invoices' },
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

    // Only draft invoices can be sent
    if (invoice.status !== 'draft') {
      return NextResponse.json(
        { error: `Cannot send invoice with status: ${invoice.status}. Only draft invoices can be sent.` },
        { status: 400 }
      );
    }

    // Update invoice: set sent_at and change status to 'sent'
    const { data: updated, error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
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
    console.error('Error sending invoice:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send invoice' },
      { status: 500 }
    );
  }
}
