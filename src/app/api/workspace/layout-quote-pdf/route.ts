import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import type { GeneratedQuote } from '@/lib/planner/pricing';
import {
  loadPdfIdentity,
  drawBrandedHeader,
  drawClientSection,
  drawInfoBox,
  drawFooterBar,
  drawPageNumber,
  drawWatermark,
  type PdfIdentity,
  MARGIN,
  PAGE_W,
  CONTENT_W,
} from '@/lib/pdf/branding';
import { resolveUserFromToken, persistDocumentAndLog } from '@/lib/workspace-data';
import { formatMinorCurrency } from '@/lib/currency';
import { isPro } from '@/lib/plans';
import type { PlanTier } from '@/lib/plans';

/**
 * POST /api/workspace/layout-quote-pdf
 * Generate a branded PDF from a GeneratedQuote payload.
 * Reads workspace branding if auth token provided.
 */
export async function POST(req: NextRequest) {
  try {
    const quote: GeneratedQuote = await req.json();

    if (!quote || !quote.lineItems) {
      return NextResponse.json({ error: 'Invalid quote data' }, { status: 400 });
    }

    // Try to load branding + check plan
    let identity: PdfIdentity | null = null;
    let includeWatermark = false;
    let resolved: Awaited<ReturnType<typeof resolveUserFromToken>> = null;
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (token) {
      resolved = await resolveUserFromToken(token);
      if (resolved?.workspaceId) {
        identity = await loadPdfIdentity(resolved.workspaceId);

        // Check plan — free tier gets watermark, scan-to-layout PDF restricted to Pro
        const { createServerSupabaseClient } = await import('@/lib/supabase');
        const supabase = createServerSupabaseClient();
        const { data: ws } = await supabase
          .from('workspaces')
          .select('plan_tier')
          .eq('id', resolved.workspaceId)
          .single();

        const plan = (ws?.plan_tier ?? 'free') as PlanTier;
        if (!isPro(plan)) {
          return NextResponse.json(
            { error: 'Layout PDF export requires a Pro, Team Starter, or Team Pro plan.' },
            { status: 403 }
          );
        }
      }
    }

    const pdfBuffer = await buildLayoutQuotePDF(quote, identity, includeWatermark);

    const filename = `Layout-Quote-${new Date(quote.generatedAt).toISOString().slice(0, 10)}.pdf`;

    // Persist document metadata + history event (fire-and-forget)
    if (resolved) {
      const layoutItems = quote.lineItems.map((li) => ({
        description: li.label,
        unit: li.material || null,
        qty: li.quantity,
        price: li.unitPricePence / 100,
        total: li.lineTotalPence / 100,
      }));
      const subtotal = quote.totalPence / 100;
      const sellTotal = quote.sellPricePence / 100;
      persistDocumentAndLog(resolved, {
        type: 'layout_quote',
        reference: quote.layoutName ?? null,
        date: new Date(quote.generatedAt).toISOString().slice(0, 10),
        client_name: quote.client?.name ?? null,
        client_address: quote.client?.address ?? null,
        subtotal,
        vat_amount: null,
        grand_total: sellTotal,
        currency: 'GBP',
        items: layoutItems,
        linked_entity_type: quote.layoutId ? 'layout' : null,
        linked_entity_id: quote.layoutId ?? null,
        status: 'generated',
      });
    }

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'PDF generation failed';
    console.error('Layout quote PDF error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PDF Builder ─────────────────────────────────────────────────────────────

function fmt(pence: number, currencyCode?: string | null): string {
  return formatMinorCurrency(pence, currencyCode);
}

async function buildLayoutQuotePDF(
  quote: GeneratedQuote,
  identity: PdfIdentity | null,
  includeWatermark: boolean,
): Promise<Buffer> {
  const cc = identity?.default_currency ?? 'GBP';
  const f = (pence: number) => fmt(pence, cc);
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const marginL = MARGIN;
      const marginR = PAGE_W - MARGIN;

      // ─── Header — use shared branded header ─────────────────
      let y = drawBrandedHeader(doc, identity, 'LAYOUT QUOTATION');

      // ─── Info box (right) + Client (left) ───────────────────
      const infoRows = [
        { label: 'Date', value: new Date(quote.generatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
      ];
      if (quote.layoutName) infoRows.push({ label: 'Project', value: quote.layoutName });
      infoRows.push({ label: 'Items', value: `${quote.totalUnits}` });

      const infoBottom = drawInfoBox(doc, y, infoRows);

      if (quote.client) {
        drawClientSection(doc, y, {
          name: quote.client.name,
          address: quote.client.address,
        });
      }

      y = Math.max(infoBottom, y + 60) + 15;

      // ─── Line items table ──────────────────────────────────
      const col1 = marginL;
      const col2 = marginL + 220;
      const col3 = marginL + 310;
      const col4 = marginL + 390;
      const col5 = marginR;

      // Table header
      const headerH = 22;
      doc.rect(col1, y, CONTENT_W, headerH).fill('#f5f5f5');
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#333333');
      doc.text('Description', col1 + 8, y + 6);
      doc.text('Material', col2, y + 6);
      doc.text('Width', col3, y + 6, { width: 60, align: 'right' });
      doc.text('Unit Price', col4, y + 6, { width: 70, align: 'right' });
      doc.text('Total', col5 - 70, y + 6, { width: 70, align: 'right' });
      doc.moveTo(col1, y).lineTo(marginR, y).stroke('#dddddd');
      doc.moveTo(col1, y + headerH).lineTo(marginR, y + headerH).stroke('#dddddd');
      y += headerH;

      // Rows
      doc.fontSize(8).font('Helvetica').fillColor('#333333');
      for (const item of quote.lineItems) {
        if (y > 680) { doc.addPage(); y = 40; }
        doc.moveTo(col1, y + 16).lineTo(marginR, y + 16).stroke('#eeeeee');
        doc.fillColor('#333333').text(item.label, col1 + 8, y + 3, { width: 210, lineBreak: false });
        doc.fillColor('#888888').text(item.material, col2, y + 3, { width: 80, lineBreak: false });
        doc.fillColor('#666666').text(`${item.widthMM}mm`, col3, y + 3, { width: 60, align: 'right' });
        doc.fillColor('#333333').text(f(item.unitPricePence), col4, y + 3, { width: 70, align: 'right' });
        doc.font('Helvetica-Bold').fillColor('#111827').text(f(item.lineTotalPence), col5 - 70, y + 3, { width: 70, align: 'right' });
        doc.font('Helvetica');
        y += 16;
      }

      // Table outer border
      doc.rect(col1, y - quote.lineItems.length * 16 - headerH, CONTENT_W, quote.lineItems.length * 16 + headerH).stroke('#dddddd');
      y += 12;

      // ─── Category breakdown ────────────────────────────────
      if (y > 680) { doc.addPage(); y = 40; }
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827').text('CATEGORY BREAKDOWN', marginL, y);
      y += 18;
      for (const cat of quote.categories) {
        doc.fontSize(8).font('Helvetica').fillColor('#333333')
          .text(`${cat.categoryLabel} (×${cat.count})`, marginL, y, { width: 300 });
        doc.font('Helvetica-Bold').fillColor('#111827')
          .text(f(cat.totalPence), marginR - 80, y, { width: 80, align: 'right' });
        y += 14;
      }
      y += 8;

      // ─── Totals ────────────────────────────────────────────
      if (y > 700) { doc.addPage(); y = 40; }
      const totalsX = marginR - 200;
      const valX = marginR - 80;

      doc.fontSize(9).font('Helvetica').fillColor('#666666');
      doc.text('Materials Cost:', totalsX, y, { width: 120 });
      doc.font('Helvetica-Bold').fillColor('#111827').text(f(quote.totalPence), valX, y, { width: 80, align: 'right' });
      y += 16;

      if (quote.labourPence > 0) {
        doc.font('Helvetica').fillColor('#666666').text('Labour:', totalsX, y, { width: 120 });
        doc.font('Helvetica-Bold').fillColor('#111827').text(f(quote.labourPence), valX, y, { width: 80, align: 'right' });
        y += 16;
      }

      if (quote.markupPence > 0) {
        const pct = quote.margins?.markupPercent ?? 0;
        doc.font('Helvetica').fillColor('#666666').text(`Markup (${pct}%):`, totalsX, y, { width: 120 });
        doc.font('Helvetica-Bold').fillColor('#111827').text(f(quote.markupPence), valX, y, { width: 80, align: 'right' });
        y += 16;
      }

      y += 4;
      const brandColor = identity?.brand_color || '#1e40af';
      doc.moveTo(totalsX, y).lineTo(marginR, y).stroke(brandColor);
      y += 10;
      doc.fontSize(12).font('Helvetica-Bold').fillColor(brandColor);
      doc.text('TOTAL:', totalsX, y, { width: 120 });
      doc.text(f(quote.sellPricePence), valX, y, { width: 80, align: 'right' });
      y += 24;

      // Footer note
      doc.fontSize(7).font('Helvetica').fillColor('#aaaaaa');
      doc.text(
        'This quotation is valid for 30 days from the date of issue. Prices are estimates based on catalogue defaults and may vary upon final specification and site survey.',
        marginL, y, { width: CONTENT_W },
      );

      // ─── Footer bar + page numbers on all pages ─────────────
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        if (includeWatermark) drawWatermark(doc);
        drawFooterBar(doc, identity);
        drawPageNumber(doc, i + 1);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
