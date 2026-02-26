import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import PDFDocument from 'pdfkit';
import { Invoice, InvoiceItem } from '@/types/invoices';
import { Client } from '@/types/quotes';
import { calculateInvoiceTotals } from '@/lib/invoiceCalculations';

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

    // Fetch business details
    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', invoice.business_id)
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

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF({
      invoice: invoice as Invoice,
      client: client as Client,
      business: business as any,
      items: items as InvoiceItem[],
      payments: payments || [],
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
 * Generate branded PDF document for an invoice
 */
async function generateInvoicePDF(data: {
  invoice: Invoice;
  client: Client;
  business: any;
  items: InvoiceItem[];
  payments: any[];
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const { invoice, client, business, items, payments } = data;
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
      drawInvoiceInfo(doc, invoice);
      drawClientInfo(doc, client);
      drawLineItems(doc, items, invoice);
      drawPaymentSection(doc, items, invoice, payments);
      drawPaymentInstructions(doc, business);
      drawTermsSection(doc, invoice, business);

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
 * Draw invoice info section (invoice number, dates, status)
 */
function drawInvoiceInfo(doc: PDFKit.PDFDocument, invoice: Invoice) {
  const y = 165;

  doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text('INVOICE', 40, y);

  // Invoice details in two columns
  const leftX = 40;
  const rightX = 330;
  const detailY = y + 30;
  const lineHeight = 18;

  doc.fontSize(10).font('Helvetica').fillColor('#666666');

  // Left column
  doc.text('Invoice Number:', leftX, detailY);
  doc.font('Helvetica-Bold').fillColor('#000000').text(invoice.invoice_number, leftX + 110, detailY);

  doc.font('Helvetica').fillColor('#666666').text('Status:', leftX, detailY + lineHeight);
  const statusColor = getStatusColor(invoice.status);
  doc.font('Helvetica-Bold').fillColor(statusColor).text(
    invoice.status.toUpperCase(),
    leftX + 110,
    detailY + lineHeight
  );

  // Right column
  doc.font('Helvetica').fillColor('#666666').text('Issue Date:', rightX, detailY);
  const issueDate = new Date(invoice.issue_date).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.font('Helvetica-Bold').fillColor('#000000').text(issueDate, rightX + 70, detailY);

  doc.font('Helvetica').fillColor('#666666').text('Due Date:', rightX, detailY + lineHeight);
  const dueDate = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Not set';
  doc.font('Helvetica-Bold').fillColor('#000000').text(dueDate, rightX + 70, detailY + lineHeight);
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
  items: InvoiceItem[],
  _invoice: Invoice
) {
  const y = 350;
  const tableTop = y;
  const col1 = 40; // Description
  const col2 = 400; // Qty
  const col3 = 440; // Unit Price
  const col4 = 490; // VAT%
  const col5 = 530; // Total

  // Table header
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff').rect(col1 - 5, tableTop, 520, 20).fill('#1e40af');

  doc.text('Description', col1, tableTop + 5);
  doc.text('Qty', col2, tableTop + 5, { width: 30, align: 'right' });
  doc.text('Unit Price', col3, tableTop + 5, { width: 40, align: 'right' });
  doc.text('VAT %', col4, tableTop + 5, { width: 30, align: 'right' });
  doc.text('Total', col5, tableTop + 5, { width: 50, align: 'right' });

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
    const description = item.description || 'Line Item';
    const descOptions = { width: 350, align: 'left' as const };

    doc.fillColor('#333333').text(description, col1, rowY, descOptions);

    // Quantity
    doc.text(item.qty.toFixed(2), col2, rowY, { width: 30, align: 'right' });

    // Unit price
    doc.text(`£${item.unit_price.toFixed(2)}`, col3, rowY, { width: 40, align: 'right' });

    // VAT rate
    doc.text(`${item.vat_rate}%`, col4, rowY, { width: 30, align: 'right' });

    // Line total (includes VAT)
    const subtotal = item.qty * item.unit_price;
    const vat = subtotal * (item.vat_rate / 100);
    const lineTotal = subtotal + vat;
    doc.text(`£${lineTotal.toFixed(2)}`, col5, rowY, { width: 50, align: 'right' });

    rowY += rowHeight;
  });

  // Table border
  doc.strokeColor('#cccccc').lineWidth(1).rect(col1 - 5, tableTop, 520, rowY - tableTop).stroke();
}

/**
 * Draw payment section with totals and payment status
 */
function drawPaymentSection(
  doc: PDFKit.PDFDocument,
  items: InvoiceItem[],
  invoice: Invoice,
  payments: any[]
) {
  // Calculate totals
  const totals = calculateInvoiceTotals(
    items.map(i => ({
      qty: i.qty,
      unit_price: i.unit_price,
      vat_rate: i.vat_rate,
    }))
  );

  const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = totals.total - amountPaid;

  const y = 570;
  const labelX = 420;
  const valueX = 530;
  const lineHeight = 18;

  doc.fontSize(10).font('Helvetica').fillColor('#666666');

  // Subtotal
  doc.text('Subtotal:', labelX, y);
  doc.font('Helvetica-Bold').fillColor('#333333').text(`£${totals.subtotal.toFixed(2)}`, valueX, y, {
    width: 50,
    align: 'right',
  });

  // VAT
  doc.font('Helvetica').fillColor('#666666').text('VAT:', labelX, y + lineHeight);
  doc.font('Helvetica-Bold').fillColor('#333333').text(`£${totals.vat_total.toFixed(2)}`, valueX, y + lineHeight, {
    width: 50,
    align: 'right',
  });

  // Total (highlighted)
  doc.rect(labelX - 10, y + lineHeight * 2 - 5, 130, 25).fill('#1e40af');

  doc.fontSize(12).font('Helvetica-Bold').fillColor('#ffffff').text('TOTAL:', labelX, y + lineHeight * 2 + 2);
  doc.text(`£${totals.total.toFixed(2)}`, valueX, y + lineHeight * 2 + 2, { width: 50, align: 'right' });

  // Payment tracking
  if (amountPaid > 0 || invoice.status !== 'draft') {
    doc.fontSize(9).font('Helvetica').fillColor('#666666');

    doc.text('Amount Paid:', labelX, y + lineHeight * 4);
    doc.font('Helvetica-Bold').fillColor('#10b981').text(`£${amountPaid.toFixed(2)}`, valueX, y + lineHeight * 4, {
      width: 50,
      align: 'right',
    });

    doc.font('Helvetica').fillColor('#666666').text('Balance Due:', labelX, y + lineHeight * 5);
    const balanceColor = balanceDue <= 0 ? '#10b981' : '#ef4444';
    doc.font('Helvetica-Bold').fillColor(balanceColor).text(`£${Math.max(0, balanceDue).toFixed(2)}`, valueX, y + lineHeight * 5, {
      width: 50,
      align: 'right',
    });
  }
}

/**
 * Draw payment instructions section
 */
function drawPaymentInstructions(doc: PDFKit.PDFDocument, business: any) {
  let y = 680;

  doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('PAYMENT INSTRUCTIONS:', 40, y);

  doc.fontSize(9).font('Helvetica').fillColor('#333333');

  const instructions = [
    'Bank Transfer:',
    `  Account Name: ${business?.company_name || '[Your Company Name]'}`,
    '  Sort Code: [00-00-00]',
    '  Account Number: [00000000]',
    '  Reference: Use invoice number as reference',
    '',
    'Payment Methods Accepted:',
    '  • Bank Transfer (preferred)',
    '  • Cash on Collection',
    '  • Card Payment (contact us for details)',
  ];

  instructions.forEach((line, index) => {
    if (line.includes('Bank Transfer:') || line.includes('Payment Methods Accepted:')) {
      doc.font('Helvetica-Bold').fillColor('#000000');
    } else if (line === '') {
      // Empty line for spacing
    } else {
      doc.font('Helvetica').fillColor('#333333');
    }

    if (line !== '') {
      doc.text(line, 40, y + 15 + index * 12);
    }
  });
}

/**
 * Draw terms and conditions section
 */
function drawTermsSection(
  doc: PDFKit.PDFDocument,
  invoice: Invoice,
  _business: any
) {
  let y = doc.y + 20;

  // Notes/Description
  if (invoice.notes) {
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('Notes:', 40, y);

    doc.fontSize(9).font('Helvetica').fillColor('#333333');
    const notesHeight = doc.heightOfString(invoice.notes, { width: 500 });

    doc.text(invoice.notes, 40, y + 15, { width: 500 });
    y += notesHeight + 25;
  }

  // Terms & Conditions
  if (invoice.terms) {
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000').text('Terms & Conditions:', 40, y);

    doc.fontSize(8).font('Helvetica').fillColor('#666666');
    doc.text(invoice.terms, 40, y + 15, { width: 500 });
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
 * Get color code for invoice status
 */
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: '#6b7280',
    sent: '#3b82f6',
    partially_paid: '#f59e0b',
    paid: '#10b981',
    overdue: '#ef4444',
    cancelled: '#6b7280',
  };
  return colors[status] || '#6b7280';
}
