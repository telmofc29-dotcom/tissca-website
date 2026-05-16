// src/app/(member)/app/settings/document-pdf-info/page.tsx
//
// Document PDF Info settings page.
// Company Identity, Contact Details, Payment Details, VAT, Logo, Brand Colour.
// Reads/writes public.document_pdf_info via /api/workspace/document-pdf-info.

'use client';

import { useEffect, useState, useRef } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { isPro } from '@/lib/plans';
import type { PlanTier } from '@/lib/plans';
import Link from 'next/link';

type PdfInfo = {
  business_structure: string;
  company_name: string;
  trading_name: string;
  company_number: string;
  contact_name: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  postcode: string;
  phone: string;
  email: string;
  bank_name: string;
  account_name: string;
  sort_code: string;
  account_number: string;
  iban: string;
  swift_bic: string;
  routing_number: string;
  vat_enabled: boolean;
  vat_number: string;
  vat_rate: number;
  logo_url: string;
  tagline: string;
  brand_color: string;
};

const blank: PdfInfo = {
  business_structure: 'sole_trader',
  company_name: '', trading_name: '', company_number: '',
  contact_name: '', address_line_1: '', address_line_2: '', city: '', postcode: '', phone: '', email: '',
  bank_name: '', account_name: '', sort_code: '', account_number: '', iban: '', swift_bic: '', routing_number: '',
  vat_enabled: false, vat_number: '', vat_rate: 20,
  logo_url: '', tagline: '', brand_color: '#1e40af',
};

