// src/app/(member)/app/settings/personal-details/page.tsx
//
// Personal Details settings page.
// Manages: full name, date of birth, phone, address.
// Syncs with user_profiles table via Supabase client.
// Email is NOT here — it lives in Security.

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient, getOrCreateAppProfile, updateAppProfile } from '@/lib/supabase';
import { useLanguage } from '@/i18n/LanguageProvider';

type FormData = {
  full_name: string;
  date_of_birth: string;
  phone: string;
  address: string;
};

const emptyForm: FormData = {
  full_name: '',
  date_of_birth: '',
  phone: '',
  address: '',
};

export default function PersonalDetailsPage() {
  const { t } = useLanguage();
  const s = t.member.settings.personalDetails;

  const [form, setForm] = useState<FormData>(emptyForm);
  const [saved, setSaved] = useState<FormData>(emptyForm);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setUserId(user.id);

        const profile = await getOrCreateAppProfile(user);
        const data: FormData = {
          full_name: profile.full_name ?? '',
          date_of_birth: profile.date_of_birth ?? '',
          phone: profile.phone ?? '',
          address: profile.address ?? '',
        };
        setForm(data);
        setSaved(data);
      } catch (err) {
        console.error('[PersonalDetails] Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const isDirty =
    form.full_name !== saved.full_name ||
    form.date_of_birth !== saved.date_of_birth ||
    form.phone !== saved.phone ||
    form.address !== saved.address;

  const handleSave = async () => {
    if (!userId || saving || !isDirty) return;
    setSaving(true);
    setStatus(null);

    try {
      await updateAppProfile(userId, {
        full_name: form.full_name || null,
        date_of_birth: form.date_of_birth || null,
        phone: form.phone || null,
        address: form.address || null,
      });
      setSaved({ ...form });
      setStatus(s.saveSuccess);
    } catch (err) {
      console.error('[PersonalDetails] Save error:', err);
      setStatus(s.saveError);
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <div className="space-y-6">
      <Link
        href="/app/settings"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 transition-colors"
      >
        ← {s.backToSettings}
      </Link>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
        <h1 className="text-xl font-bold text-slate-900">{s.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{s.subtitle}</p>

        {loading ? (
          <div className="mt-6 text-sm text-slate-400">Loading…</div>
        ) : (
          <div className="mt-6 space-y-5">
            {/* Full Name */}
            <div>
              <label htmlFor="pd-name" className={labelClass}>{s.fullName}</label>
              <input
                id="pd-name"
                type="text"
                value={form.full_name}
                onChange={(e) => { setForm({ ...form, full_name: e.target.value }); setStatus(null); }}
                placeholder={s.fullName}
                className={fieldClass}
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="pd-dob" className={labelClass}>{s.dateOfBirth}</label>
              <input
                id="pd-dob"
                type="date"
                value={form.date_of_birth}
                onChange={(e) => { setForm({ ...form, date_of_birth: e.target.value }); setStatus(null); }}
                className={fieldClass}
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="pd-phone" className={labelClass}>{s.phone}</label>
              <input
                id="pd-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => { setForm({ ...form, phone: e.target.value }); setStatus(null); }}
                placeholder={s.phone}
                className={fieldClass}
              />
            </div>

            {/* Address */}
            <div>
              <label htmlFor="pd-address" className={labelClass}>{s.address}</label>
              <textarea
                id="pd-address"
                value={form.address}
                onChange={(e) => { setForm({ ...form, address: e.target.value }); setStatus(null); }}
                placeholder={s.address}
                rows={3}
                className={fieldClass}
              />
            </div>

            {/* Save */}
            <div className="flex items-center gap-4 pt-2">
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
                {saving ? s.saving : s.save}
              </button>

              {status && (
                <span
                  className={`text-sm font-medium ${
                    status === s.saveSuccess ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {status}
                </span>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
