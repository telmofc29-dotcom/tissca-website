import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import PDFDocument from 'pdfkit';
import { Quote, QuoteItem, Client } from '@/types/quotes';

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

    // Fetch business details
    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', quote.business_id)
      .single();

    // Fetch quote items
    const { data: items } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quoteId)
      .order('sort_order', { ascending: true });

    // Generate PDF
    const pdfBuffer = await generateQuotePDF({
      quote: quote as Quote,
      client: client as Client,
      business: business as any,
      items: items as QuoteItem[],
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
 * Generate branded PDF document for a quote
 */
async function generateQuotePDF(data: {
  quote: Quote;
  client: Client;
  business: any;
  items: QuoteItem[];
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const { quote, client, business, items } = data;
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true,
      });

      let pageCount = 0;
      doc.on('pageAdded', () => {
        pageCount++;
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => {
        buffers.push(chunk);
      });

      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Page 1: Main content
      drawHeader(doc, business);
      drawQuoteInfo(doc, quote);
      drawClientInfo(doc, client);
      drawLineItems(doc, items, quote);
      drawTotalsSection(doc, items, quote);
      drawTermsSection(doc, quote, business);

      // Footer on all pages
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        drawFooter(doc, pages.count, i + 1);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Draw branded header with TISSCA logo and company details
 */
function drawHeader(doc: PDFKit.PDFDocument, business: any) {
  // TISSCA Branding
  doc.fontSize(28).font('Helvetica-Bold').fillColor('#1e40af').text('TISSCA', 40, 40);

  // Company details
  const companyX = 40;
  const companyY = 75;
  doc.fontSize(10).font('Helvetica').fillColor('#666666');

  if (business?.company_name) {
    doc.text(business.company_name, companyX, companyY);
  }
  if (business?.phone) {
    doc.text(`Tel: ${business.phone}`, companyX, companyY + 16);
  }
  if (business?.email) {
    doc.text(`Email: ${business.email}`, companyX, companyY + 32);
  }
  if (business?.website) {
    doc.text(`Web: ${business.website}`, companyX, companyY + 48);
  }

  // Divider line
  doc.moveTo(40, 145).lineTo(555, 145).stroke('#cccccc');
}

/**
 * Draw quote info section (quote number, date, status)
 */
function drawQuoteInfo(doc: PDFKit.PDFDocument, quote: Quote) {
  const y = 165;

  doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text('QUOTATION', 40, y);

  // Quote details in two columns
  const leftX = 40;
  const rightX = 330;
  const detailY = y + 30;
  const lineHeight = 18;

  doc.fontSize(10).font('Helvetica').fillColor('#666666');

  // Left column
  doc.text('Quote Number:', leftX, detailY);
  doc.font('Helvetica-Bold').fillColor('#000000').text(quote.quote_number, leftX + 110, detailY);

  doc.font('Helvetica').fillColor('#666666').text('Status:', leftX, detailY + lineHeight);
  const statusColor = getStatusColor(quote.status);
  doc.font('Helvetica-Bold').fillColor(statusColor).text(
    quote.status.toUpperCase(),
    leftX + 110,
    detailY + lineHeight
  );

  // Right column
  doc.font('Helvetica').fillColor('#666666').text('Date:', rightX, detailY);
  const createdDate = new Date(quote.created_at).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.font('Helvetica-Bold').fillColor('#000000').text(createdDate, rightX + 60, detailY);

  if (quote.valid_until) {
    doc.font('Helvetica').fillColor('#666666').text('Valid Until:', rightX, detailY + lineHeight);
    const validDate = new Date(quote.valid_until).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.font('Helvetica-Bold').fillColor('#000000').text(validDate, rightX + 60, detailY + lineHeight);
  }
}

/**
 * Draw client information section
 */
function drawClientInfo(doc: PDFKit.PDFDocument, client: Client) {
  const y = 250;

  doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text('BILL TO:', 40, y);

  doc.fontSize(10).font('Helvetica').fillColor('#333333');
  const clientY = y + 20;
  const lineHeight = 16;

  doc.text(client.name, 40, clientY);

  if (client.company_name) {
    doc.text(client.company_name, 40, clientY + lineHeight);
  }

  let addressY = clientY + (client.company_name ? lineHeight * 2 : lineHeight);

  if (client.address_line_1) {
    doc.text(client.address_line_1, 40, addressY);
    addressY += lineHeight;
  }
  if (client.address_line_2) {
    doc.text(client.address_line_2, 40, addressY);
    addressY += lineHeight;
  }

  let cityLine = '';
  if (client.city) cityLine += client.city;
  if (client.postcode) cityLine += ` ${client.postcode}`;
  if (cityLine) {
    doc.text(cityLine, 40, addressY);
    addressY += lineHeight;
  }

  if (client.phone) {
    doc.text(`Phone: ${client.phone}`, 40, addressY);
    addressY += lineHeight;
  }
  if (client.email) {
    doc.text(`Email: ${client.email}`, 40, addressY);
  }
}

/**
 * Draw line items table
 */
function drawLineItems(
  doc: PDFKit.PDFDocument,
  items: QuoteItem[],
  _quote: Quote
) {
  const y = 350;
  const tableTop = y;
  const col1 = 40; // Description
  const col2 = 420; // Qty
  const col3 = 460; // Unit Price
  const col4 = 530; // Total

  // Table header
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff').rect(col1 - 5, tableTop, 520, 20).fill('#1e40af');

  doc.text('Description', col1, tableTop + 5);
  doc.text('Qty', col2, tableTop + 5, { width: 30, align: 'right' });
  doc.text('Unit Price', col3, tableTop + 5, { width: 50, align: 'right' });
  doc.text('Total', col4, tableTop + 5, { width: 60, align: 'right' });

  // Table rows
  let rowY = tableTop + 25;
  const rowHeight = 35;

  doc.font('Helvetica').fillColor('#333333').fontSize(9);

  items.forEach((item, index) => {
    // Alternate row background
    if (index % 2 === 0) {
      doc.rect(col1 - 5, rowY - 5, 520, rowHeight).fill('#f9fafb');
    }

    // Description (wrapped text)
    const description = item.custom_description || 'Custom Item';
    const descOptions = { width: 370, align: 'left' as const };

    doc.fillColor('#333333').text(description, col1, rowY, descOptions);

    // Quantity
    doc.text(item.quantity.toFixed(2), col2, rowY, { width: 30, align: 'right' });

    // Unit price
    doc.text(`£${item.unit_price.toFixed(2)}`, col3, rowY, { width: 50, align: 'right' });

    // Line total
    const lineTotal = item.quantity * item.unit_price;
    doc.text(`£${lineTotal.toFixed(2)}`, col4, rowY, { width: 60, align: 'right' });

    rowY += rowHeight;
  });

  // Table border
  doc.strokeColor('#cccccc').lineWidth(1).rect(col1 - 5, tableTop, 520, rowY - tableTop).stroke();
}

/**
 * Draw totals section with VAT breakdown
 */
function drawTotalsSection(
  doc: PDFKit.PDFDocument,
  items: QuoteItem[],
  quote: Quote
) {
  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const vatRate = quote.vat_rate || 20;
  const vat = subtotal * (vatRate / 100);
  const total = subtotal + vat;

  const y = 570;
  const labelX = 420;
  const valueX = 530;
  const lineHeight = 18;

  doc.fontSize(10).font('Helvetica').fillColor('#666666');

  // Subtotal
  doc.text('Subtotal:', labelX, y);
  doc.font('Helvetica-Bold').fillColor('#333333').text(`£${subtotal.toFixed(2)}`, valueX, y, { width: 60, align: 'right' });

  // VAT
  doc.font('Helvetica').fillColor('#666666').text(`VAT (${vatRate}%):`, labelX, y + lineHeight);
  doc.font('Helvetica-Bold').fillColor('#333333').text(`£${vat.toFixed(2)}`, valueX, y + lineHeight, {
    width: 60,
    align: 'right',
  });

  // Total (highlighted)
  doc
    .rect(labelX - 10, y + lineHeight * 2 - 5, 150, 25)
    .fill('#1e40af');

  doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff').text('TOTAL:', labelX, y + lineHeight * 2 + 2);
  doc.text(`£${total.toFixed(2)}`, valueX, y + lineHeight * 2 + 2, { width: 60, align: 'right' });

  // Deposit info (if applicable)
  if (quote.deposit_type !== 'none' && quote.deposit_value) {
    doc.fontSize(9).font('Helvetica').fillColor('#666666');
    const depositAmount = quote.deposit_type === 'percentage'
      ? total * (quote.deposit_value / 100)
      : quote.deposit_value;

    doc.text(`Deposit (${quote.deposit_type === 'percentage' ? quote.deposit_value + '%' : '£' + quote.deposit_value.toFixed(2)}):`, labelX, y + lineHeight * 4);
    doc.fillColor('#1e40af').text(`£${depositAmount.toFixed(2)}`, valueX, y + lineHeight * 4, {
      width: 60,
      align: 'right',
    });
  }
}

/**
 * Draw terms and conditions section
 */
function drawTermsSection(
  doc: PDFKit.PDFDocument,
  quote: Quote,
  _business: any
) {
  let y = 700;

  // Notes/Description
  if (quote.notes || quote.title) {
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('Notes:', 40, y);

    doc.fontSize(9).font('Helvetica').fillColor('#333333');
    const notesText = quote.notes || quote.title || 'No additional notes';
    const notesHeight = doc.heightOfString(notesText, { width: 500 });

    doc.text(notesText, 40, y + 15, { width: 500 });
    y += notesHeight + 25;
  }

  // Terms & Conditions
  if (quote.terms_and_conditions) {
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('Terms & Conditions:', 40, y);

    doc.fontSize(8).font('Helvetica').fillColor('#666666');
    doc.text(quote.terms_and_conditions, 40, y + 15, { width: 500 });
  }
}

/**
 * Draw footer on every page
 */
function drawFooter(doc: PDFKit.PDFDocument, totalPages: number, pageNum: number) {
  const footerY = doc.page.height - 30;

  doc.fontSize(8).font('Helvetica').fillColor('#999999');

  // Page numbers
  if (totalPages > 1) {
    doc.text(`Page ${pageNum} of ${totalPages}`, 40, footerY, { align: 'left' });
  }

  // Generated info
  const generatedDate = new Date().toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  doc.text(`Generated ${generatedDate}`, 400, footerY, { align: 'right' });
}

/**
 * Get color code for quote status
 */
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: '#6b7280',
    sent: '#3b82f6',
    accepted: '#10b981',
    rejected: '#ef4444',
    expired: '#f97316',
  };
  return colors[status] || '#6b7280';
}
