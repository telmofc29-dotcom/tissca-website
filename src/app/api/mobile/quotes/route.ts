/**
 * Mobile API: Quote Generation
 * =============================
 * POST /api/mobile/quotes - Generate a new quote
 * GET /api/mobile/quotes/:id - Fetch a quote
 * PUT /api/mobile/quotes/:id - Update a draft quote
 *
 * Used by: iOS App, Android App, Web
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateDocument, validateDocument } from '@/services/documents';
import type { DocumentData } from '@/services/documents';

// In-memory store (replace with database in production)
const quoteStore = new Map<string, DocumentData>();

/**
 * POST /api/mobile/quotes
 * Generate a new quote
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
      paymentTerms,
    } = body;

    // Validate required fields
    if (!businessInfo?.name || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: businessInfo.name, lineItems array' },
        { status: 400 }
      );
    }

    // Generate document
    const quote = generateDocument('quote', businessInfo, clientInfo || {}, lineItems, vatRate, notes, terms, paymentTerms);

    // Validate
    const validation = validateDocument(quote);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    // Store
    quoteStore.set(quote.number, quote);

    return NextResponse.json({
      success: true,
      quote: {
        id: quote.number,
        number: quote.number,
        date: quote.date,
        validUntil: quote.validUntil,
        total: quote.total,
        clientName: quote.client?.name || 'Unnamed Client',
      },
    });
  } catch (error) {
    console.error('Quote API error:', error);
    return NextResponse.json({ error: 'Failed to generate quote' }, { status: 500 });
  }
}

/**
 * GET /api/mobile/quotes/:id
 * Fetch a quote by ID
 */
export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Quote ID is required' }, { status: 400 });
    }

    const quote = quoteStore.get(id);
    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, quote });
  } catch (error) {
    console.error('Quote API error:', error);
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 });
  }
}

/**
 * PUT /api/mobile/quotes/:id
 * Update a draft quote
 */
export async function PUT(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Quote ID is required' }, { status: 400 });
    }

    const quote = quoteStore.get(id);
    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const updates = await request.json();

    // Update quote
    const updated = {
      ...quote,
      ...updates,
      number: quote.number, // Never update number
      date: quote.date, // Never update creation date
    };

    // Re-validate
    const validation = validateDocument(updated);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    quoteStore.set(id, updated);

    return NextResponse.json({
      success: true,
      quote: {
        id: updated.number,
        number: updated.number,
        total: updated.total,
      },
    });
  } catch (error) {
    console.error('Quote API error:', error);
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
  }
}
