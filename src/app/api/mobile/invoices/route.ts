/**
 * Mobile API: Invoice Generation
 * ==============================
 * POST /api/mobile/invoices - Generate a new invoice
 * GET /api/mobile/invoices/:id - Fetch an invoice
 * PUT /api/mobile/invoices/:id - Update invoice details
 *
 * Used by: iOS App, Android App, Web
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateDocument, validateDocument } from '@/services/documents';
import type { DocumentData } from '@/services/documents';

// In-memory store (replace with database in production)
const invoiceStore = new Map<string, DocumentData>();

/**
 * POST /api/mobile/invoices
 * Generate a new invoice
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      businessInfo,
      clientInfo,
      lineItems,
      vatRate = 20,
      notes,
      terms,
      paymentTerms = 30,
    } = body;

    // Validate required fields
    if (!businessInfo?.name || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: businessInfo.name, lineItems array' },
        { status: 400 }
      );
    }

    if (!clientInfo?.name) {
      return NextResponse.json(
        { error: 'Missing required field: clientInfo.name (client name is required for invoices)' },
        { status: 400 }
      );
    }

    // Generate document
    const invoice = generateDocument(
      'invoice',
      businessInfo,
      clientInfo,
      lineItems,
      vatRate,
      notes,
      terms,
      paymentTerms
    );

    // Validate
    const validation = validateDocument(invoice);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    // Store
    invoiceStore.set(invoice.number, invoice);

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.number,
        number: invoice.number,
        date: invoice.date,
        dueDate: invoice.dueDate,
        total: invoice.total,
        clientName: invoice.client?.name || 'Unknown',
      },
    });
  } catch (error) {
    console.error('Invoice API error:', error);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}

/**
 * GET /api/mobile/invoices/:id
 * Fetch an invoice by ID
 */
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    const invoice = invoiceStore.get(id);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    console.error('Invoice API error:', error);
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}

/**
 * PUT /api/mobile/invoices/:id
 * Update invoice details (e.g., payment status, notes)
 */
export async function PUT(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    const invoice = invoiceStore.get(id);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const updates = await request.json();

    // Update invoice (preserve number, date, client)
    const updated = {
      ...invoice,
      ...updates,
      number: invoice.number,
      date: invoice.date,
      client: invoice.client,
    };

    // Re-validate
    const validation = validateDocument(updated);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    invoiceStore.set(id, updated);

    return NextResponse.json({
      success: true,
      invoice: {
        id: updated.number,
        number: updated.number,
        total: updated.total,
        notes: updated.notes,
      },
    });
  } catch (error) {
    console.error('Invoice API error:', error);
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}
