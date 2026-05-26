// src/lib/pdf/tool-payload.ts
//
// Typed contracts and item extractors for tool_attachments.raw_payload.
//
// PURPOSE:
// Centralise all rawPayload parsing and item extraction so it is not
// duplicated inline across routes (documents PDF, convert route, etc.).
//
// ANDROID CONTRACT (source of truth):
//   FlooringScreen.kt      → FlooringRawPayload
//   OperationalSyncDto.kt  → AndroidRawPayload (generic tool items format)
//   CrmViewModel.kt        → extractRawPayloadFinancials (deposit, discount)
//
// WEBSITE FORMAT (buildRawPayload in tool-types.ts):
//   TradeToolPayload → { _toolKey, sections[{key, title, rows[...]}], ... }
//
// GENERAL ESTIMATE FORMAT (general/page.tsx):
//   GeneralEstimatePayload → { tool_key: 'general_estimate', line_items[...], ... }
//
// DISPATCHING:
// `extractItemsFromPayload` is the single entry point for PDF routes.
// It detects the format automatically and dispatches to the right extractor.
//
// DO NOT add PDF rendering logic here — this module is pure data transformation.

// ─── PdfItem (shared with branding.ts renderPdfBody) ─────────────────────────

/** Single line item as consumed by renderPdfBody(). */
export type PdfItem = {
  description: string;
  unit: string;
  qty: number;
  price: number;
  total: number;
};

// ─── Raw payload format detection helpers ─────────────────────────────────────

