// src/app/api/workspace/documents/[id]/pdf/route.ts v1.0
//
// GET /api/workspace/documents/:id/pdf
//
// PURPOSE:
// Generate a PDF for any document in the public.documents table.
// This handles Android-created quotes/invoices that live in documents
// (not in the website-native quotes/invoices tables).
//
// AUTHENTICATION: Bearer token → resolveUserFromToken
// AUTHORISATION:  Document must belong to the resolved workspace.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { createServerSupabaseClient } from '@/lib/supabase';
import { resolveUserFromToken, type DocumentRow, type DocumentItemJson } from '@/lib/workspace-data';
import { formatCurrency as fmtCur } from '@/lib/currency';
import {
  loadPdfIdentity,
  drawBrandedHeader,
  drawInfoBox,
  drawClientSection,
  drawItemsTable,
  drawTotalsBox,
  drawNotesSection,
  drawFooterBar,
  drawPageNumber,
} from '@/lib/pdf/branding';

function normaliseDocType(type: string | null): 'QUOTE' | 'INVOICE' | 'LAYOUT QUOTATION' {
  const t = String(type || '').toLowerCase();
  if (t.includes('layout')) return 'LAYOUT QUOTATION';
  if (t.includes('invoice') || t.includes('receipt') || t.includes('payment')) return 'INVOICE';
  return 'QUOTE';
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolved = await resolveUserFromToken(token);
  if (!resolved) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('*')
    .eq('id', params.id)
    .maybeSingle<DocumentRow>();

  if (docErr || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // Authorise: document must belong to this workspace
  const workspaceId = resolved.workspaceId ?? resolved.businessId;
  if (doc.workspace_id !== workspaceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Load PDF identity (branding) for this workspace
  const identity = workspaceId ? await loadPdfIdentity(workspaceId) : null;

  const brandColor = identity?.brand_color || '#1e40af';
  const currency = doc.currency ?? null;
  const docTypeLabel = normaliseDocType(doc.type);

  // Build items array, normalising DocumentItemJson → branding table format
  const rawItems: DocumentItemJson[] = Array.isArray(doc.items) ? doc.items : [];
  const items = rawItems.map((it) => ({
    description: it.description ?? '',
    unit: it.unit ?? '',
    qty: Number(it.qty) || 0,
    price: Number(it.price) || 0,
    total: Number(it.total) || 0,
  }));

  // Totals
  const subtotal = doc.subtotal ?? items.reduce((s, i) => s + i.total, 0);
  const vat = doc.vat_amount ?? 0;
  const grand = doc.grand_total ?? subtotal + vat;

  // Build PDF
  const pdfDoc = new PDFDocument({ size: 'A4', margin: 40, autoFirstPage: true });
  const chunks: Buffer[] = [];
  pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));

  // Header
  let y = drawBrandedHeader(pdfDoc, identity, docTypeLabel);

  // Info box (right) + client section (left)
  const infoRows: Array<{ label: string; value: string }> = [];
  if (doc.reference) infoRows.push({ label: 'Reference', value: doc.reference });
  if (doc.date) infoRows.push({ label: 'Date', value: new Date(doc.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) });
  if (doc.status) infoRows.push({ label: 'Status', value: doc.status });
  if (doc.client_email) infoRows.push({ label: 'Email', value: doc.client_email });
  if (doc.client_phone) infoRows.push({ label: 'Phone', value: doc.client_phone });
  if (doc.client_ref) infoRows.push({ label: 'Your Ref', value: doc.client_ref });

  const infoEndY = infoRows.length > 0 ? drawInfoBox(pdfDoc, y, infoRows) : y;

  drawClientSection(pdfDoc, y, {
    name: doc.client_name ?? undefined,
    address: doc.client_address ?? undefined,
    phone: doc.client_phone ?? undefined,
    email: doc.client_email ?? undefined,
  });

  y = Math.max(infoEndY, y + 80) + 16;

  // Header notes
  if (doc.header_notes) {
    pdfDoc.fontSize(9).font('Helvetica').fillColor('#555555')
      .text(doc.header_notes, 40, y, { width: 515 });
    y += pdfDoc.heightOfString(doc.header_notes, { width: 515 }) + 12;
  }

  // Items table
  if (items.length > 0) {
    y = drawItemsTable(pdfDoc, y, items, brandColor, currency);
    y += 12;
  }

  // Totals box
  const totalRows: Array<{ label: string; value: string; bold?: boolean }> = [
    { label: 'Subtotal', value: fmtCur(subtotal, currency) },
  ];
  if (vat > 0) {
    totalRows.push({ label: 'VAT', value: fmtCur(vat, currency) });
  }
  totalRows.push({ label: 'Total', value: fmtCur(grand, currency), bold: true });
  y = drawTotalsBox(pdfDoc, y, totalRows);

  // Footer notes
  if (doc.footer_notes) {
    y = drawNotesSection(pdfDoc, y, doc.footer_notes);
  }

  drawFooterBar(pdfDoc, identity);
  drawPageNumber(pdfDoc, 1, 1);

  pdfDoc.end();

  return new Promise<NextResponse>((resolve) => {
    pdfDoc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const filename = doc.reference
        ? `${doc.reference.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
        : `document-${doc.id}.pdf`;

      resolve(
        new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${filename}"`,
            'Content-Length': String(buffer.byteLength),
            'Cache-Control': 'no-store',
          },
        }),
      );
    });
  });
}
