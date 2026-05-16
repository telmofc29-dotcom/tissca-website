// src/components/chat/StructuredMessageCard.tsx
//
// Renders structured message cards in thread: IMAGE, DOCUMENT, LEAD, JOB, CLIENT_PROFILE,
// INVOICE*, QUOTE*, ASSET* (*render-only).
// Unified component — routes by payload.type.
// Own LEAD/JOB taps open detail. Received LEAD/JOB/CLIENT_PROFILE taps offer import.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { ImageLightbox } from './ImageLightbox';
import type { ChatMessage } from '@/lib/chat/chat-types';
import {
  parsePayload,
  isImagePayload,
  isDocumentPayload,
  isLeadPayload,
  isJobPayload,
  isClientProfilePayload,
  isInvoicePayload,
  isQuotePayload,
  isAssetPayload,
  isCardPayload,
  formatFileSize,
  normLeadPayload,
  normJobPayload,
  resolveMediaUrl,
  resolveMediaName,
  resolveMediaSize,
  resolveMediaMime,
  type ChatImagePayload,
  type ChatDocumentPayload,
  type ChatLeadPayload,
  type ChatJobPayload,
  type ChatClientProfilePayload,
  type ChatInvoicePayload,
  type ChatQuotePayload,
  type ChatAssetPayload,
  type ChatCardPayload,
} from '@/lib/chat/chat-payloads';

// ─── Status badge colours ───────────────────────────────────────────────────

const LEAD_STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  quoted: 'bg-purple-100 text-purple-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
};

const JOB_STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  on_hold: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-purple-100 text-purple-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-100 text-red-700',
  partial: 'bg-yellow-100 text-yellow-700',
};

const QUOTE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  expired: 'bg-orange-100 text-orange-700',
};

// ─── IMAGE Card ─────────────────────────────────────────────────────────────

function ImageCard({ payload, isMine, signedUrlResolver }: { payload: ChatImagePayload; isMine: boolean; signedUrlResolver?: (bucket: string, path: string) => string | null }) {
  const src = resolveMediaUrl(payload, signedUrlResolver) ?? '';
  const name = resolveMediaName(payload);
  const size = resolveMediaSize(payload);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="block overflow-hidden rounded-xl text-left"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name}
          className="max-h-64 w-full rounded-xl object-cover"
          loading="lazy"
        />
        <div
          className={`mt-1 flex items-center gap-1.5 text-[11px] ${
            isMine ? 'text-blue-200' : 'text-slate-400'
          }`}
        >
          <span className="truncate">{name}</span>
          <span>·</span>
          <span>{formatFileSize(size)}</span>
        </div>
      </button>
      {lightboxOpen && (
        <ImageLightbox src={src} alt={name} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
}

// ─── DOCUMENT Card ──────────────────────────────────────────────────────────

function DocumentCard({ payload, isMine, signedUrlResolver }: { payload: ChatDocumentPayload; isMine: boolean; signedUrlResolver?: (bucket: string, path: string) => string | null }) {
  const href = resolveMediaUrl(payload, signedUrlResolver) ?? '#';
  const name = resolveMediaName(payload);
  const size = resolveMediaSize(payload);
  const mime = resolveMediaMime(payload);
  const ext = name.split('.').pop()?.toUpperCase() ?? 'FILE';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
        isMine
          ? 'border-blue-400/30 bg-blue-500/20 hover:bg-blue-500/30'
          : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
          isMine ? 'bg-blue-400/30 text-white' : 'bg-gray-100 text-slate-600'
        }`}
      >
        {ext}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-medium ${isMine ? 'text-white' : 'text-slate-900'}`}>
          {name}
        </p>
        <p className={`text-[11px] ${isMine ? 'text-blue-200' : 'text-slate-400'}`}>
          {formatFileSize(size)} · {mime.split('/').pop()?.toUpperCase()}
        </p>
      </div>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        className={`shrink-0 ${isMine ? 'text-blue-200' : 'text-slate-400'}`}
        aria-hidden="true"
      >
        <path
          d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}