/** Parse a raw_payload JSON string safely. Returns null on any error. */
export function parseRawPayload(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Financial metadata extraction (used by convert route) ───────────────────

/**
 * Extract deposit and discount values from any rawPayload format.
 * Both Android and website payloads store these at the root.
 *
 * Android deposit field names: deposit_amount (requested), deposit_paid (legacy)
 * Website deposit field name: deposit_amount
 * Android discount field name: discount_percent
 * Website discount field name: discount_percent
 */
export function extractRawPayloadFinancials(rawPayload: string | null): {
  depositAmount: number;
  discountPercent: number;
} {
  const raw = parseRawPayload(rawPayload);
  if (!raw) return { depositAmount: 0, discountPercent: 0 };

  const depositAmount =
    typeof raw.deposit_amount === 'number' ? raw.deposit_amount
    : typeof raw.deposit_paid === 'number' ? raw.deposit_paid
    : 0;

  const discountPercent =
    typeof raw.discount_percent === 'number' ? raw.discount_percent : 0;

  return { depositAmount, discountPercent };
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

/**
 * Mirror Android AttachmentContentExtractor.cleanDisplayLabel():
 * Replace underscores with spaces, title-case each word.
 */
export function cleanDisplayLabel(id: string): string {
  return id
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Android flooring tool stores room dimensions in mm and computes area as
 * lengthMm * widthMm (raw mm²). A 3600mm × 5400mm room arrives with
 * qty = 19,440,000 instead of 19.44. Heuristic: if unit is area and qty ≥ 10k,
 * the value is mm² — divide by 1,000,000 to recover m².
 */
export function normaliseAreaItem(it: PdfItem): PdfItem {
  const u = it.unit.toLowerCase().replace(/\s+/g, '');
  const isArea = u === 'm²' || u === 'm2' || u === 'sqm' || u === 'sq.m' || u === 'sq.m.';
  if (!isArea || it.qty < 10_000) return it;
  const normQty = Math.round((it.qty / 1_000_000) * 10_000) / 10_000;
  const normTotal =
    it.price > 0
      ? Math.round(normQty * it.price * 100) / 100
      : Math.round((it.total / 1_000_000) * 100) / 100;
  return { ...it, qty: normQty, total: normTotal };
}

/**
 * Map snake_case (website) and camelCase (Android) item fields to canonical PdfItem shape.
 * Used for generic doc.items fallback.
 */
export function flexNormaliseItem(raw: Record<string, unknown>): PdfItem {
  return {
    description: String(raw.description ?? raw.name ?? raw.itemName ?? raw.item_name ?? ''),
    unit:        String(raw.unit ?? raw.unitType ?? raw.unit_type ?? ''),
    qty:    Number(raw.qty ?? raw.quantity ?? raw.amount ?? 0),
    price:  Number(raw.price ?? raw.unit_price ?? raw.unitPrice ?? raw.rate ?? 0),
    total:  Number(raw.total ?? raw.line_total ?? raw.lineTotal ?? raw.rowTotal ?? raw.row_total ?? 0),
  };
}

/** Drop duplicate rows (Android can emit both raw mm² and converted sqm). */
export function deduplicateItems<T extends { description: string; unit: string; qty: number; price: number }>(
  items: T[],
): T[] {
  const seen = new Set<string>();
  return items.filter((it) => {
    const key = [it.description.trim().toLowerCase(), it.unit.trim().toLowerCase(), it.qty, it.price].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Android flooring extractor ───────────────────────────────────────────────
//
// TypeScript port of Android AttachmentContentExtractor.extractFlooringPdfItems()
// (v1.6.0). Source contract: FlooringScreen.kt buildRawPayload() schema.
//
// Android flooring rawPayload schema:
//   {
//     rooms: [{ name, length, width, sqm?, isVisibleToClient? }],
//     flooringType: string,         // e.g. "lvt"
//     costPerSqm: string,           // e.g. "22.0"
//     items: [                      // tool-emitted items
//       { name, qty, price, unit, costBucket }  // qty and price are strings
//     ]
//   }
//
// CRITICAL: sqm is read from items[].qty (unit-converted at save time),
// NOT from rooms[].length/width (raw user input in user-selected units).
// ─────────────────────────────────────────────────────────────────────────────

function extractFlooringItemsFromParsed(json: Record<string, unknown>): PdfItem[] {
  const out: PdfItem[] = [];

  const roomsArr = (json.rooms as unknown[]) ?? [];
  const flooringTypeId = String(json.flooringType ?? '');
  const flooringTypeLabel = flooringTypeId ? cleanDisplayLabel(flooringTypeId) : '';
  const costPerSqm = parseFloat(String(json.costPerSqm ?? '0')) || 0;

  // Build roomName → sqm lookup from items[] (Android v1.6.0 FIX)
  const itemsArr = (json.items as unknown[]) ?? [];
  const roomSqmFromItems = new Map<string, number>();
  if (costPerSqm > 0 && flooringTypeLabel) {
    const suffix = ` (${flooringTypeLabel})`;
    for (const raw of itemsArr) {
      const o = raw as Record<string, unknown>;
      const itemName = String(o.name ?? '');
      const unitField = String(o.unit ?? '');
      const qty = parseFloat(String(o.qty ?? '0')) || 0;
      if (unitField.toLowerCase() !== 'sqm' || qty <= 0) continue;
      if (itemName.endsWith(suffix)) {
        const roomName = itemName.slice(0, -suffix.length).trim();
        if (roomName) roomSqmFromItems.set(roomName, qty);
      }
    }
  }

  if (costPerSqm > 0) {
    for (const raw of roomsArr) {
      const o = raw as Record<string, unknown>;
      const name = String(o.name ?? 'Room') || 'Room';
      const isVisible = o.isVisibleToClient !== false;
      if (!isVisible) continue;

      let sqm = roomSqmFromItems.get(name);
      if (!sqm && typeof o.sqm === 'number' && (o.sqm as number) > 0) {
        sqm = o.sqm as number;
      }
      if (!sqm || sqm <= 0) continue;

      const description = flooringTypeLabel ? `${name} (${flooringTypeLabel})` : name;
      out.push({
        description,
        unit: 'sqm',
        qty: sqm,
        price: costPerSqm,
        total: Math.round(sqm * costPerSqm * 100) / 100,
      });
    }
  }

  // Non-room items from items[]
  const emittedDescriptions = new Set(out.map((i) => i.description));
  for (const raw of itemsArr) {
    const o = raw as Record<string, unknown>;
    const name = String(o.name ?? '').trim();
    if (!name) continue;
    if (emittedDescriptions.has(name)) continue;
    const qty = parseFloat(String(o.qty ?? '1')) || 1;
    const price = parseFloat(String(o.price ?? '0')) || 0;
    if (qty <= 0 || price <= 0) continue;
    const unit = String(o.unit ?? 'Item') || 'Item';
    out.push({
      description: cleanDisplayLabel(name),
      unit,
      qty,
      price,
      total: Math.round(qty * price * 100) / 100,
    });
  }

  return out;
}

// ─── Website format extractor ─────────────────────────────────────────────────
//
// Website trade tools (TradeToolForm + buildRawPayload()) store:
//   {
//     _toolKey: string,
//     sections: [{
//       key: string,
//       title: string,
//       rows: [{ id, description, quantity, unit, unit_price, amount, cost_bucket }]
//     }],
//     subtotal, discount_percent, ..., total, deposit_amount, ...
//   }
// ─────────────────────────────────────────────────────────────────────────────

function extractWebsiteToolItems(json: Record<string, unknown>): PdfItem[] {
  const sections = (json.sections as unknown[]) ?? [];
  const out: PdfItem[] = [];

  for (const sec of sections) {
    const s = sec as Record<string, unknown>;
    const rows = (s.rows as unknown[]) ?? [];
    for (const r of rows) {
      const row = r as Record<string, unknown>;
      const description = String(row.description ?? '').trim();
      if (!description) continue;
      const qty = Number(row.quantity ?? row.qty ?? 1);
      const price = Number(row.unit_price ?? row.price ?? 0);
      const amount = Number(row.amount ?? row.total ?? qty * price);
      if (qty <= 0 || price <= 0) continue;
      out.push({
        description,
        unit: String(row.unit ?? 'Item') || 'Item',
        qty,
        price,
        total: Math.round(amount * 100) / 100,
      });
    }
  }

  return out;
}

// ─── General estimate extractor ───────────────────────────────────────────────
//
// Website general estimate (general/page.tsx) stores:
//   {
//     tool_key: 'general_estimate',
//     line_items: [{ index, description, quantity, unit_price, amount, cost_bucket }],
//     subtotal, discount_percent, ..., total, deposit_paid, ...
//   }
// ─────────────────────────────────────────────────────────────────────────────

function extractGeneralEstimateItems(json: Record<string, unknown>): PdfItem[] {
  const lineItems = (json.line_items as unknown[]) ?? [];
  const out: PdfItem[] = [];

  for (const raw of lineItems) {
    const it = raw as Record<string, unknown>;
    const description = String(it.description ?? '').trim();
    if (!description) continue;
    const qty = Number(it.quantity ?? it.qty ?? 1);
    const price = Number(it.unit_price ?? it.price ?? 0);
    const amount = Number(it.amount ?? it.total ?? qty * price);
    if (qty <= 0 || price <= 0) continue;
    out.push({
      description,
      unit: String(it.unit ?? 'Item') || 'Item',
      qty,
      price,
      total: Math.round(amount * 100) / 100,
    });
  }

  return out;
}

// ─── Android generic trade tool extractor ─────────────────────────────────────
//
// Android non-flooring trade tools emit a flat items array at the root of
// rawPayload: { items: [{name, qty, price, unit, costBucket}, ...], ... }
// qty and price are serialised as strings.
// ─────────────────────────────────────────────────────────────────────────────

function extractGenericAndroidItems(json: Record<string, unknown>): PdfItem[] {
  const itemsArr = (json.items as unknown[]) ?? [];
  const out: PdfItem[] = [];

  for (const raw of itemsArr) {
    const o = raw as Record<string, unknown>;
    const name = String(o.name ?? '').trim();
    if (!name) continue;
    const qty = parseFloat(String(o.qty ?? '1')) || 1;
    const price = parseFloat(String(o.price ?? '0')) || 0;
    if (qty <= 0 || price <= 0) continue;
    const unit = String(o.unit ?? 'Item') || 'Item';
    out.push({
      description: cleanDisplayLabel(name),
      unit,
      qty,
      price,
      total: Math.round(qty * price * 100) / 100,
    });
  }

  return out;
}

// ─── Primary dispatcher ───────────────────────────────────────────────────────

/**
 * Extract PDF line items from a tool attachment's raw_payload.
 *
 * Detection order:
 *   1. Website format — has `_toolKey` and `sections` (TradeToolPayload)
 *   2. General estimate — has `tool_key = 'general_estimate'` and `line_items`
 *   3. Android flooring — has `rooms` or `flooringType` OR toolKey === 'flooring'
 *   4. Android generic — has `items` array at root level
 *   5. None matched → empty array (caller should fall back to doc.items)
 *
 * Returns an empty array on parse failure or unrecognised format.
 * Deduplication is NOT performed here — call deduplicateItems() on the result.
 */
export function extractItemsFromPayload(
  toolKey: string | null | undefined,
  rawPayload: string | null | undefined,
): PdfItem[] {
  const json = parseRawPayload(rawPayload ?? null);
  if (!json) return [];

  // 1. Website trade tool format
  if (json._toolKey !== undefined && Array.isArray(json.sections)) {
    return extractWebsiteToolItems(json);
  }

  // 2. General estimate format
  if (json.tool_key === 'general_estimate' && Array.isArray(json.line_items)) {
    return extractGeneralEstimateItems(json);
  }

  // 3. Android flooring format (rooms or flooringType present, OR tool_key is flooring)
  const isFlooringTool = toolKey === 'flooring' || json.flooringType !== undefined;
  const hasRooms = Array.isArray(json.rooms);
  if ((isFlooringTool || hasRooms) && (hasRooms || json.costPerSqm !== undefined || json.flooringType !== undefined)) {
    return extractFlooringItemsFromParsed(json);
  }

  // 4. Android generic tool format (flat items array at root)
  if (Array.isArray(json.items) && (json.items as unknown[]).length > 0) {
    return extractGenericAndroidItems(json);
  }

  return [];
}
