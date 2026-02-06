'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getSupabaseClient,
  getOrCreateAppProfile,
  updateAppProfile,
  type AppProfile,
} from '@/lib/supabase';
import { formatPlanLabel, isPro, isTeam } from '@/lib/plans';

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          setError('Supabase is not configured.');
          setLoading(false);
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        const appProfile = await getOrCreateAppProfile(user);
        setProfile(appProfile);
        setEmail(appProfile.email || user.email || '');
        setFullName(appProfile.full_name || '');
        setCompanyName(appProfile.company_name || '');
        setPhone(appProfile.phone || '');
      } catch (err: any) {
        console.error('[Account] Failed to load profile:', err);
        setError('Failed to load profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updated = await updateAppProfile(profile.id, {
        full_name: fullName.trim() || null,
        company_name: companyName.trim() || null,
        phone: phone.trim() || null,
        plan: profile.plan,
      });

      setProfile(updated);
      setSuccess('Profile updated successfully.');
    } catch (err: any) {
      console.error('[Account] Failed to update profile:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 md:p-12">
        <div className="max-w-3xl">
          <p className="text-gray-600">Loading your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-12">
      <div className="max-w-3xl">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Account
          </h1>
          <p className="text-gray-600">
            Manage your profile details and plan.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Signed in as</p>
              <p className="text-lg font-semibold text-slate-900">{email || '—'}</p>
            </div>
            <span
              className={`rounded-full px-4 py-1 text-sm font-semibold ${
                isTeam(profile?.plan)
                  ? 'bg-indigo-100 text-indigo-700'
                  : isPro(profile?.plan)
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-700'
              }`}
            >
              {formatPlanLabel(profile?.plan)} Plan
            </span>
          </div>
        </div>

        <form
          onSubmit={handleSave}
          className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="companyName">
              Company name
            </label>
            <input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Your company"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700" htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="+44 7xxx xxx xxx"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Plan changes are managed via your subscription settings.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