// ─── LEAD Card (own → detail, received → import) ───────────────────────────

function LeadCard({ payload, isMine }: { payload: ChatLeadPayload; isMine: boolean }) {
  const router = useRouter();
  const { accessToken } = useWorkspace();
  const norm = normLeadPayload(payload);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedId, setImportedId] = useState<string | null>(null);

  const statusColor = LEAD_STATUS_COLORS[norm.status] ?? 'bg-gray-100 text-gray-700';

  const handleClick = () => {
    if (importedId) {
      router.push(`/app/leads/${importedId}`);
    } else if (isMine) {
      router.push(`/app/leads/${norm.entityId}`);
    } else {
      setShowImport(true);
    }
  };

  const handleImport = async () => {
    if (!accessToken) return;
    setImporting(true);
    try {
      const noteParts = [
        norm.notes,
        norm.phone ? `Phone: ${norm.phone}` : null,
        norm.email ? `Email: ${norm.email}` : null,
        norm.addressLine1 ? `Address: ${norm.addressLine1}` : null,
        norm.city ? `City: ${norm.city}` : null,
      ].filter(Boolean).join('\n');

      const res = await fetch('/api/workspace/leads', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: norm.name || 'Imported lead',
          status: 'new',
          source: 'TissChat import',
          value_estimate: norm.includeValues && norm.value ? norm.value : null,
          notes: noteParts || `Imported from chat: ${norm.name}`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setImportedId(data.lead?.id ?? null);
        setShowImport(false);
      }
    } catch { /* non-fatal */ }
    finally { setImporting(false); }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${
          isMine
            ? 'border-blue-400/30 bg-blue-500/20 hover:bg-blue-500/30'
            : 'border-gray-200 bg-white hover:bg-gray-50'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm">👤</span>
              <p className={`truncate text-sm font-semibold ${isMine ? 'text-white' : 'text-slate-900'}`}>
                {norm.name}
              </p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}>
            {norm.status}
          </span>
        </div>
        {norm.includeValues && norm.value != null && norm.value > 0 && (
          <p className={`mt-1 text-xs font-medium ${isMine ? 'text-blue-100' : 'text-slate-600'}`}>
            Value: {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(norm.value)}
          </p>
        )}
        {norm.source && (
          <p className={`mt-0.5 text-[11px] ${isMine ? 'text-blue-200' : 'text-slate-400'}`}>
            Source: {norm.source}
          </p>
        )}
        {!isMine && !importedId && (
          <p className="mt-1.5 text-[11px] font-medium text-blue-600">Tap to import</p>
        )}
        {importedId && (
          <p className="mt-1.5 text-[11px] font-medium text-green-600">✅ Imported — tap to view</p>
        )}
      </button>

      {showImport && (
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="flex-1 text-xs text-slate-600">Import this lead to your CRM?</p>
          <button
            type="button"
            onClick={handleImport}
            disabled={importing}
            className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {importing ? 'Importing…' : 'Import'}
          </button>
          <button
            type="button"
            onClick={() => setShowImport(false)}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ─── JOB Card (own → detail, received → import as lead) ─────────────────────

function JobCard({ payload, isMine }: { payload: ChatJobPayload; isMine: boolean }) {
  const router = useRouter();
  const { accessToken } = useWorkspace();
  const norm = normJobPayload(payload);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedId, setImportedId] = useState<string | null>(null);

  const statusColor = JOB_STATUS_COLORS[norm.status] ?? 'bg-gray-100 text-gray-700';

  const handleClick = () => {
    if (importedId) {
      router.push(`/app/leads/${importedId}`);
    } else if (isMine) {
      router.push(`/app/jobs/${norm.entityId}`);
    } else {
      setShowImport(true);
    }
  };

  const handleImport = async () => {
    if (!accessToken) return;
    setImporting(true);
    try {
      const noteParts = [
        norm.notes,
        norm.phone ? `Phone: ${norm.phone}` : null,
        norm.email ? `Email: ${norm.email}` : null,
        norm.addressLine1 ? `Address: ${norm.addressLine1}` : null,
        norm.city ? `City: ${norm.city}` : null,
        norm.scheduledDate ? `Scheduled: ${norm.scheduledDate}` : null,
      ].filter(Boolean).join('\n');

      // Import as Lead (matches Android behaviour)
      const res = await fetch('/api/workspace/leads', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: norm.name || 'Imported from job',
          status: 'new',
          source: 'TissChat import (Job)',
          value_estimate: norm.includeValues && norm.value ? norm.value : null,
          notes: noteParts || `Imported from chat job: ${norm.name}`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setImportedId(data.lead?.id ?? null);
        setShowImport(false);
      }
    } catch { /* non-fatal */ }
    finally { setImporting(false); }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${
          isMine
            ? 'border-blue-400/30 bg-blue-500/20 hover:bg-blue-500/30'
            : 'border-gray-200 bg-white hover:bg-gray-50'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${isMine ? 'text-blue-200' : 'text-slate-600'}`}>🔧</span>
              <p className={`truncate text-sm font-semibold ${isMine ? 'text-white' : 'text-slate-900'}`}>
                {norm.name}
              </p>
            </div>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}>
            {norm.status.replace('_', ' ')}
          </span>
        </div>
        {norm.includeValues && norm.value != null && norm.value > 0 && (
          <p className={`mt-1 text-xs font-medium ${isMine ? 'text-blue-100' : 'text-slate-600'}`}>
            Value: {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(norm.value)}
          </p>
        )}
        {norm.scheduledDate && (
          <p className={`mt-0.5 text-[11px] ${isMine ? 'text-blue-200' : 'text-slate-400'}`}>
            Scheduled: {new Date(norm.scheduledDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
        {!isMine && !importedId && (
          <p className="mt-1.5 text-[11px] font-medium text-blue-600">Tap to import as lead</p>
        )}
        {importedId && (
          <p className="mt-1.5 text-[11px] font-medium text-green-600">✅ Imported — tap to view</p>
        )}
      </button>

      {showImport && (
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="flex-1 text-xs text-slate-600">Import this job as a lead?</p>
          <button
            type="button"
            onClick={handleImport}
            disabled={importing}
            className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {importing ? 'Importing…' : 'Import'}
          </button>
          <button
            type="button"
            onClick={() => setShowImport(false)}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ─── INVOICE Card ───────────────────────────────────────────────────────────

function InvoiceCard({ payload, isMine }: { payload: ChatInvoicePayload; isMine: boolean }) {
  const router = useRouter();
  const statusColor = INVOICE_STATUS_COLORS[payload.status] ?? 'bg-gray-100 text-gray-700';

  return (
    <button
      type="button"
      onClick={() => router.push('/app/invoices')}
      className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${
        isMine
          ? 'border-blue-400/30 bg-blue-500/20 hover:bg-blue-500/30'
          : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${isMine ? 'text-blue-200' : 'text-slate-600'}`}>🧾</span>
            <p className={`truncate text-sm font-semibold ${isMine ? 'text-white' : 'text-slate-900'}`}>
              {payload.invoice_number}
            </p>
          </div>
          {payload.client_name && (
            <p className={`mt-0.5 truncate text-xs ${isMine ? 'text-blue-200' : 'text-slate-500'}`}>
              {payload.client_name}
            </p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}>
          {payload.status}
        </span>
      </div>
      {payload.total != null && (
        <p className={`mt-1 text-xs font-medium ${isMine ? 'text-blue-100' : 'text-slate-600'}`}>
          Total: {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(payload.total)}
        </p>
      )}
      {payload.due_date && (
        <p className={`mt-0.5 text-[11px] ${isMine ? 'text-blue-200' : 'text-slate-400'}`}>
          Due: {new Date(payload.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      )}
    </button>
  );
}

// ─── QUOTE Card ─────────────────────────────────────────────────────────────

function QuoteCard({ payload, isMine }: { payload: ChatQuotePayload; isMine: boolean }) {
  const router = useRouter();
  const statusColor = QUOTE_STATUS_COLORS[payload.status] ?? 'bg-gray-100 text-gray-700';

  return (
    <button
      type="button"
      onClick={() => router.push('/app/quotes')}
      className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${
        isMine
          ? 'border-blue-400/30 bg-blue-500/20 hover:bg-blue-500/30'
          : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${isMine ? 'text-blue-200' : 'text-slate-600'}`}>📋</span>
            <p className={`truncate text-sm font-semibold ${isMine ? 'text-white' : 'text-slate-900'}`}>
              {payload.quote_title}
            </p>
          </div>
          {payload.client_name && (
            <p className={`mt-0.5 truncate text-xs ${isMine ? 'text-blue-200' : 'text-slate-500'}`}>
              {payload.client_name}
            </p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}>
          {payload.status}
        </span>
      </div>
      {payload.total != null && (
        <p className={`mt-1 text-xs font-medium ${isMine ? 'text-blue-100' : 'text-slate-600'}`}>
          Total: {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(payload.total)}
        </p>
      )}
      {payload.valid_until && (
        <p className={`mt-0.5 text-[11px] ${isMine ? 'text-blue-200' : 'text-slate-400'}`}>
          Valid until: {new Date(payload.valid_until).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      )}
    </button>
  );
}

// ─── ASSET Card ─────────────────────────────────────────────────────────────

function AssetCard({ payload, isMine }: { payload: ChatAssetPayload; isMine: boolean }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push('/app/assets')}
      className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${
        isMine
          ? 'border-blue-400/30 bg-blue-500/20 hover:bg-blue-500/30'
          : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${isMine ? 'text-blue-200' : 'text-slate-600'}`}>📦</span>
            <p className={`truncate text-sm font-semibold ${isMine ? 'text-white' : 'text-slate-900'}`}>
              {payload.asset_name}
            </p>
          </div>
          {payload.asset_type && (
            <p className={`mt-0.5 truncate text-xs ${isMine ? 'text-blue-200' : 'text-slate-500'}`}>
              {payload.asset_type}
            </p>
          )}
        </div>
        {payload.status && (
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
            {payload.status}
          </span>
        )}
      </div>
      {payload.serial_number && (
        <p className={`mt-1 text-[11px] ${isMine ? 'text-blue-200' : 'text-slate-400'}`}>
          S/N: {payload.serial_number}
        </p>
      )}
    </button>
  );
}

// ─── CLIENT PROFILE Card (received → import as lead, own → confirmation) ────

function ClientProfileCard({ payload, isMine }: { payload: ChatClientProfilePayload; isMine: boolean }) {
  const router = useRouter();
  const { accessToken } = useWorkspace();
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importedId, setImportedId] = useState<string | null>(null);

  const handleClick = () => {
    if (importedId) {
      router.push(`/app/leads/${importedId}`);
    } else if (!isMine) {
      setShowImport(true);
    }
  };

  const handleImport = async () => {
    if (!accessToken) return;
    setImporting(true);
    try {
      const noteParts = [
        payload.phone ? `Phone: ${payload.phone}` : null,
        payload.email ? `Email: ${payload.email}` : null,
        payload.address ? `Address: ${payload.address}` : null,
      ].filter(Boolean).join('\n');

      const res = await fetch('/api/workspace/leads', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: payload.name || 'Imported contact',
          status: 'new',
          source: 'TissChat import (Contact)',
          notes: noteParts || `Imported from chat contact: ${payload.name}`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setImportedId(data.lead?.id ?? null);
        setShowImport(false);
      }
    } catch { /* non-fatal */ }
    finally { setImporting(false); }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${
          isMine
            ? 'border-blue-400/30 bg-blue-500/20 hover:bg-blue-500/30'
            : 'border-gray-200 bg-white hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">👤</span>
          <p className={`truncate text-sm font-semibold ${isMine ? 'text-white' : 'text-slate-900'}`}>
            {payload.name}
          </p>
        </div>
        {payload.phone && (
          <p className={`mt-0.5 text-xs ${isMine ? 'text-blue-200' : 'text-slate-500'}`}>
            📞 {payload.phone}
          </p>
        )}
        {payload.email && (
          <p className={`mt-0.5 text-xs ${isMine ? 'text-blue-200' : 'text-slate-500'}`}>
            ✉️ {payload.email}
          </p>
        )}
        {payload.address && (
          <p className={`mt-0.5 text-xs ${isMine ? 'text-blue-200' : 'text-slate-500'}`}>
            📍 {payload.address}
          </p>
        )}
        {!isMine && !importedId && (
          <p className="mt-1.5 text-[11px] font-medium text-blue-600">Tap to import as lead</p>
        )}
        {importedId && (
          <p className="mt-1.5 text-[11px] font-medium text-green-600">✅ Imported — tap to view</p>
        )}
      </button>

      {showImport && (
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="flex-1 text-xs text-slate-600">Import this contact as a lead?</p>
          <button
            type="button"
            onClick={handleImport}
            disabled={importing}
            className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {importing ? 'Importing…' : 'Import'}
          </button>
          <button
            type="button"
            onClick={() => setShowImport(false)}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ─── CARD Card ──────────────────────────────────────────────────────────────

function CardCard({ payload, isMine }: { payload: ChatCardPayload; isMine: boolean }) {
  const inner = (
    <div
      className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${
        isMine
          ? 'border-blue-400/30 bg-blue-500/20 hover:bg-blue-500/30'
          : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`text-sm ${isMine ? 'text-blue-200' : 'text-slate-600'}`}>🃏</span>
        <p className={`truncate text-sm font-semibold ${isMine ? 'text-white' : 'text-slate-900'}`}>
          {payload.card_title}
        </p>
      </div>
      {payload.card_description && (
        <p className={`mt-0.5 truncate text-xs ${isMine ? 'text-blue-200' : 'text-slate-500'}`}>
          {payload.card_description}
        </p>
      )}
    </div>
  );

  if (payload.card_url) {
    return (
      <a href={payload.card_url} target="_blank" rel="noopener noreferrer" className="block">
        {inner}
      </a>
    );
  }

  return inner;
}

// ─── Main Dispatcher ────────────────────────────────────────────────────────

interface StructuredMessageCardProps {
  message: ChatMessage;
  isMine: boolean;
  signedUrlResolver?: (bucket: string, path: string) => string | null;
}

export function StructuredMessageCard({ message, isMine, signedUrlResolver }: StructuredMessageCardProps) {
  const payload = parsePayload(message.payload);

  // Fallback: if payload can't be parsed, render body as text
  if (!payload) {
    return <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>;
  }

  if (isImagePayload(payload)) return <ImageCard payload={payload} isMine={isMine} signedUrlResolver={signedUrlResolver} />;
  if (isDocumentPayload(payload)) return <DocumentCard payload={payload} isMine={isMine} signedUrlResolver={signedUrlResolver} />;
  if (isLeadPayload(payload)) return <LeadCard payload={payload} isMine={isMine} />;
  if (isJobPayload(payload)) return <JobCard payload={payload} isMine={isMine} />;
  if (isClientProfilePayload(payload)) return <ClientProfileCard payload={payload} isMine={isMine} />;
  if (isInvoicePayload(payload)) return <InvoiceCard payload={payload} isMine={isMine} />;
  if (isQuotePayload(payload)) return <QuoteCard payload={payload} isMine={isMine} />;
  if (isAssetPayload(payload)) return <AssetCard payload={payload} isMine={isMine} />;
  if (isCardPayload(payload)) return <CardCard payload={payload} isMine={isMine} />;

  // Unknown structured type — render body text as fallback
  return <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>;
}
