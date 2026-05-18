/**
 * scripts/test-pdf-visual.mjs
 *
 * Standalone PDF generation test — mirrors branding.ts + route.ts logic exactly.
 * Generates all 10 verification cases to /tmp/tissca-pdfs/
 *
 * Run: node scripts/test-pdf-visual.mjs
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = '/tmp/tissca-pdfs';
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Constants (mirror branding.ts) ───────────────────────────────────────────
const PAGE_W    = 595.28;
const MARGIN    = 40;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const FOOTER_RESERVED = 110;

// ── Logo: use the TISSCA SVG-less placeholder (we generate a tiny PNG inline) ─
// A 120×55 orange placeholder rectangle as a PNG buffer
function makeLogoBuffer() {
  // Read actual logo from project if available
  const candidates = [
    path.join(__dirname, '../public/icons/icon-192x192.png'),
    path.join(__dirname, '../public/images/logo.png'),
    path.join(__dirname, '../public/tissca-logo.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p);
  }
  return null; // no logo file found — test without
}

const LOGO_BUFFER = makeLogoBuffer();

// ── Currency formatter ────────────────────────────────────────────────────────
function fmtCur(amount, code) {
  const symbol = code === 'USD' ? '$' : '£';
  return `${symbol}${Number(amount).toFixed(2)}`;
}

// ── Drawing functions (verbatim port of branding.ts) ──────────────────────────

function drawBrandedHeader(doc, identity, docType) {
  let y = 30;

  if (identity?._logoBuffer) {
    try {
      doc.image(identity._logoBuffer, MARGIN, y, { height: 55 });
    } catch {
      doc.fontSize(18).font('Helvetica-Bold').fillColor(identity?.brand_color || '#1e40af')
        .text(identity?.company_name || 'TISSCA', MARGIN, y + 10, { lineBreak: false });
    }
  } else if (identity?.company_name) {
    doc.fontSize(18).font('Helvetica-Bold').fillColor(identity.brand_color || '#1e40af')
      .text(identity.company_name, MARGIN, y + 10, { lineBreak: false });
  } else {
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1e40af')
      .text('TISSCA', MARGIN, y + 10, { lineBreak: false });
  }

  doc.fontSize(22).font('Helvetica-Bold').fillColor('#111111')
    .text(docType, MARGIN, y + 5, { width: CONTENT_W, align: 'right', lineBreak: false });

  y += 55;

  if (identity?._logoBuffer && identity?.company_name) {
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333')
      .text(identity.company_name.toUpperCase(), MARGIN, y, { lineBreak: false });
    y += 16;
  }
  if (identity?.tagline) {
    doc.fontSize(8).font('Helvetica').fillColor('#999999')
      .text(identity.tagline, MARGIN, y, { lineBreak: false });
    y += 14;
  }

  y += 8;

  doc.save();
  doc.moveTo(MARGIN, y).lineTo(PAGE_W - MARGIN, y)
    .strokeColor(identity?.brand_color || '#dddddd').lineWidth(1.5).stroke();
  doc.restore();
  y += 12;

  return y;
}

function drawInfoBox(doc, y, rows) {
  const boxX   = 320;
  const boxW   = PAGE_W - MARGIN - boxX;
  const rowH   = 16;
  const padding = 8;
  const boxH   = padding * 2 + rows.length * rowH;

  doc.rect(boxX, y, boxW, boxH).stroke('#cccccc');

  let rowY = y + padding;
  for (const row of rows) {
    doc.fontSize(8).font('Helvetica').fillColor('#666666')
      .text(row.label, boxX + padding, rowY, { width: 100, lineBreak: false });
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#111111')
      .text(row.value || '—', boxX + padding + 100, rowY,
        { width: boxW - padding * 2 - 100, align: 'right', lineBreak: false });
    rowY += rowH;
  }

  return y + boxH + 10;
}

function drawClientSection(doc, y, client) {
  const COL_W = 260;
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#666666')
    .text('To', MARGIN, y, { lineBreak: false });
  let cy = y + 14;
  doc.fontSize(10).font('Helvetica').fillColor('#111111');
  if (client.name)    { doc.text(client.name,    MARGIN, cy, { width: COL_W, lineBreak: false }); cy += 14; }
  if (client.company) { doc.text(client.company, MARGIN, cy, { width: COL_W, lineBreak: false }); cy += 14; }
  if (client.address) {
    for (const line of client.address.split('\n')) {
      if (line.trim()) { doc.text(line.trim(), MARGIN, cy, { width: COL_W, lineBreak: false }); cy += 14; }
    }
  }
  if (client.phone) { doc.text(client.phone, MARGIN, cy, { width: COL_W, lineBreak: false }); cy += 14; }
  if (client.email) { doc.text(client.email, MARGIN, cy, { width: COL_W, lineBreak: false }); }
}

function drawItemsTable(doc, startY, items, brandColor, currencyCode, opts) {
  const col1   = MARGIN;
  const col2   = 280;
  const col3   = 340;
  const col4   = 400;
  const colEnd = PAGE_W - MARGIN;
  const headerH = 22;
  const rowH    = 26;

  let y = startY;
  let pageStartY = startY;

  function drawTableHeader(atY) {
    doc.rect(col1, atY, CONTENT_W, headerH).fill(brandColor || '#1e40af');
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    doc.text('Description',  col1 + 8,    atY + 7, { lineBreak: false });
    doc.text('Unit',         col2,        atY + 7, { width: 50, align: 'center', lineBreak: false });
    doc.text('Qty',          col3,        atY + 7, { width: 50, align: 'center', lineBreak: false });
    doc.text('Price',        col4,        atY + 7, { width: 60, align: 'right',  lineBreak: false });
    doc.text('Total',        colEnd - 70, atY + 7, { width: 60, align: 'right',  lineBreak: false });
    doc.moveTo(col1, atY).lineTo(colEnd, atY).strokeColor('#dddddd').lineWidth(0.5).stroke();
    doc.moveTo(col1, atY + headerH).lineTo(colEnd, atY + headerH).strokeColor('#dddddd').lineWidth(0.5).stroke();
    doc.fillColor('#222222');
    return atY + headerH;
  }

  y = drawTableHeader(y);

  for (const item of items) {
    const safeBottom = doc.page.height - 110;

    if (y + rowH > safeBottom) {
      doc.rect(col1, pageStartY, CONTENT_W, y - pageStartY)
        .strokeColor('#dddddd').lineWidth(0.5).stroke();
      opts?.onBeforePageBreak?.();
      doc.addPage();
      y = MARGIN;
      pageStartY = y;
      y = drawTableHeader(y);
    }

    doc.moveTo(col1, y + rowH).lineTo(colEnd, y + rowH)
      .strokeColor('#eeeeee').lineWidth(0.5).stroke();

    const qtyDisplay = Number.isInteger(item.qty) ? String(item.qty) : item.qty.toFixed(2);

    doc.fontSize(9).font('Helvetica').fillColor('#222222')
      .text(item.description, col1 + 8, y + 7, { width: col2 - col1 - 16, lineBreak: false });
    doc.fontSize(9).font('Helvetica').fillColor('#666666')
      .text(item.unit || '', col2, y + 7, { width: 50, align: 'center', lineBreak: false });
    doc.fontSize(9).font('Helvetica').fillColor('#666666')
      .text(qtyDisplay, col3, y + 7, { width: 50, align: 'center', lineBreak: false });
    doc.fontSize(9).font('Helvetica').fillColor('#666666')
      .text(fmtCur(item.price, currencyCode), col4, y + 7, { width: 60, align: 'right', lineBreak: false });
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#111111')
      .text(fmtCur(item.total, currencyCode), colEnd - 70, y + 7, { width: 60, align: 'right', lineBreak: false });

    y += rowH;
  }

  doc.rect(col1, pageStartY, CONTENT_W, y - pageStartY)
    .strokeColor('#dddddd').lineWidth(0.5).stroke();

  return y;
}

function drawTotalsBox(doc, y, rows) {
  const boxX = 380;
  const boxW = PAGE_W - MARGIN - boxX;
  const rowH = 18;
  const padY = 6;

  doc.rect(boxX, y, boxW, padY * 2 + rows.length * rowH).stroke('#cccccc');

  let rowY = y + padY;
  for (const row of rows) {
    const font     = row.bold ? 'Helvetica-Bold' : 'Helvetica';
    const fontSize = row.bold ? 10 : 9;
    if (row.bold) {
      doc.moveTo(boxX, rowY - 2).lineTo(boxX + boxW, rowY - 2)
        .strokeColor('#cccccc').lineWidth(0.5).stroke();
    }
    doc.fontSize(fontSize).font(font).fillColor('#333333')
      .text(row.label, boxX + 8, rowY, { lineBreak: false });
    doc.fontSize(fontSize).font(font).fillColor('#333333')
      .text(row.value, boxX + 8, rowY, { width: boxW - 16, align: 'right', lineBreak: false });
    rowY += rowH;
  }

  return y + padY * 2 + rows.length * rowH + 10;
}

function notesBoxHeight(doc, notes) {
  if (!notes) return 0;
  const padX = 10, padY = 8;
  const textH = doc.heightOfString(notes, { width: CONTENT_W - padX * 2 });
  return padY + 16 + textH + padY + 16;
}

function drawNotesSection(doc, y, notes) {
  if (!notes) return y;
  const padX = 10, padY = 8;
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#cc8800')
    .text('NOTES', MARGIN + padX, y + padY, { lineBreak: false });
  const textY = y + padY + 16;
  doc.fontSize(9).font('Helvetica').fillColor('#333333')
    .text(notes, MARGIN + padX, textY, { width: CONTENT_W - padX * 2 });
  const textH = doc.heightOfString(notes, { width: CONTENT_W - padX * 2 });
  const boxH = padY + 16 + textH + padY;
  doc.rect(MARGIN, y, CONTENT_W, boxH).strokeColor('#e5e5e5').lineWidth(0.5).stroke();
  return y + boxH + 16;
}

function drawFooterBar(doc, identity) {
  const contactLines = [
    identity?.contact_name,
    identity?.trading_name || identity?.company_name,
    identity?.address_line_1,
    identity?.address_line_2 || null,
    [identity?.city, identity?.postcode].filter(Boolean).join('  ') || null,
    identity?.email,
    identity?.phone,
  ].filter(Boolean);

  const paymentLines = [
    identity?.account_name  ? `Account Name: ${identity.account_name}`  : null,
    identity?.bank_name     ? `Bank: ${identity.bank_name}`              : null,
    identity?.sort_code     ? `Sort Code: ${identity.sort_code}`         : null,
    identity?.account_number? `Account: ${identity.account_number}`      : null,
    identity?.iban          ? `IBAN: ${identity.iban}`                   : null,
    identity?.swift_bic     ? `SWIFT/BIC: ${identity.swift_bic}`         : null,
    identity?.routing_number? `Routing: ${identity.routing_number}`      : null,
  ].filter(Boolean);

  const LINE_H  = 9;
  const maxLines = Math.max(contactLines.length, paymentLines.length);
  const barH    = Math.max(70, 8 + 12 + maxLines * LINE_H + 8);
  const footerY = doc.page.height - barH - 10;
  const halfW   = CONTENT_W / 2;

  doc.rect(MARGIN, footerY, CONTENT_W, barH).fill('#f8f8f8');
  doc.moveTo(MARGIN, footerY).lineTo(PAGE_W - MARGIN, footerY)
    .strokeColor('#dddddd').lineWidth(0.5).stroke();

  let ly = footerY + 8;
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#333333')
    .text('Contact Details', MARGIN + 10, ly, { lineBreak: false });
  ly += 12;
  doc.fontSize(7).font('Helvetica').fillColor('#555555');
  for (const line of contactLines) {
    doc.text(line, MARGIN + 10, ly, { width: halfW - 20, lineBreak: false });
    ly += LINE_H;
  }

  let ry = footerY + 8;
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#333333')
    .text('Payment Details', MARGIN + halfW + 10, ry, { lineBreak: false });
  ry += 12;
  doc.fontSize(7).font('Helvetica').fillColor('#555555');
  for (const line of paymentLines) {
    doc.text(line, MARGIN + halfW + 10, ry, { width: halfW - 20, lineBreak: false });
    ry += LINE_H;
  }
}

function drawPageNumber(doc, pageNum) {
  doc.fontSize(7).font('Helvetica').fillColor('#999999')
    .text(`Page ${pageNum}`, MARGIN, doc.page.height - 14,
      { width: CONTENT_W, align: 'right', lineBreak: false });
}

// ── Main PDF builder ──────────────────────────────────────────────────────────

function buildPdf(outPath, { docType, identity, client, infoRows, headerNotes, items, subtotal, vat, grand, footerNotes, currency = 'GBP', vatRate = 20 }) {
  // margin: 0 — with margin: 40, PDFKit's maxY = page.height - 40 = 801. Any doc.text() call
  // with explicit y > 801 (footer zone) triggers a new phantom page. margin: 0 sets maxY = 841.89
  // so footer text (y ≈ 740-835) renders correctly. All drawing uses explicit coordinates.
  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
  const chunks = [];
  doc.on('data', c => chunks.push(c));
  doc.on('end', () => fs.writeFileSync(outPath, Buffer.concat(chunks)));

  const brandColor = identity?.brand_color || '#1e40af';
  let pageNum = 1;

  const safeBottom = () => doc.page.height - FOOTER_RESERVED;

  function drawCurrentPageFooter() {
    drawFooterBar(doc, identity);
    drawPageNumber(doc, pageNum);
  }

  function breakPage() {
    drawCurrentPageFooter();
    doc.addPage();
    pageNum++;
  }

  let y = drawBrandedHeader(doc, identity, docType);

  const infoEndY = infoRows.length > 0 ? drawInfoBox(doc, y, infoRows) : y;
  drawClientSection(doc, y, client);
  y = Math.max(infoEndY, y + 80) + 16;

  if (headerNotes) {
    const h = doc.heightOfString(headerNotes, { width: CONTENT_W }) + 12;
    if (y + h > safeBottom()) { breakPage(); y = MARGIN; }
    doc.fontSize(9).font('Helvetica').fillColor('#555555')
      .text(headerNotes, MARGIN, y, { width: CONTENT_W });
    y += h;
  }

  if (items.length > 0) {
    y = drawItemsTable(doc, y, items, brandColor, currency, {
      onBeforePageBreak: () => { drawCurrentPageFooter(); pageNum++; },
    });
    y += 12;
  }

  const totalRows = [{ label: 'Subtotal', value: fmtCur(subtotal, currency) }];
  if (vat > 0) totalRows.push({ label: `VAT (${vatRate}%)`, value: fmtCur(vat, currency) });
  totalRows.push({ label: 'Total', value: fmtCur(grand, currency), bold: true });

  const totalsH = 6 * 2 + totalRows.length * 18 + 10;
  if (y + totalsH > safeBottom()) { breakPage(); y = MARGIN; }
  y = drawTotalsBox(doc, y, totalRows);

  if (footerNotes) {
    const bh = notesBoxHeight(doc, footerNotes);
    if (y + bh > safeBottom()) { breakPage(); y = MARGIN; }
    y = drawNotesSection(doc, y, footerNotes);
  }

  drawCurrentPageFooter();
  doc.end();
  console.log(`  ✓  ${path.basename(outPath)}`);
}

// ── Test data ─────────────────────────────────────────────────────────────────

const IDENTITY_WITH_LOGO = {
  company_name: 'Carvalho Renovations',
  trading_name: 'CARVALHO RENOVATIONS',
  contact_name: 'TISSCA TESTING',
  address_line_1: '123 example street',
  address_line_2: 'Porto LP1 1E1',
  city: 'United Kingdom',
  postcode: null,
  email: 'tissca@example.com',
  phone: '071234567890',
  bank_name: 'Bank Name',
  account_name: 'Mr Carvalho',
  sort_code: '10-20-30',
  account_number: '12345678',
  iban: null, swift_bic: null, routing_number: null,
  vat_enabled: true, vat_number: '123456789', vat_rate: 20,
  brand_color: '#c8872d',
  tagline: 'Supporting Fine Living',
  company_number: '123456789',
  logo_url: null,
  _logoBuffer: LOGO_BUFFER,
  default_currency: 'GBP',
};

const IDENTITY_NO_LOGO = {
  ...IDENTITY_WITH_LOGO,
  _logoBuffer: null,
};

const CLIENT = {
  name: 'David Taylor',
  address: '9 Birch Lane\nLeighton Buzzard\nLU7 3RL',
};

function infoRowsFor(ref, date, email, phone, clientRef, identity) {
  const rows = [];
  if (date)      rows.push({ label: 'Date',                value: date });
  if (ref)       rows.push({ label: 'Ref No',              value: ref });
  rows.push(      { label: 'Client Ref',            value: clientRef || '' });
  if (email)     rows.push({ label: 'Email',               value: email });
  if (phone)     rows.push({ label: 'Client Phone Number', value: phone });
  if (identity?.company_number) rows.push({ label: 'Company No', value: identity.company_number });
  if (identity?.vat_number)     rows.push({ label: 'VAT No',     value: identity.vat_number });
  return rows;
}

const BASE_ITEMS = [
  { description: 'Bedroom 1 (vinyl / Lvt)', unit: 'sqm', qty: 19.44, price: 26,    total: 505.44 },
  { description: 'Kids Room (vinyl / Lvt)',  unit: 'sqm', qty: 12.16, price: 26,    total: 316.16 },
  { description: 'Waste Allowance',          unit: 'Item', qty: 1,    price: 82.16, total: 82.16  },
  { description: 'Door Threshold',           unit: 'Item', qty: 3,    price: 8,     total: 24     },
  { description: 'Scotia / Trim',            unit: 'm',    qty: 20,   price: 1.80,  total: 36     },
  { description: 'Flooring Adhesive',        unit: 'Item', qty: 1,    price: 15,    total: 15     },
  { description: 'Fitting',                  unit: 'sqm',  qty: 31.60, price: 40,   total: 1264   },
];
const SUBTOTAL = BASE_ITEMS.reduce((s, i) => s + i.total, 0);
const VAT_AMT  = Math.round(SUBTOTAL * 0.20 * 100) / 100;
const GRAND    = SUBTOTAL + VAT_AMT;

const DATE_STR  = '18 May 2026';
const EMAIL_STR = 'david.taylor@example.com';
const PHONE_STR = '07123456789';

console.log(`\nGenerating PDFs to ${OUT_DIR}...\n`);

// ── Case 1: Invoice without logo ─────────────────────────────────────────────
buildPdf(`${OUT_DIR}/01-invoice-no-logo.pdf`, {
  docType: 'INVOICE', identity: IDENTITY_NO_LOGO, client: CLIENT,
  infoRows: infoRowsFor('INV-0001', DATE_STR, EMAIL_STR, PHONE_STR, null, IDENTITY_NO_LOGO),
  items: BASE_ITEMS, subtotal: SUBTOTAL, vat: VAT_AMT, grand: GRAND,
  footerNotes: '1 sqm to be delivered 3 days after the first delivery.',
});

// ── Case 2: Invoice with logo ─────────────────────────────────────────────────
buildPdf(`${OUT_DIR}/02-invoice-with-logo.pdf`, {
  docType: 'INVOICE', identity: IDENTITY_WITH_LOGO, client: CLIENT,
  infoRows: infoRowsFor('INV-0001', DATE_STR, EMAIL_STR, PHONE_STR, null, IDENTITY_WITH_LOGO),
  items: BASE_ITEMS, subtotal: SUBTOTAL, vat: VAT_AMT, grand: GRAND,
  footerNotes: '1 sqm to be delivered 3 days after the first delivery.',
});

// ── Case 3: Quote with logo ───────────────────────────────────────────────────
buildPdf(`${OUT_DIR}/03-quote-with-logo.pdf`, {
  docType: 'QUOTE', identity: IDENTITY_WITH_LOGO, client: CLIENT,
  infoRows: infoRowsFor('QUO-0042', DATE_STR, EMAIL_STR, PHONE_STR, 'CR-2026-001', IDENTITY_WITH_LOGO),
  items: BASE_ITEMS, subtotal: SUBTOTAL, vat: VAT_AMT, grand: GRAND,
});

// ── Case 4: Long multi-page invoice (20 items) ───────────────────────────────
const MANY_ITEMS = Array.from({ length: 20 }, (_, i) => ({
  description: `Room ${i + 1} — Vinyl LVT installation (high grade)`,
  unit: 'sqm', qty: 12 + i * 0.5, price: 26,
  total: Math.round((12 + i * 0.5) * 26 * 100) / 100,
}));
const MANY_SUB = MANY_ITEMS.reduce((s, i) => s + i.total, 0);
buildPdf(`${OUT_DIR}/04-multipage-invoice.pdf`, {
  docType: 'INVOICE', identity: IDENTITY_WITH_LOGO, client: CLIENT,
  infoRows: infoRowsFor('INV-0099', DATE_STR, EMAIL_STR, PHONE_STR, null, IDENTITY_WITH_LOGO),
  items: MANY_ITEMS, subtotal: MANY_SUB, vat: Math.round(MANY_SUB * 0.2 * 100) / 100,
  grand: Math.round(MANY_SUB * 1.2 * 100) / 100,
  footerNotes: 'Payment due within 30 days. Late payments subject to statutory interest.',
});

// ── Case 5: Long notes section ────────────────────────────────────────────────
const LONG_NOTES = 'This quote covers all materials and labour for the full flooring installation as discussed during the site survey on 14 May 2026. The price includes removal of existing flooring, floor preparation, moisture testing, installation of underlay and LVT planks, fitting of door thresholds and scotia trim throughout. Any structural floor repairs found during installation will be quoted separately. All work carries a 5-year guarantee on installation and 15-year manufacturer warranty on materials. Customer to ensure property is clear of furniture prior to commencement. Payment schedule: 30% deposit on acceptance, 40% on commencement, 30% on completion. VAT at 20% is included in all figures shown.';
buildPdf(`${OUT_DIR}/05-long-notes.pdf`, {
  docType: 'INVOICE', identity: IDENTITY_WITH_LOGO, client: CLIENT,
  infoRows: infoRowsFor('INV-0055', DATE_STR, EMAIL_STR, PHONE_STR, null, IDENTITY_WITH_LOGO),
  items: BASE_ITEMS.slice(0, 3), subtotal: 903.76, vat: 180.75, grand: 1084.51,
  footerNotes: LONG_NOTES,
});

// ── Case 6: VAT enabled ───────────────────────────────────────────────────────
buildPdf(`${OUT_DIR}/06-vat-enabled.pdf`, {
  docType: 'INVOICE', identity: IDENTITY_WITH_LOGO, client: CLIENT,
  infoRows: infoRowsFor('INV-0010', DATE_STR, EMAIL_STR, PHONE_STR, null, IDENTITY_WITH_LOGO),
  items: BASE_ITEMS, subtotal: SUBTOTAL, vat: VAT_AMT, grand: GRAND,
  vatRate: 20,
});

// ── Case 7: VAT disabled ──────────────────────────────────────────────────────
buildPdf(`${OUT_DIR}/07-vat-disabled.pdf`, {
  docType: 'INVOICE', identity: { ...IDENTITY_WITH_LOGO, vat_enabled: false, vat_number: null }, client: CLIENT,
  infoRows: infoRowsFor('INV-0011', DATE_STR, EMAIL_STR, PHONE_STR, null, { ...IDENTITY_WITH_LOGO, vat_number: null }),
  items: BASE_ITEMS, subtotal: SUBTOTAL, vat: 0, grand: SUBTOTAL,
});

// ── Case 8: Large footer/contact section ─────────────────────────────────────
const BIG_IDENTITY = {
  ...IDENTITY_WITH_LOGO,
  contact_name: 'James Alexander Carvalho-Smith',
  trading_name: 'Carvalho Renovations & Interiors Ltd',
  address_line_1: '12 Long Business Park Road',
  address_line_2: 'Industrial Estate, Block B, Unit 7',
  city: 'Milton Keynes',
  postcode: 'MK9 1AA',
  email: 'james.carvalho@renovations-example.com',
  phone: '+44 7123 456 789',
  bank_name: 'HSBC Business Banking',
  account_name: 'Carvalho Renovations Ltd',
  sort_code: '40-11-60',
  account_number: '12345678',
  iban: 'GB29NWBK60161331926819',
  swift_bic: 'HBUKGB4BXXX',
};
buildPdf(`${OUT_DIR}/08-large-footer.pdf`, {
  docType: 'INVOICE', identity: BIG_IDENTITY, client: CLIENT,
  infoRows: infoRowsFor('INV-0012', DATE_STR, EMAIL_STR, PHONE_STR, null, BIG_IDENTITY),
  items: BASE_ITEMS, subtotal: SUBTOTAL, vat: VAT_AMT, grand: GRAND,
});

// ── Case 9: 40+ line items ────────────────────────────────────────────────────
const FORTY_ITEMS = Array.from({ length: 42 }, (_, i) => ({
  description: `Item ${String(i + 1).padStart(2, '0')} — Material/Labour`,
  unit: i % 3 === 0 ? 'sqm' : i % 3 === 1 ? 'Item' : 'm',
  qty: 1 + (i % 10),
  price: 10 + i * 2,
  total: (1 + (i % 10)) * (10 + i * 2),
}));
const FORTY_SUB = FORTY_ITEMS.reduce((s, i) => s + i.total, 0);
buildPdf(`${OUT_DIR}/09-forty-items.pdf`, {
  docType: 'INVOICE', identity: IDENTITY_WITH_LOGO, client: CLIENT,
  infoRows: infoRowsFor('INV-0200', DATE_STR, EMAIL_STR, PHONE_STR, null, IDENTITY_WITH_LOGO),
  items: FORTY_ITEMS, subtotal: FORTY_SUB, vat: Math.round(FORTY_SUB * 0.2 * 100) / 100,
  grand: Math.round(FORTY_SUB * 1.2 * 100) / 100,
  footerNotes: 'Continued on next page if applicable.',
});

// ── Case 10: Multi-page continuation table (explicit overflow) ────────────────
buildPdf(`${OUT_DIR}/10-continuation-table.pdf`, {
  docType: 'QUOTE', identity: IDENTITY_WITH_LOGO, client: CLIENT,
  infoRows: infoRowsFor('QUO-0100', DATE_STR, EMAIL_STR, PHONE_STR, 'BIG-JOB', IDENTITY_WITH_LOGO),
  items: [...MANY_ITEMS, ...MANY_ITEMS.map(i => ({ ...i, description: 'Phase 2: ' + i.description }))],
  subtotal: MANY_SUB * 2, vat: Math.round(MANY_SUB * 2 * 0.2 * 100) / 100,
  grand: Math.round(MANY_SUB * 2 * 1.2 * 100) / 100,
  footerNotes: 'This is a multi-page quote. All sections are valid.',
});

console.log('\nDone. Open PDFs with: open /tmp/tissca-pdfs/');
