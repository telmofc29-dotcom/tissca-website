// scripts/test-pdf-golden.ts
//
// Golden-master test runner — exercises renderPdfBody() with the 10 contract
// test scenarios. Run with:  npx tsx scripts/test-pdf-golden.ts
//
// Outputs PDFs to /tmp/tissca-pdfs/. Page counts written to stdout.

import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { renderPdfBody, type PdfIdentity } from '../src/lib/pdf/branding';

const OUT_DIR = '/tmp/tissca-pdfs';
fs.mkdirSync(OUT_DIR, { recursive: true });

// Sample logo (Pro scenarios). Falls back to null if file missing.
const LOGO_CANDIDATES = [
  path.resolve(__dirname, '..', 'public', 'icons', 'icon-192x192.png'),
  path.resolve(__dirname, '..', 'public', 'logo.png'),
];
let LOGO_BUFFER: Buffer | null = null;
for (const p of LOGO_CANDIDATES) {
  if (fs.existsSync(p)) { LOGO_BUFFER = fs.readFileSync(p); break; }
}

function baseIdentity(overrides: Partial<PdfIdentity> = {}): PdfIdentity {
  return {
    business_structure: 'limited_company',
    company_name: 'Test Construction Ltd',
    trading_name: 'TestCo',
    company_number: '12345678',
    contact_name: 'Jane Doe',
    address_line_1: '12 Builder Street',
    address_line_2: 'Unit 4',
    city: 'London',
    postcode: 'E1 6AN',
    phone: '+44 20 7946 0958',
    email: 'hello@testco.uk',
    bank_name: 'Barclays',
    account_name: 'Test Construction Ltd',
    sort_code: '20-00-00',
    account_number: '12345678',
    iban: null,
    swift_bic: null,
    routing_number: null,
    vat_enabled: false,
    vat_number: null,
    vat_rate: 20,
    logo_url: null,
    tagline: null,
    brand_color: '#1e40af',
    default_currency: 'GBP',
    _logoBuffer: null,
    ...overrides,
  };
}

type Scenario = {
  name: string;
  isProUser: boolean;
  identity: PdfIdentity;
  client: { name?: string | null; address?: string | null; phone?: string | null; email?: string | null };
  infoRows: Array<{ label: string; value: string }>;
  headerNotes?: string | null;
  items: Array<{ description: string; unit: string; qty: number; price: number; total: number }>;
  totalsRows: Array<{ label: string; value: string; bold?: boolean }>;
  bottomNotes?: string | null;
  docType?: 'QUOTE' | 'INVOICE';
  currencyCode?: string;
  expectedPages: number;
};

const client = {
  name: 'Acme Holdings Ltd',
  address: '99 Customer Road\nSuite 200\nManchester\nM1 2AB',
  phone: '+44 161 555 0100',
  email: 'ap@acme.test',
};

const stdInfo = (refNo: string) => [
  { label: 'Date', value: '18 May 2026' },
  { label: 'Ref No', value: refNo },
  { label: 'Client Ref', value: '—' },
  { label: 'Email', value: client.email },
  { label: 'Client Phone Number', value: client.phone },
];

const stdTotals = (sub: number, vat = 0): Array<{ label: string; value: string; bold?: boolean }> => {
  const total = sub + vat;
  const rows: Array<{ label: string; value: string; bold?: boolean }> = [
    { label: 'Subtotal', value: `£${sub.toFixed(2)}` },
  ];
  if (vat > 0) rows.push({ label: 'VAT (20%)', value: `£${vat.toFixed(2)}` });
  rows.push({ label: 'Total', value: `£${total.toFixed(2)}`, bold: true });
  return rows;
};

const fortyItems = Array.from({ length: 42 }, (_, i) => ({
  description: `Service line ${i + 1}`,
  unit: 'Item',
  qty: 1,
  price: 50,
  total: 50,
}));

const twentyItems = Array.from({ length: 20 }, (_, i) => ({
  description: `Line ${i + 1}`,
  unit: 'Item',
  qty: 2,
  price: 75,
  total: 150,
}));

const longItem = {
  description:
    'Supply and install premium engineered oak flooring across the open-plan ground floor living area, including underlay, perimeter beading, transition strips, and full removal of existing carpet and disposal at licensed facility.',
  unit: 'Job',
  qty: 1,
  price: 4500,
  total: 4500,
};

