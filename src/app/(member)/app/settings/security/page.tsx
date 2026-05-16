// src/app/(member)/app/settings/security/page.tsx
//
// Security settings page.
// Manages: account email, password change, password reset.
// All actions go through real Supabase auth flows.
// Email changes trigger Supabase verification emails.

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseClient, resetPassword as sendResetEmail } from '@/lib/supabase';
import { useLanguage } from '@/i18n/LanguageProvider';

export default function SecurityPage() {
  const { t } = useLanguage();
  const s = t.member.settings.security;

  // — Email state —
  const [originalEmail, setOriginalEmail] = useState<string>('');
  const [email, setEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  // — Password state —
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  // — Reset state —
  const [resetSending, setResetSending] = useState(false);
  const [resetStatus, setResetStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setOriginalEmail(user.email);
          setEmail(user.email);
        }
      } catch (err) {
        console.error('[Security] Failed to load user:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // ——— Email update ———
  const emailDirty = email.trim() !== '' && email.trim() !== originalEmail;

  const handleEmailUpdate = async () => {
    if (!emailDirty || emailSaving) return;
    setEmailSaving(true);
    setEmailStatus(null);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not initialized');

      // Supabase sends a verification email to the new address.
      // The email change only takes effect after the user confirms.
      const { error } = await supabase.auth.updateUser({
        email: email.trim(),
      });

      if (error) throw error;

      setEmailStatus({ ok: true, msg: s.emailUpdateSuccess });
    } catch (err: any) {
      console.error('[Security] Email update error:', err);
      setEmailStatus({ ok: false, msg: err?.message || s.emailUpdateVerify });
    } finally {
      setEmailSaving(false);
    }
  };

  // ——— Password update ———
  const handlePasswordUpdate = async () => {
    if (passwordSaving) return;

    if (newPassword.length < 8) {
      setPasswordStatus({ ok: false, msg: s.passwordTooShort });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ ok: false, msg: s.passwordMismatch });
      return;
    }

    setPasswordSaving(true);
    setPasswordStatus(null);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase not initialized');

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordStatus({ ok: true, msg: s.passwordUpdateSuccess });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('[Security] Password update error:', err);
      setPasswordStatus({ ok: false, msg: err?.message || 'Failed to update password.' });
    } finally {
      setPasswordSaving(false);
    }
  };

  // ——— Forgot / reset password ———
  const handleResetPassword = async () => {
    if (resetSending || !originalEmail) return;
    setResetSending(true);
    setResetStatus(null);

    try {
      await sendResetEmail(originalEmail);
      setResetStatus({ ok: true, msg: s.resetEmailSent });
    } catch (err: any) {
      console.error('[Security] Reset password error:', err);
      setResetStatus({ ok: false, msg: err?.message || s.resetEmailError });
    } finally {
      setResetSending(false);
    }
  };

  const fieldClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';
  const sectionCard =
    'rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]';

  return (
    <div className="space-y-6">
      <Link
        href="/app/settings"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 transition-colors"
      >
        ← {s.backToSettings}
      </Link>

      <h1 className="text-xl font-bold text-slate-900">{s.title}</h1>
      <p className="text-sm text-slate-600">{s.subtitle}</p>

      {loading ? (
        <div className="text-sm text-slate-400">Loading…</div>
      ) : (
        <>
          {/* ——— Account Email ——— */}
          <section className={sectionCard}>
            <h2 className="text-lg font-semibold text-slate-900">{s.accountEmail}</h2>
            <p className="mt-1 text-sm text-slate-600">{s.accountEmailDesc}</p>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="sec-email" className={labelClass}>{s.accountEmail}</label>
                <input
                  id="sec-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailStatus(null); }}
                  className={fieldClass}
                />
              </div>

              {emailDirty && (
                <p className="text-xs text-slate-500">{s.emailUpdateVerify}</p>
              )}

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleEmailUpdate}
                  disabled={!emailDirty || emailSaving}
                  className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
                    emailDirty && !emailSaving
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {emailSaving ? s.updatingEmail : s.updateEmail}
                </button>

                {emailStatus && (
                  <span className={`text-sm font-medium ${emailStatus.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                    {emailStatus.msg}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* ——— Password ——— */}
          <section className={sectionCard}>
            <h2 className="text-lg font-semibold text-slate-900">{s.passwordManagement}</h2>
            <p className="mt-1 text-sm text-slate-600">{s.passwordManagementDesc}</p>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="sec-newpw" className={labelClass}>{s.newPassword}</label>
                <input
                  id="sec-newpw"
                  type="password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordStatus(null); }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="sec-confirmpw" className={labelClass}>{s.confirmPassword}</label>
                <input
                  id="sec-confirmpw"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPasswordStatus(null); }}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={fieldClass}
                />
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handlePasswordUpdate}
                  disabled={!newPassword || !confirmPassword || passwordSaving}
                  className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
                    newPassword && confirmPassword && !passwordSaving
                      ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {passwordSaving ? s.updatingPassword : s.updatePassword}
                </button>

                {passwordStatus && (
                  <span className={`text-sm font-medium ${passwordStatus.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                    {passwordStatus.msg}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* ——— Forgot / Reset Password ——— */}
          <section className={sectionCard}>
            <h2 className="text-lg font-semibold text-slate-900">{s.forgotPassword}</h2>
            <p className="mt-1 text-sm text-slate-600">{s.forgotPasswordDesc}</p>

            <div className="mt-4 flex items-center gap-4">
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetSending || !originalEmail}
                className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
                  !resetSending && originalEmail
                    ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-md'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {resetSending ? s.sendingResetEmail : s.sendResetEmail}
              </button>

              {resetStatus && (
                <span className={`text-sm font-medium ${resetStatus.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                  {resetStatus.msg}
                </span>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
