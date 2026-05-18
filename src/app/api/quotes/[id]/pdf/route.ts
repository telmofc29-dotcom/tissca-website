import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import PDFDocument from 'pdfkit';
import { Quote, QuoteItem, Client } from '@/types/quotes';
import { persistDocumentAndLog, type ResolvedUser } from '@/lib/workspace-data';
import { formatCurrency as fmtCur } from '@/lib/currency';
import {
  loadPdfIdentityByBusiness,
  loadPdfIdentityByUser,
  drawBrandedHeader,
  drawInfoBox,
  drawClientSection,
  drawItemsTable,
  drawTotalsBox,
  drawNotesSection,
  drawFooterBar,
  drawPageNumber,
  drawWatermark,
  type PdfIdentity,
} from '@/lib/pdf/branding';

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

    // Check watermark flag
    const includeWatermark = (quote as any).includeWatermark === true;

    // Generate PDF
    const pdfBuffer = await generateQuotePDF({
      quote: quote as Quote,
      client: client as Client,
      business: business as any,
      items: items as QuoteItem[],
      identity,
      includeWatermark,
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
 * Generate branded PDF document for a quote.
 * Matches the mobile app layout: logo + title, info box, client, items table,
 * subtotal/total, notes, contact+payment footer bar.
 */
async function generateQuotePDF(data: {
  quote: Quote;
  client: Client;
  business: any;
  items: QuoteItem[];
  identity: PdfIdentity | null;
  includeWatermark: boolean;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const { quote, client, items, identity, includeWatermark } = data;
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true,
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // ─── Header: logo + QUOTE title ──────────────────────────
      let y = drawBrandedHeader(doc, identity, 'QUOTE');

      // ─── Client "To" section (left) + Info box (right) ───────
      const fmtDate = (d: string | null) =>
        d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

      const infoRows = [
        { label: 'Date', value: fmtDate(quote.created_at) },
        { label: 'Ref No', value: quote.quote_number },
        { label: 'Client Ref', value: (client as any)?.reference || '—' },
        { label: 'Email', value: client?.email || '—' },
        { label: 'Client Phone Number', value: client?.phone || '—' },
      ];
      if (quote.notes) {
        infoRows.push({ label: 'Notes', value: quote.notes.slice(0, 120) });
      }

      const infoBoxBottom = drawInfoBox(doc, y, infoRows);

      // Client section at same Y but on the left
      const address = [
        client?.address_line_1,
        client?.address_line_2,
        [client?.city, client?.postcode].filter(Boolean).join(' '),
      ].filter(Boolean).join('\n');

      drawClientSection(doc, y, {
        name: client?.name ?? undefined,
        company: client?.company_name ?? undefined,
        address,
        phone: client?.phone ?? undefined,
        email: client?.email ?? undefined,
      });

      y = Math.max(infoBoxBottom, y + 100) + 15;

      // ─── Line items table ────────────────────────────────────
      const tableItems = items.map((item) => ({
        description: item.custom_description || 'Custom Item',
        unit: 'Item',
        qty: item.quantity,
        price: item.unit_price,
        total: item.quantity * item.unit_price,
      }));

      y = drawItemsTable(doc, y, tableItems, identity?.brand_color || '#1e40af', quote.currency);
      y += 10;

      // ─── Totals box ─────────────────────────────────────────
      const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

      // Phase G1: Discount — read from quote structured fields
      const discountType = (quote as any).discount_type ?? 'none';
      const discountVal = Number((quote as any).discount_value ?? 0);
      let discountAmount = 0;
      if (discountType === 'percentage' && discountVal > 0) {
        discountAmount = subtotal * (discountVal / 100);
      } else if (discountType === 'fixed' && discountVal > 0) {
        discountAmount = discountVal;
      }
      const afterDiscount = subtotal - discountAmount;

      const vatRate = quote.vat_rate ?? 0;
      const vat = vatRate > 0 ? afterDiscount * (vatRate / 100) : 0;
      const total = afterDiscount + vat;

      // Phase G1: Deposit — show only as "Deposit requested" on quote stage
      const depositType = (quote as any).deposit_type ?? 'none';
      const depositVal = Number((quote as any).deposit_value ?? 0);
      let depositAmount = 0;
      if (depositType === 'percentage' && depositVal > 0) {
        depositAmount = total * (depositVal / 100);
      } else if (depositType === 'fixed' && depositVal > 0) {
        depositAmount = depositVal;
      }

      const cc = quote.currency ?? identity?.default_currency ?? 'GBP';

      const totalRows: Array<{ label: string; value: string; bold?: boolean }> = [
        { label: 'Subtotal', value: fmtCur(subtotal, cc) },
      ];
      if (discountAmount > 0) {
        const discLabel = discountType === 'percentage'
          ? `Discount (${discountVal}%)`
          : 'Discount';
        totalRows.push({ label: discLabel, value: `−${fmtCur(discountAmount, cc)}` });
      }
      if (vat > 0) {
        totalRows.push({ label: `VAT (${vatRate}%)`, value: fmtCur(vat, cc) });
      }
      totalRows.push({ label: 'Total', value: fmtCur(total, cc), bold: true });
      // Deposit on quote = requested, never "paid"
      if (depositAmount > 0) {
        totalRows.push({ label: 'Deposit required', value: fmtCur(depositAmount, cc) });
        totalRows.push({ label: 'Balance on completion', value: fmtCur(total - depositAmount, cc), bold: true });
      }

      y = drawTotalsBox(doc, y, totalRows);

      // ─── Notes section ───────────────────────────────────────
      if (quote.notes) {
        y = drawNotesSection(doc, y, quote.notes);
      }

      // ─── Footer + Watermark on all pages ─────────────────────
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        if (includeWatermark) drawWatermark(doc);
        drawFooterBar(doc, identity);
        drawPageNumber(doc, i + 1);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