const SCENARIOS: Scenario[] = [
  // 01 — invoice, no logo (free user → watermark), no VAT, no notes
  {
    name: '01-invoice-no-logo',
    isProUser: false,
    identity: baseIdentity(),
    client,
    infoRows: stdInfo('INV-0001'),
    items: [
      { description: 'Labour — first fix carpentry', unit: 'Hour', qty: 8, price: 45, total: 360 },
      { description: 'Materials — timber stud + boards', unit: 'Job', qty: 1, price: 240, total: 240 },
    ],
    totalsRows: stdTotals(600),
    docType: 'INVOICE',
    expectedPages: 1,
  },

  // 02 — invoice, with logo (Pro), VAT enabled
  {
    name: '02-invoice-with-logo',
    isProUser: true,
    identity: baseIdentity({ vat_enabled: true, vat_number: 'GB123456789', _logoBuffer: LOGO_BUFFER }),
    client,
    infoRows: [
      ...stdInfo('INV-0002'),
      { label: 'Company No', value: '12345678' },
      { label: 'VAT No', value: 'GB123456789' },
    ],
    items: [
      { description: 'Bathroom refurbishment — full scope', unit: 'Job', qty: 1, price: 5400, total: 5400 },
    ],
    totalsRows: stdTotals(5400, 5400 * 0.2),
    docType: 'INVOICE',
    expectedPages: 1,
  },

  // 03 — quote with logo
  {
    name: '03-quote-with-logo',
    isProUser: true,
    identity: baseIdentity({ _logoBuffer: LOGO_BUFFER }),
    client,
    infoRows: stdInfo('Q-0003'),
    items: [
      { description: 'Kitchen extension design package', unit: 'Job', qty: 1, price: 1200, total: 1200 },
      { description: 'Site survey + measurements', unit: 'Visit', qty: 2, price: 150, total: 300 },
    ],
    totalsRows: stdTotals(1500),
    docType: 'QUOTE',
    expectedPages: 1,
  },

  // 04 — multi-page invoice (20 items spills to page 2)
  {
    name: '04-multipage-invoice',
    isProUser: true,
    identity: baseIdentity({ _logoBuffer: LOGO_BUFFER }),
    client,
    infoRows: stdInfo('INV-0004'),
    items: twentyItems,
    totalsRows: stdTotals(3000),
    docType: 'INVOICE',
    expectedPages: 2,
  },

  // 05 — long notes (header + bottom)
  {
    name: '05-long-notes',
    isProUser: false,
    identity: baseIdentity(),
    client,
    infoRows: stdInfo('Q-0005'),
    headerNotes:
      'These are header-channel notes that appear INSIDE the top-right info box. They should wrap inside the 200pt-wide column at 10pt small paint.',
    items: [longItem],
    totalsRows: stdTotals(4500),
    bottomNotes:
      'Payment terms: 50% deposit on acceptance, balance due within 14 days of completion. Bank details above. ' +
      'Quote valid for 30 days from issue. All works carried out in compliance with current building regulations and TrustMark code of practice. ' +
      'A 12-month workmanship warranty applies. Materials warranty as per manufacturer terms.',
    docType: 'QUOTE',
    expectedPages: 1,
  },

  // 06 — VAT enabled, multiple rows
  {
    name: '06-vat-enabled',
    isProUser: true,
    identity: baseIdentity({ vat_enabled: true, vat_number: 'GB123456789', _logoBuffer: LOGO_BUFFER }),
    client,
    infoRows: [
      ...stdInfo('INV-0006'),
      { label: 'VAT No', value: 'GB123456789' },
    ],
    items: [
      { description: 'Labour', unit: 'Hour', qty: 16, price: 50, total: 800 },
      { description: 'Materials', unit: 'Job', qty: 1, price: 1200, total: 1200 },
    ],
    totalsRows: [
      { label: 'Subtotal', value: '£2000.00' },
      { label: 'VAT (20%)', value: '£400.00' },
      { label: 'Total', value: '£2400.00', bold: true },
    ],
    docType: 'INVOICE',
    expectedPages: 1,
  },

  // 07 — VAT disabled
  {
    name: '07-vat-disabled',
    isProUser: false,
    identity: baseIdentity(),
    client,
    infoRows: stdInfo('INV-0007'),
    items: [
      { description: 'Consultation', unit: 'Hour', qty: 3, price: 80, total: 240 },
    ],
    totalsRows: stdTotals(240),
    docType: 'INVOICE',
    expectedPages: 1,
  },

  // 08 — large footer (all payment + contact lines present)
  {
    name: '08-large-footer',
    isProUser: true,
    identity: baseIdentity({
      vat_enabled: true,
      vat_number: 'GB987654321',
      iban: 'GB29 NWBK 6016 1331 9268 19',
      swift_bic: 'NWBKGB2L',
      routing_number: '021000021',
      _logoBuffer: LOGO_BUFFER,
    }),
    client,
    infoRows: [
      ...stdInfo('INV-0008'),
      { label: 'Company No', value: '12345678' },
      { label: 'VAT No', value: 'GB987654321' },
    ],
    items: [
      { description: 'Renovation', unit: 'Job', qty: 1, price: 1000, total: 1000 },
    ],
    totalsRows: stdTotals(1000, 200),
    docType: 'INVOICE',
    expectedPages: 1,
  },

  // 09 — 42 items → 3 pages
  {
    name: '09-forty-items',
    isProUser: true,
    identity: baseIdentity({ _logoBuffer: LOGO_BUFFER }),
    client,
    infoRows: stdInfo('INV-0009'),
    items: fortyItems,
    totalsRows: stdTotals(42 * 50),
    docType: 'INVOICE',
    expectedPages: 3,
  },

  // 10 — continuation + bottom notes overflow
  {
    name: '10-continuation-table',
    isProUser: false,
    identity: baseIdentity(),
    client,
    infoRows: stdInfo('Q-0010'),
    items: Array.from({ length: 35 }, (_, i) => ({
      description: `Item ${i + 1} — moderately long description to test continuation table behaviour across page breaks per contract §1.2.`,
      unit: 'Item',
      qty: 1,
      price: 25,
      total: 25,
    })),
    totalsRows: stdTotals(35 * 25),
    bottomNotes:
      'These bottom notes are long enough to potentially require their own page after a multi-page item table. ' +
      'They should appear in a full-width grey rounded box per contract §2.7, with "NOTES" heading at 12pt bold and body at 12pt normal. ' +
      'Line step is 14pt. Box padding 12pt top + bottom.',
    docType: 'QUOTE',
    expectedPages: 5,
  },
];