export default function DocumentPdfInfoPage() {
  const { accessToken, workspace } = useWorkspace();
  const planTier = (workspace?.plan_tier ?? 'free') as PlanTier;
  const proUser = isPro(planTier);

  const [info, setInfo] = useState<PdfInfo>(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [modeBanner, setModeBanner] = useState<string | null>(null);

  // Load
  useEffect(() => {
    if (!accessToken) return;
    (async () => {
      try {
        const res = await fetch('/api/workspace/document-pdf-info', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.status === 403) {
          const err = await res.json().catch(() => ({}));
          setAccessDenied(err.error ?? 'Access denied');
          return;
        }
        if (!res.ok) return;
        const { info: data } = await res.json();
        if (data) {
          setInfo({
            business_structure: data.business_structure || 'sole_trader',
            company_name: data.company_name || '',
            trading_name: data.trading_name || '',
            company_number: data.company_number || '',
            contact_name: data.contact_name || '',
            address_line_1: data.address_line_1 || '',
            address_line_2: data.address_line_2 || '',
            city: data.city || '',
            postcode: data.postcode || '',
            phone: data.phone || '',
            email: data.email || '',
            bank_name: data.bank_name || '',
            account_name: data.account_name || '',
            sort_code: data.sort_code || '',
            account_number: data.account_number || '',
            iban: data.iban || '',
            swift_bic: data.swift_bic || '',
            routing_number: data.routing_number || '',
            vat_enabled: data.vat_enabled ?? false,
            vat_number: data.vat_number || '',
            vat_rate: data.vat_rate ?? 20,
            logo_url: data.logo_url || '',
            tagline: data.tagline || '',
            brand_color: data.brand_color || '#1e40af',
          });
        }
      } catch { /* silent */ } finally { setLoading(false); }
    })();
  }, [accessToken]);

  // Save
  async function handleSave() {
    if (!accessToken) return;
    if (info.business_structure === 'limited_company' && !info.company_number.trim()) {
      setStatus('Company Number is required for Limited Companies');
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/workspace/document-pdf-info', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(info),
      });
      setStatus(res.ok ? 'Saved successfully' : 'Save failed');
      if (res.ok) setTimeout(() => setStatus(null), 3000);
    } catch { setStatus('Save failed'); }
    finally { setSaving(false); }
  }

  // Logo upload
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await fetch('/api/workspace/document-pdf-info', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd,
      });
      if (res.ok) {
        const { logo_url } = await res.json();
        setInfo((p) => ({ ...p, logo_url }));
        setStatus('Logo uploaded');
        setTimeout(() => setStatus(null), 3000);
      } else {
        const err = await res.json();
        setStatus(err.error || 'Upload failed');
      }
    } catch { setStatus('Upload failed'); }
    finally { setUploading(false); }
  }

  function handleRemoveLogo() {
    setInfo((p) => ({ ...p, logo_url: '' }));
  }

  // ─── Shared field renderer ────────────────────────────────────────────

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-300 transition-colors';

  function field(key: keyof PdfInfo, label: string, opts?: { type?: string; placeholder?: string }) {
    return (
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
        <input
          type={opts?.type || 'text'}
          value={String(info[key] ?? '')}
          onChange={(e) => setInfo((p) => ({ ...p, [key]: opts?.type === 'number' ? Number(e.target.value) : e.target.value }))}
          placeholder={opts?.placeholder}
          className={inputClass}
        />
      </div>
    );
  }

  const sectionClass = 'rounded-2xl border border-gray-200 bg-white p-5 space-y-3 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.12)]';
  const headingClass = 'flex items-center gap-2 text-sm font-semibold text-slate-900';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="max-w-2xl mx-auto text-center text-slate-400 py-20">Loading…</div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <p className="text-4xl">🔒</p>
          <h2 className="mt-3 text-lg font-semibold text-amber-800">Access Restricted</h2>
          <p className="mt-2 text-sm text-amber-700">{accessDenied}</p>
          <Link
            href="/app/settings"
            className="mt-4 inline-block rounded-full border border-amber-200 bg-white px-5 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50"
          >
            ← Back to Settings
          </Link>
        </div>
      </div>
    );
  }

  const isLimitedCompany = info.business_structure === 'limited_company';

  return (
    <div className="space-y-6">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <Link
            href="/app/settings"
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-gray-50 transition-colors"
          >
            ← Settings
          </Link>
          <h1 className="text-xl font-bold text-slate-900 mt-3">Document PDF Info</h1>
          <p className="text-sm text-slate-500 mt-1">
            Company, contact, banking, VAT and branding details shown on your quotes and invoices.
          </p>
        </div>

        {/* Mode Switch Banner */}
        {modeBanner && (
          <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100/60 px-4 py-3 text-center shadow-sm transition-all">
            <p className="text-sm font-semibold text-amber-800">{modeBanner}</p>
          </div>
        )}

        {/* Company Identity */}
        <div className={sectionClass}>
          <p className={headingClass}>🏢 Company Identity</p>
          <p className="text-xs text-slate-400">Your registered business details for legal documents.</p>

          {/* Business Structure */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Business Structure</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setInfo((p) => ({ ...p, business_structure: 'sole_trader' }));
                  setModeBanner('Sole Trader mode enabled');
                  setTimeout(() => setModeBanner(null), 3000);
                }}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  info.business_structure === 'sole_trader'
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-gray-200 bg-white text-slate-600 hover:bg-gray-50'
                }`}
              >
                Sole Trader
              </button>
              <button
                type="button"
                onClick={() => {
                  setInfo((p) => ({ ...p, business_structure: 'limited_company' }));
                  setModeBanner('Limited Company mode enabled');
                  setTimeout(() => setModeBanner(null), 3000);
                }}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  info.business_structure === 'limited_company'
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-gray-200 bg-white text-slate-600 hover:bg-gray-50'
                }`}
              >
                Limited Company
              </button>
            </div>
          </div>

          {field('company_name', isLimitedCompany ? 'Legal Company Name *' : 'Business Name *', {
            placeholder: isLimitedCompany ? 'Your Company Ltd' : 'Your Business Name',
          })}
          <div className="grid grid-cols-2 gap-3">
            {field('trading_name', 'Trading Name', { placeholder: 'Trading As…' })}
            {isLimitedCompany && field('company_number', 'Company Number *', { placeholder: '12345678' })}
          </div>
          {field('tagline', 'Tagline', { placeholder: 'Quality craftsmanship, every time' })}
        </div>

        {/* Contact Details */}
        <div className={sectionClass}>
          <p className={headingClass}>📍 Contact Details</p>
          <p className="text-xs text-slate-400">Shown in the footer of your generated documents.</p>
          {field('contact_name', 'Contact Name')}
          {field('address_line_1', 'Address Line 1')}
          {field('address_line_2', 'Address Line 2')}
          <div className="grid grid-cols-2 gap-3">
            {field('city', 'City')}
            {field('postcode', 'Postcode')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field('phone', 'Phone')}
            {field('email', 'Email', { type: 'email' })}
          </div>
        </div>

        {/* Payment Details */}
        <div className={sectionClass}>
          <p className={headingClass}>💳 Payment Details</p>
          <p className="text-xs text-slate-400">
            Only filled fields are printed. Use the fields that match your region.
          </p>

          {field('bank_name', 'Bank Name')}
          {field('account_name', 'Account Name')}

          {/* UK-style */}
          <div className="grid grid-cols-2 gap-3">
            {field('sort_code', 'Sort Code', { placeholder: '00-00-00' })}
            {field('account_number', 'Account Number', { placeholder: '00000000' })}
          </div>

          {/* International */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 space-y-3">
            <p className="text-xs font-medium text-slate-500">International Banking</p>
            {field('iban', 'IBAN', { placeholder: 'GB00 XXXX 0000 0000 0000 00' })}
            <div className="grid grid-cols-2 gap-3">
              {field('swift_bic', 'SWIFT / BIC', { placeholder: 'XXXXGB2L' })}
              {field('routing_number', 'Routing Number', { placeholder: '000000000' })}
            </div>
          </div>
        </div>

        {/* VAT */}
        <div className={sectionClass}>
          <p className={headingClass}>🧾 VAT</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">VAT Registered</span>
            <button
              onClick={() => setInfo((p) => ({ ...p, vat_enabled: !p.vat_enabled }))}
              className={`relative h-6 w-11 rounded-full transition-colors ${info.vat_enabled ? 'bg-amber-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${info.vat_enabled ? 'translate-x-[20px]' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {info.vat_enabled && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              {field('vat_number', 'VAT Number', { placeholder: 'GB 123 4567 89' })}
              {field('vat_rate', 'VAT Rate (%)', { type: 'number' })}
            </div>
          )}
        </div>

        {/* Logo */}
        <div className={sectionClass}>
          <p className={headingClass}>🖼️ Logo</p>
          <p className="text-xs text-slate-400">
            Your logo appears in the header of generated PDFs.
            {!proUser && ' Logo upload is available to Pro and Team plans.'}
          </p>
          {proUser ? (
            <>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoUpload} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : '⬆ Upload Logo'}
              </button>

              {info.logo_url && (
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={info.logo_url} alt="Logo" className="h-10 w-10 rounded-lg object-contain bg-white border border-gray-100" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">Logo selected</p>
                    <p className="text-[10px] text-slate-400">This image will appear in generated PDFs</p>
                  </div>
                  <button onClick={handleRemoveLogo} className="text-xs text-red-500 hover:text-red-600 font-medium">Remove</button>
                </div>
              )}
            </>
          ) : (
            <Link
              href="/app/settings/subscription"
              className="inline-block rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors"
            >
              Upgrade to Pro
            </Link>
          )}
        </div>

        {/* Brand Colour */}
        <div className={sectionClass}>
          <p className={headingClass}>🎨 Brand Colour</p>
          <p className="text-xs text-slate-400">Used as the accent colour in PDF headers and separators.</p>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={info.brand_color}
              onChange={(e) => setInfo((p) => ({ ...p, brand_color: e.target.value }))}
              className="h-10 w-10 rounded-lg border border-gray-200 bg-white cursor-pointer"
            />
            <input
              value={info.brand_color}
              onChange={(e) => setInfo((p) => ({ ...p, brand_color: e.target.value }))}
              className="w-28 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-300"
            />
            <div className="h-8 w-8 rounded-lg border border-gray-200" style={{ backgroundColor: info.brand_color }} />
          </div>
        </div>

        {/* Status + Save */}
        {status && (
          <div className={`rounded-xl border px-4 py-2.5 text-center text-sm font-medium ${
            (status === 'Saved successfully' || status === 'Logo uploaded') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            {status}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50 shadow-[0_8px_30px_-8px_rgba(245,158,11,0.4)]"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
