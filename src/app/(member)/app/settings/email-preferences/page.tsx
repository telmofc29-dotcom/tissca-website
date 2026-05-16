// src/app/(member)/app/settings/email-preferences/page.tsx
//
// PURPOSE:
// Member page for managing email communication preferences.
// Reads/writes real data from user_email_preferences via API.

'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useLanguage } from '@/i18n/LanguageProvider';
import { trackEvent } from '@/utils/analytics';

interface EmailPrefs {
  product_updates: boolean;
  feature_emails: boolean;
  upgrade_emails: boolean;
  billing_emails: boolean;
  reminder_emails: boolean;
  support_followup: boolean;
  weekly_summary: boolean;
  unsubscribed_all: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
}

const defaultPrefs: EmailPrefs = {
  product_updates: true,
  feature_emails: true,
  upgrade_emails: true,
  billing_emails: true,
  reminder_emails: true,
  support_followup: true,
  weekly_summary: true,
  unsubscribed_all: false,
  frequency: 'immediate',
};

export default function EmailPreferencesPage() {
  const { t } = useLanguage();
  const ep = t.member.settings.emailPreferences;
  const [prefs, setPrefs] = useState<EmailPrefs>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const getToken = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const res = await fetch('/api/user/email-preferences', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          setPrefs({
            product_updates: data.product_updates ?? true,
            feature_emails: data.feature_emails ?? true,
            upgrade_emails: data.upgrade_emails ?? true,
            billing_emails: data.billing_emails ?? true,
            reminder_emails: data.reminder_emails ?? true,
            support_followup: data.support_followup ?? true,
            weekly_summary: data.weekly_summary ?? true,
            unsubscribed_all: data.unsubscribed_all ?? false,
            frequency: data.frequency ?? 'immediate',
          });
        }

        trackEvent('feature_view', '/app/settings/email-preferences', {
          eventLabel: 'email_prefs_viewed',
          metadata: { feature: 'email_preferences', action: 'view' },
        });
      } catch {
        // Silently fail — defaults are sensible
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [getToken]);

  const save = async (updated: EmailPrefs) => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/user/email-preferences', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updated),
      });

      if (!res.ok) throw new Error('Save failed');
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (field: keyof EmailPrefs) => {
    if (field === 'frequency') return;
    const updated = { ...prefs, [field]: !prefs[field] };
    // If unsubscribing all, turn everything off
    if (field === 'unsubscribed_all' && updated.unsubscribed_all) {
      updated.product_updates = false;
      updated.feature_emails = false;
      updated.upgrade_emails = false;
      updated.reminder_emails = false;
      updated.weekly_summary = false;
    }
    // If re-enabling any category, turn off unsubscribed_all
    if (field !== 'unsubscribed_all' && updated[field] === true) {
      updated.unsubscribed_all = false;
    }
    setPrefs(updated);
    save(updated);
  };

  const setFrequency = (freq: 'immediate' | 'daily' | 'weekly') => {
    const updated = { ...prefs, frequency: freq };
    setPrefs(updated);
    save(updated);
  };

  const toggleItems: { key: keyof EmailPrefs; label: string; desc: string }[] = [
    { key: 'product_updates', label: ep.productUpdates, desc: ep.productUpdatesDesc },
    { key: 'feature_emails', label: ep.featureEmails, desc: ep.featureEmailsDesc },
    { key: 'upgrade_emails', label: ep.upgradeEmails, desc: ep.upgradeEmailsDesc },
    { key: 'billing_emails', label: ep.billingEmails, desc: ep.billingEmailsDesc },
    { key: 'reminder_emails', label: ep.reminderEmails, desc: ep.reminderEmailsDesc },
    { key: 'support_followup', label: ep.supportFollowup, desc: ep.supportFollowupDesc },
    { key: 'weekly_summary', label: ep.weeklySummary, desc: ep.weeklySummaryDesc },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/app/settings"
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-gray-50"
        >
          ← {ep.backToSettings}
        </Link>
        <h1 className="text-xl font-bold text-slate-900">{ep.title}</h1>
      </div>

      {/* Save status */}
      {saveStatus === 'success' && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {ep.saveSuccess}
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {ep.saveError}
        </div>
      )}

      {/* Unsubscribe All */}
      <section className="rounded-2xl border border-red-200/60 bg-red-50/50 p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{ep.unsubscribeAll}</h2>
            <p className="mt-0.5 text-sm text-slate-600">{ep.unsubscribeAllDesc}</p>
          </div>
          <button
            onClick={() => toggle('unsubscribed_all')}
            disabled={saving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              prefs.unsubscribed_all ? 'bg-red-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                prefs.unsubscribed_all ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Category toggles */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
        <h2 className="text-lg font-semibold text-slate-900">{ep.categories}</h2>
        <p className="mt-1 text-sm text-slate-500">{ep.categoriesDesc}</p>

        <div className="mt-4 space-y-1">
          {toggleItems.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 hover:bg-gray-50"
            >
              <div>
                <span className="text-sm font-medium text-slate-800">{item.label}</span>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
              <button
                onClick={() => toggle(item.key)}
                disabled={saving || prefs.unsubscribed_all}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  prefs[item.key] && !prefs.unsubscribed_all ? 'bg-amber-500' : 'bg-gray-300'
                } ${prefs.unsubscribed_all ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    prefs[item.key] && !prefs.unsubscribed_all ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Frequency */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
        <h2 className="text-lg font-semibold text-slate-900">{ep.frequencyTitle}</h2>
        <p className="mt-1 text-sm text-slate-500">{ep.frequencyDesc}</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {(['immediate', 'daily', 'weekly'] as const).map((freq) => (
            <button
              key={freq}
              onClick={() => setFrequency(freq)}
              disabled={saving}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                prefs.frequency === freq
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : 'border-gray-200 bg-white text-slate-700 hover:bg-gray-50'
              }`}
            >
              {ep.frequencies[freq]}
            </button>
          ))}
        </div>
      </section>

      {/* Essential notice */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-xs text-blue-800">
        {ep.essentialNotice}
      </div>
    </div>
  );
}
