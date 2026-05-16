// src/app/(member)/app/settings/currency/page.tsx
//
// Settings → Payments → Currency
// Select the workspace default currency (GBP / EUR / USD).
// Persists to document_pdf_info.default_currency via the existing API.

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY, type CurrencyCode } from '@/lib/currency';

export default function CurrencySettingsPage() {
  const { accessToken } = useWorkspace();
  const [selected, setSelected] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [saved, setSaved] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Load current setting
  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const res = await fetch('/api/workspace/document-pdf-info', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return;
        const { info } = await res.json();
        const code = (info?.default_currency ?? DEFAULT_CURRENCY).toUpperCase() as CurrencyCode;
        const valid = SUPPORTED_CURRENCIES.some((c) => c.code === code);
        const value = valid ? code : DEFAULT_CURRENCY;
        setSelected(value);
        setSaved(value);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  const handleSave = async () => {
    if (!accessToken || saving) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/workspace/document-pdf-info', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ default_currency: selected }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(selected);
      setStatus('Currency updated successfully.');
    } catch {
      setStatus('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isDirty = selected !== saved;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/app/settings"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 transition-colors"
      >
        ← Back to Settings
      </Link>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
        <h1 className="text-xl font-bold text-slate-900">Default Currency</h1>
        <p className="mt-1 text-sm text-slate-600">
          Choose the default currency for new quotes, invoices, and pricing displays across your workspace.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Already-generated documents keep their original currency.
        </p>

        {loading ? (
          <div className="mt-6 text-sm text-slate-400">Loading…</div>
        ) : (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {SUPPORTED_CURRENCIES.map((cur) => {
                const active = selected === cur.code;
                return (
                  <button
                    key={cur.code}
                    type="button"
                    onClick={() => { setSelected(cur.code); setStatus(null); }}
                    className={`relative rounded-xl border-2 px-5 py-4 text-left transition-all ${
                      active
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-2xl font-bold text-slate-900">{cur.symbol}</span>
                    <span className="ml-2 text-sm font-semibold text-slate-800">{cur.code}</span>
                    <p className="mt-1 text-xs text-slate-600">{cur.label}</p>
                    {active && (
                      <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white text-xs">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Save button */}
            <div className="mt-6 flex items-center gap-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || saving}
                className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors ${
                  isDirty && !saving
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>

              {status && (
                <span
                  className={`text-sm font-medium ${
                    status.includes('success') ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {status}
                </span>
              )}
            </div>
          </>
        )}
      </section>

      {/* Info box */}
      <section className="rounded-2xl border border-amber-200/60 bg-amber-50 p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.35)]">
        <h2 className="text-sm font-semibold text-slate-800">What this affects</h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-700 list-disc list-inside">
          <li>New quotes and invoices will use the selected currency</li>
          <li>Pricing displays, totals, and PDF generation</li>
          <li>Document rows created going forward</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Previously generated documents retain their original currency and are not affected.
        </p>
      </section>
    </div>
  );
}
