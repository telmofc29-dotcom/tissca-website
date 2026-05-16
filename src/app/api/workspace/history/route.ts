// src/app/api/workspace/history/route.ts v2.0
//
// GET /api/workspace/history — unified audit trail.
// Merges crm_history rows + documents table (for cross-platform document events).
// Deduplicates so documents already represented in crm_history don't appear twice.
// Scoped by business_id / workspace_id. Ordered newest-first.

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { resolveUserFromToken, getHistory, getDocuments } from '@/lib/workspace-data';
import type { HistoryRow, DocumentRow } from '@/lib/workspace-data';

/**
 * Synthesise a HistoryRow-shaped object from a DocumentRow so the frontend
 * can render it with the same card layout while still carrying rich metadata.
 */
function documentToHistoryEntry(doc: DocumentRow): HistoryRow & { _source: 'document' } {
  return {
    id: `doc-${doc.id}`,
    workspace_id: doc.workspace_id,
    entity_type: 'document',
    entity_id: doc.id,
    action: 'generated',
    details: {
      type: doc.type,
      reference: doc.reference,
      client_name: doc.client_name,
      grand_total: doc.grand_total,
      currency: doc.currency,
      platform: doc.platform,
      status: doc.status,
    },
    performed_by: doc.created_by,
    created_at: doc.created_at,
    _source: 'document',
  };
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolved = await resolveUserFromToken(token);
    if (!resolved) {
      return NextResponse.json({ history: [] });
    }

    // Fetch both sources in parallel
    const [crmHistory, documents] = await Promise.all([
      getHistory(resolved),
      getDocuments(resolved),
    ]);

    // Build a set of document IDs already represented in crm_history
    // so we don't duplicate them. crm_history document rows have entity_type='document'
    // and entity_id = the document row ID (or the reference if ID wasn't available).
    const representedDocIds = new Set<string>();
    for (const h of crmHistory) {
      if (h.entity_type === 'document' && h.entity_id) {
        representedDocIds.add(h.entity_id);
      }
    }

    // Synthesise history entries for documents NOT already in crm_history
    const docEntries = documents
      .filter((doc) => !representedDocIds.has(doc.id) && !representedDocIds.has(doc.reference ?? ''))
      .map(documentToHistoryEntry);

    // Also enrich existing crm_history document entries with document metadata
    // so the frontend can render them richly (client_name, grand_total, etc.)
    const docById = new Map<string, DocumentRow>();
    for (const doc of documents) {
      docById.set(doc.id, doc);
      if (doc.reference) docById.set(doc.reference, doc);
    }

    const enrichedCrm: HistoryRow[] = crmHistory.map((h) => {
      if (h.entity_type === 'document' && h.entity_id) {
        const doc = docById.get(h.entity_id);
        if (doc) {
          return {
            ...h,
            details: {
              ...((h.details as Record<string, unknown>) ?? {}),
              client_name: doc.client_name,
              grand_total: doc.grand_total,
              currency: doc.currency,
              platform: doc.platform,
            },
          };
        }
      }
      return h;
    });

    // Merge + sort newest-first, cap at 200
    const merged = [...enrichedCrm, ...docEntries]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 200);

    return NextResponse.json({ history: merged });
  } catch (err) {
    console.error('[GET /api/workspace/history] Failed:', err);
    return NextResponse.json({ error: 'Failed to load history' }, { status: 500 });
  }
}
