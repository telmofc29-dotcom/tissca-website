import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import PDFDocument from 'pdfkit';
import { Invoice, InvoiceItem } from '@/types/invoices';
import { Client } from '@/types/quotes';
import { calculateInvoiceTotals } from '@/lib/invoiceCalculations';
import { persistDocumentAndLog, type ResolvedUser } from '@/lib/workspace-data';
import { isPro, normalizePlanTier } from '@/lib/plans';
import {
  loadPdfIdentityByBusiness,
  loadPdfIdentityByUser,
  renderPdfBody,
  type PdfIdentity,
} from '@/lib/pdf/branding';

// Contract §13: money format `{symbol}{value:.2f}` — NO thousands separator.
const SYMBOLS: Record<string, string> = { GBP: '£', EUR: '€', USD: '$' };
function fmtMoney(value: number, code?: string | null): string {
  const c = (code ?? 'GBP').toUpperCase();
  return `${SYMBOLS[c] ?? c}${value.toFixed(2)}`;
}

/**
 * GET /api/invoices/:id/pdf
 * Generate and download invoice as PDF
 * Returns application/pdf with invoice details, line items, payments, and totals
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

    // Fetch invoice with client and business info
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

    // Verify access: client or staff
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('userId', user.id)
      .single();

    const isClient = profile?.role === 'client' && profile?.client_id === invoice.client_id;
    const isStaff = profile?.role === 'staff' && profile?.business_id === invoice.business_id;

    if (!isClient && !isStaff) {
      return NextResponse.json(
        { error: 'Forbidden: No access to this invoice' },
        { status: 403 }
      );
    }

    // Fetch client details
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoice.client_id)
      .single();

    // Fetch workspace details (business_id IS workspace_id in live schema)
    const { data: business } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', invoice.business_id ?? invoice.workspace_id)
      .single();

    // Fetch invoice items
    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true });

    // Fetch invoice payments
    const { data: payments } = await supabase
      .from('invoice_payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('paid_at', { ascending: true });

    // Load PDF branding identity (business path first, user workspace fallback)
    const identity = await loadPdfIdentityByBusiness(invoice.business_id)
      ?? await loadPdfIdentityByUser(user.id);

    // Plan gating: Pro+ shows logo, non-Pro shows horizontal watermark (contract §1.1)
    const planTier = (business as any)?.plan_tier ?? null;
    const isProUser = isPro(normalizePlanTier(planTier));

    // Generate PDF via contract-pure renderer
    const pdfBuffer = await generateInvoicePDF({
      invoice: invoice as Invoice,
      client: client as Client,
      items: items as InvoiceItem[],
      payments: payments || [],
      identity,
      isProUser,
    });

    // Persist document metadata + history event (fire-and-forget)
    const resolved: ResolvedUser = { authId: user.id, businessId: invoice.business_id, workspaceId: null };
    const clientAddr = [client?.address_line_1, client?.address_line_2, client?.city, client?.postcode, client?.country]
      .filter(Boolean).join(', ');
    const invoiceItems = ((items ?? []) as InvoiceItem[]).map((it) => ({
      description: it.description ?? '',
      unit: it.unit ?? null,
      qty: it.qty ?? 1,
      price: it.unit_price ?? 0,
      total: it.line_total ?? 0,
    }));
    persistDocumentAndLog(resolved, {
      type: 'invoice',
      reference: invoice.invoice_number ?? null,
      date: invoice.issue_date ? new Date(invoice.issue_date).toISOString().slice(0, 10) : undefined,
      client_name: client?.name ?? null,
      client_address: clientAddr || null,
      client_email: client?.email ?? null,
      client_phone: client?.phone ?? null,
      client_ref: client?.id ?? null,
      header_notes: (invoice as Invoice).notes ?? null,
      footer_notes: (invoice as Invoice).terms ?? null,
      subtotal: (invoice as Invoice).subtotal ?? null,
      vat_amount: (invoice as Invoice).vat_total ?? null,
      grand_total: (invoice as Invoice).total ?? null,
      currency: (invoice as Invoice).currency ?? 'GBP',
      items: invoiceItems,
      linked_entity_type: 'invoice',
      linked_entity_id: invoice.id ?? null,
      status: invoice.status ?? 'generated',
    });

    // Return as downloadable PDF
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Generate branded PDF document for an invoice via contract-pure renderPdfBody().
 * Behavioural port of Android PdfGenerator.kt v3.11.0.
 */
async function generateInvoicePDF(data: {
  invoice: Invoice;
  client: Client;
  items: InvoiceItem[];
  payments: any[];
  identity: PdfIdentity | null;
  isProUser: boolean;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const { invoice, client, items, payments, identity, isProUser } = data;
      const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (e: any) => reject(e));

      const fmtDate = (d: string | null) =>
        d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

      const cc = invoice.currency ?? identity?.default_currency ?? 'GBP';

      // Info box rows — contract §10.1 (Status is NOT a contract field)
      const infoRows = [
        { label: 'Date', value: fmtDate(invoice.issue_date) },
        { label: 'Ref No', value: invoice.invoice_number ?? '—' },
        { label: 'Client Ref', value: (client as any)?.reference || '—' },
        { label: 'Email', value: client?.email || '—' },
        { label: 'Client Phone Number', value: client?.phone || '—' },
      ];

      // Client "To:" block
      const addressLines = [
        client?.company_name,
        client?.address_line_1,
        client?.address_line_2,
        [client?.city, client?.postcode].filter(Boolean).join(' '),
        client?.country,
      ].filter(Boolean) as string[];

      // Totals — contract §5
      const totals = calculateInvoiceTotals(
        items.map((i) => ({ qty: i.qty, unit_price: i.unit_price, vat_rate: i.vat_rate })),
        invoice.discount_total ?? 0,
      );
      const amountPaid = payments.reduce((sum: number, p: any) => sum + (p.amount ?? 0), 0);
      const balanceDue = totals.total - amountPaid;

      const totalsRows: Array<{ label: string; value: string; bold?: boolean }> = [
        { label: 'Subtotal', value: fmtMoney(totals.subtotal, cc) },
      ];
      if ((totals.discount_total ?? 0) > 0) {
        totalsRows.push({ label: 'Discount', value: `-${fmtMoney(totals.discount_total, cc)}` });
      }
      if ((totals.vat_total ?? 0) > 0) {
        totalsRows.push({ label: 'VAT', value: fmtMoney(totals.vat_total, cc) });
      }
      totalsRows.push({ label: 'Total', value: fmtMoney(totals.total, cc), bold: true });
      if (amountPaid > 0) {
        totalsRows.push({ label: 'Amount Paid', value: fmtMoney(amountPaid, cc) });
        totalsRows.push({ label: 'Balance Due', value: fmtMoney(Math.max(0, balanceDue), cc), bold: true });
      }

      // Items — contract §4
      const tableItems = items.map((it) => ({
        description: it.description || 'Service',
        unit: 'Item',
        qty: it.qty,
        price: it.unit_price,
        total: it.qty * it.unit_price,
      }));

      renderPdfBody(doc, {
        identity,
        docType: 'INVOICE',
        isProUser,
        fallbackTitle: 'INVOICE',
        client: {
          name: client?.name ?? null,
          address: addressLines.join('\n'),
          phone: client?.phone ?? null,
          email: client?.email ?? null,
        },
        infoRows,
        headerNotes: invoice.notes ?? null,
        items: tableItems,
        totalsRows,
        bottomNotes: invoice.terms ?? null,
        currencyCode: cc,
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