async function generate(scenario: Scenario): Promise<{ buffer: Buffer; pageCount: number }> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      // crude /Page count
      const pageCount = (buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
      resolve({ buffer, pageCount });
    });
    doc.on('error', reject);

    try {
      renderPdfBody(doc, {
        identity: scenario.identity,
        docType: scenario.docType ?? 'INVOICE',
        isProUser: scenario.isProUser,
        fallbackTitle: scenario.identity.company_name ?? 'TISSCA',
        client: scenario.client,
        infoRows: scenario.infoRows,
        headerNotes: scenario.headerNotes ?? null,
        items: scenario.items,
        totalsRows: scenario.totalsRows,
        bottomNotes: scenario.bottomNotes ?? null,
        currencyCode: scenario.currencyCode ?? 'GBP',
      });
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

(async () => {
  const results: Array<{ name: string; expected: number; actual: number; ok: boolean }> = [];
  for (const s of SCENARIOS) {
    try {
      const { buffer, pageCount } = await generate(s);
      const file = path.join(OUT_DIR, `${s.name}.pdf`);
      fs.writeFileSync(file, buffer);
      const ok = pageCount === s.expectedPages;
      results.push({ name: s.name, expected: s.expectedPages, actual: pageCount, ok });
      console.log(
        `${ok ? '✓' : '✗'}  ${s.name.padEnd(28)}  expected=${s.expectedPages} actual=${pageCount}  → ${file}`,
      );
    } catch (e) {
      console.error(`✗  ${s.name}  FAILED:`, e);
      results.push({ name: s.name, expected: s.expectedPages, actual: -1, ok: false });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log(`\n${passed}/${results.length} scenarios match expected page count (${failed} mismatch)`);
  process.exit(failed > 0 ? 1 : 0);
})();
