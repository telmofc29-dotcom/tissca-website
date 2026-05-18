import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import PDFDocument from 'pdfkit';
import { Quote, QuoteItem, Client } from '@/types/quotes';
import { persistDocumentAndLog, type ResolvedUser } from '@/lib/workspace-data';
import { isPro, normalizePlanTier } from '@/lib/plans';
import {
  loadPdfIdentityByBusiness,
  loadPdfIdentityByUser,
  renderPdfBody,
  type PdfIdentity,
} from '@/lib/pdf/branding';

// Contract §13 money format — NO thousands separator.
const SYMBOLS: Record<string, string> = { GBP: '£', EUR: '€', USD: '$' };
function fmtMoney(value: number, code?: string | null): string {
  const c = (code ?? 'GBP').toUpperCase();
  return `${SYMBOLS[c] ?? c}${value.toFixed(2)}`;
}

/**
 * GET /api/quotes/:id/pdf
 * Generate and download quote as PDF
 * Returns application/pdf with quote details, line items, and totals
 */
export async function GET(
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

    // Fetch quote with client and business info
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

    // Verify access: client or staff
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('userId', user.id)
      .single();

    const isClient = profile?.role === 'client' && profile?.client_id === quote.client_id;
    const isStaff = profile?.role === 'staff' && profile?.business_id === quote.business_id;

    if (!isClient && !isStaff) {
      return NextResponse.json(
        { error: 'Forbidden: No access to this quote' },
        { status: 403 }
      );
    }

    // Fetch client details
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', quote.client_id)
      .single();

    // Fetch workspace details (business_id IS workspace_id in live schema)
    const { data: business } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', quote.business_id ?? quote.workspace_id)
      .single();

    // Fetch quote items
    const { data: items } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quoteId)
      .order('sort_order', { ascending: true });

    // Load PDF branding identity (business path first, user workspace fallback)
    const identity = await loadPdfIdentityByBusiness(quote.business_id)
      ?? await loadPdfIdentityByUser(user.id);

    // Plan gating per contract §1.1
    const planTier = (business as any)?.plan_tier ?? null;
    const isProUser = isPro(normalizePlanTier(planTier));

    // Generate PDF via contract-pure renderer
    const pdfBuffer = await generateQuotePDF({
      quote: quote as Quote,
      client: client as Client,
      items: items as QuoteItem[],
      identity,
      isProUser,
    });

    // Persist document metadata + history event (fire-and-forget)
    const resolved: ResolvedUser = { authId: user.id, businessId: quote.business_id, workspaceId: null };
    const clientAddr = [client?.address_line_1, client?.address_line_2, client?.city, client?.postcode, client?.country]
      .filter(Boolean).join(', ');
    const quoteItems = ((items ?? []) as QuoteItem[]).map((it) => ({
      description: it.custom_description ?? '',
      unit: null,
      qty: it.quantity ?? 1,
      price: it.unit_price ?? 0,
      total: it.line_total ?? 0,
    }));
    const subtotal = quoteItems.reduce((s, i) => s + i.total, 0);
    const vatRate = (quote as Quote).vat_rate ?? 0;
    // Phase G1: account for discount before VAT in the snapshot
    const dType = (quote as any).discount_type ?? 'none';
    const dVal = Number((quote as any).discount_value ?? 0);
    let dAmt = 0;
    if (dType === 'percentage' && dVal > 0) dAmt = subtotal * (dVal / 100);
    else if (dType === 'fixed' && dVal > 0) dAmt = dVal;
    const afterDisc = subtotal - dAmt;
    const vatAmount = afterDisc * (vatRate / 100);
    persistDocumentAndLog(resolved, {
      type: 'quote',
      reference: quote.quote_number ?? null,
      date: quote.created_at ? new Date(quote.created_at).toISOString().slice(0, 10) : undefined,
      client_name: client?.name ?? null,
      client_address: clientAddr || null,
      client_email: client?.email ?? null,
      client_phone: client?.phone ?? null,
      client_ref: client?.id ?? null,
      header_notes: (quote as Quote).notes ?? null,
      footer_notes: (quote as Quote).terms_and_conditions ?? null,
      subtotal,
      vat_amount: vatAmount,
      grand_total: afterDisc + vatAmount,
      currency: (quote as Quote).currency ?? 'GBP',
      items: quoteItems,
      linked_entity_type: 'quote',
      linked_entity_id: quote.id ?? null,
      status: quote.status ?? 'generated',
    });

    // Return as downloadable PDF
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="quote-${quote.quote_number}.pdf"`,
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
 * Generate branded PDF document for a quote via contract-pure renderPdfBody().
 * Behavioural port of Android PdfGenerator.kt v3.11.0.
 */
async function generateQuotePDF(data: {
  quote: Quote;
  client: Client;
  items: QuoteItem[];
  identity: PdfIdentity | null;
  isProUser: boolean;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const { quote, client, items, identity, isProUser } = data;
      const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (e: any) => reject(e));

      const fmtDate = (d: string | null) =>
        d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

      const cc = quote.currency ?? identity?.default_currency ?? 'GBP';

      const infoRows = [
        { label: 'Date', value: fmtDate(quote.created_at) },
        { label: 'Ref No', value: quote.quote_number ?? '—' },
        { label: 'Client Ref', value: (client as any)?.reference || '—' },
        { label: 'Email', value: client?.email || '—' },
        { label: 'Client Phone Number', value: client?.phone || '—' },
      ];

      const addressLines = [
        client?.company_name,
        client?.address_line_1,
        client?.address_line_2,
        [client?.city, client?.postcode].filter(Boolean).join(' '),
        client?.country,
      ].filter(Boolean) as string[];

      // Totals — contract §5
      const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
      const discountType = (quote as any).discount_type ?? 'none';
      const discountVal = Number((quote as any).discount_value ?? 0);
      let discountAmount = 0;
      if (discountType === 'percentage' && discountVal > 0) discountAmount = subtotal * (discountVal / 100);
      else if (discountType === 'fixed' && discountVal > 0) discountAmount = discountVal;
      const afterDiscount = subtotal - discountAmount;
      const vatRate = quote.vat_rate ?? 0;
      const vat = vatRate > 0 ? afterDiscount * (vatRate / 100) : 0;
      const total = afterDiscount + vat;
      const depositType = (quote as any).deposit_type ?? 'none';
      const depositVal = Number((quote as any).deposit_value ?? 0);
      let depositAmount = 0;
      if (depositType === 'percentage' && depositVal > 0) depositAmount = total * (depositVal / 100);
      else if (depositType === 'fixed' && depositVal > 0) depositAmount = depositVal;

      const totalsRows: Array<{ label: string; value: string; bold?: boolean }> = [
        { label: 'Subtotal', value: fmtMoney(subtotal, cc) },
      ];
      if (discountAmount > 0) {
        const discLabel = discountType === 'percentage' ? `Discount (${discountVal}%)` : 'Discount';
        totalsRows.push({ label: discLabel, value: `-${fmtMoney(discountAmount, cc)}` });
      }
      if (vat > 0) totalsRows.push({ label: `VAT (${vatRate}%)`, value: fmtMoney(vat, cc) });
      totalsRows.push({ label: 'Total', value: fmtMoney(total, cc), bold: true });
      if (depositAmount > 0) {
        totalsRows.push({ label: 'Deposit required', value: fmtMoney(depositAmount, cc) });
        totalsRows.push({ label: 'Balance on completion', value: fmtMoney(total - depositAmount, cc), bold: true });
      }

      const tableItems = items.map((it) => ({
        description: it.custom_description || 'Service',
        unit: 'Item',
        qty: it.quantity,
        price: it.unit_price,
        total: it.quantity * it.unit_price,
      }));

      renderPdfBody(doc, {
        identity,
        docType: 'QUOTE',
        isProUser,
        fallbackTitle: 'QUOTE',
        client: {
          name: client?.name ?? null,
          address: addressLines.join('\n'),
          phone: client?.phone ?? null,
          email: client?.email ?? null,
        },
        infoRows,
        headerNotes: quote.notes ?? null,
        items: tableItems,
        totalsRows,
        bottomNotes: quote.terms_and_conditions ?? null,
        currencyCode: cc,
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
