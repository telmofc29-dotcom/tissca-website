// src/app/(admin)/admin/support/page.tsx v1.3
//
// PURPOSE:
// - This route is NOT the Support Inbox anymore.
// - The Support Inbox belongs under Engineering so we can gate it via ONE layout gate:
//   /admin/engineering/*  (superadmin + engineer)
//
// BEHAVIOUR (PROOF-BASED):
// - If not logged in: redirect to /login
// - If logged in but not allowed: redirect to /access-denied
// - If allowed: redirect to /admin/engineering/support
//
// CHANGES (v1.3):
// - Convert legacy Support Inbox page into a proof-based redirect gateway.
// - Fail closed: do not reveal Engineering route to non-engineers.
// - Uses /api/user/me with Authorization Bearer token from useAuth().

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

const ENGINEERING_ROLES = new Set(['superadmin', 'engineer']);

export default function AdminSupportRedirectPage() {
  const router = useRouter();
  const { isLoggedIn, getAccessToken } = useAuth();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        if (!isLoggedIn) {
          router.replace('/sign-in');
          return;
        }

        const token = await getAccessToken();
        if (!token) {
          router.replace('/sign-in');
          return;
        }

        const res = await fetch('/api/user/me', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        const payload = await res.json().catch(() => null);

        if (!res.ok) {
          router.replace('/access-denied');
          return;
        }

        const roleRaw =
          payload?.staff_role ??
          payload?.staffRole ??
          payload?.staff?.role ??
          payload?.tissca_staff?.role ??
          '';

        const staffRole = String(roleRaw || '').toLowerCase().trim();
        const isPlatformStaff = Boolean(payload?.is_platform_staff);

        const allowed = Boolean(isPlatformStaff) && ENGINEERING_ROLES.has(staffRole);

        if (!allowed) {
          router.replace('/access-denied');
          return;
        }

        router.replace('/admin/engineering/support');
      } catch (e) {
        // Fail closed
        router.replace('/access-denied');
      }
    }

    if (!cancelled) run();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, getAccessToken, router]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 text-slate-900">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-2">Redirecting…</h1>
        <p className="text-gray-600">Routing you to the correct Support Inbox.</p>
      </div>
    </div>
  );
}