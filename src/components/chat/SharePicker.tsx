// src/components/chat/SharePicker.tsx
//
// Modal to select a Lead, Job, Invoice, Quote, or Asset from workspace data
// and share into chat.  Fetches from existing workspace / entity API endpoints.

'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';

// ─── Lightweight types matching API response shapes ─────────────────────────

export interface LeadItem {
  id: string;
  client_name: string | null;
  status: string;
  estimated_value: number | null;
  source: string | null;
  notes?: string | null;
}

export interface JobItem {
  id: string;
  client_name: string | null;
  status: string;
  job_value: number | null;
  start_date_millis: number | null;
  notes?: string | null;
}

export type ShareEntityType = 'lead' | 'job' | 'client_profile';
export type ShareEntity = LeadItem | JobItem;

// ─── Props ──────────────────────────────────────────────────────────────────

interface SharePickerProps {
  entityType: ShareEntityType;
  onSelect: (entity: ShareEntity) => void;
  onClose: () => void;
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(v);
}

const ENTITY_META: Record<ShareEntityType, { title: string; empty: string; endpoint: string; key: string }> = {
  lead:    { title: 'Share a Lead',    empty: 'No leads found',    endpoint: '/api/workspace/leads',  key: 'leads' },
  job:     { title: 'Share a Job',     empty: 'No jobs found',     endpoint: '/api/workspace/jobs',   key: 'jobs' },
  client_profile: { title: 'Share a Contact', empty: 'No contacts found', endpoint: '', key: '' },
};

export function SharePicker({ entityType, onSelect, onClose }: SharePickerProps) {
  const { accessToken } = useWorkspace();
  const [items, setItems] = useState<ShareEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!accessToken) return;

    const meta = ENTITY_META[entityType];

    fetch(meta.endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setItems((data?.[meta.key] ?? []) as ShareEntity[]);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [accessToken, entityType]);

  // Filter by search — resolve display label per entity type
  const filtered = items.filter((item) => {
    const label = getEntityLabel(entityType, item);
    return label.toLowerCase().includes(search.toLowerCase());
  });

  const meta = ENTITY_META[entityType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="mx-4 flex max-h-[70vh] w-full max-w-md flex-col rounded-2xl border border-gray-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="text-base font-semibold text-slate-900">{meta.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-gray-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-gray-200 px-5 py-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${entityType}s…`}
            autoFocus
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="px-5 py-8 text-center text-sm text-slate-400">Loading…</div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-slate-400">{meta.empty}</div>
          )}

          {!loading && filtered.map((item) => (
            <EntityRow key={item.id} entityType={entityType} item={item} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getEntityLabel(type: ShareEntityType, item: ShareEntity): string {
  switch (type) {
    case 'lead':    return (item as LeadItem).client_name ?? '';
    case 'job':     return (item as JobItem).client_name ?? '';
    default:        return '';
  }
}

function formatShortDate(d: number): string {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── Row Renderers ──────────────────────────────────────────────────────────

function EntityRow({ entityType, item, onSelect }: { entityType: ShareEntityType; item: ShareEntity; onSelect: (e: ShareEntity) => void }) {
  switch (entityType) {
    case 'lead': {
      const lead = item as LeadItem;
      return (
        <button
          key={lead.id}
          type="button"
          onClick={() => onSelect(lead)}
          className="flex w-full items-start justify-between border-b border-gray-100 px-5 py-3 text-left transition hover:bg-gray-50"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{lead.client_name || 'Unnamed lead'}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {lead.status}{lead.source ? ` · ${lead.source}` : ''}
            </p>
          </div>
          {lead.estimated_value != null && (
            <span className="shrink-0 text-xs font-medium text-slate-600">{formatCurrency(lead.estimated_value)}</span>
          )}
        </button>
      );
    }
    case 'job': {
      const job = item as JobItem;
      return (
        <button
          key={job.id}
          type="button"
          onClick={() => onSelect(job)}
          className="flex w-full items-start justify-between border-b border-gray-100 px-5 py-3 text-left transition hover:bg-gray-50"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{job.client_name || 'Untitled job'}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {job.status.replace('_', ' ')}
              {job.start_date_millis ? ` · ${formatShortDate(job.start_date_millis)}` : ''}
            </p>
          </div>
          {job.job_value != null && (
            <span className="shrink-0 text-xs font-medium text-slate-600">{formatCurrency(job.job_value)}</span>
          )}
        </button>
      );
    }
    default:
      return null;
  }
}
