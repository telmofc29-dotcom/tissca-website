// src/app/(admin)/admin/engineering/layout.tsx v1.1
//
// PURPOSE:
// - Single gate for ALL Engineering tools.
// - Avoids locking many separate pages.
// - Allowed roles: superadmin + engineer (from tissca_staff.role).
//
// SECURITY (PROOF-BASED):
// - Uses /api/user/me with Authorization Bearer token from useAuth().
// - Fail closed: if cannot prove role, deny.
// - If denied, route user to /access-denied.
//
// NOTE (LOCKED INTENT):
// - Keep changes minimal. This is only a gate wrapper.
//
// CHANGES (v1.1):
// - Prevent protected content “flash” on redirect:
//   if we decide to redirect, keep `checking=true` so children never render.

'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

const ENGINEERING_ROLES = new Set(['superadmin', 'engineer']);

export default function EngineeringLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isLoggedIn, getAccessToken } = useAuth();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      let redirecting = false;

      try {
        if (!isLoggedIn) {
          redirecting = true;
          router.replace('/sign-in');
          return;
        }

        const token = await getAccessToken();
        if (!token) {
          redirecting = true;
          router.replace('/sign-in');
          return;
        }

        const res = await fetch('/api/user/me', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        const payload = await res.json().catch(() => null);

        if (!res.ok) {
          redirecting = true;
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

        // Fail closed
        const allowed = Boolean(isPlatformStaff) && ENGINEERING_ROLES.has(staffRole);

        if (!allowed) {
          redirecting = true;
          router.replace('/access-denied');
          return;
        }

        // Allowed → unlock render
        redirecting = false;
      } catch (e) {
        // Fail closed on any unexpected error
        redirecting = true;
        router.replace('/access-denied');
      } finally {
        // If redirecting, keep checking=true so children never render.
        if (!cancelled && !redirecting) setChecking(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, getAccessToken, router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 text-slate-900">
        <div className="max-w-3xl mx-auto px-4">
          <p className="text-gray-700">Checking permissions…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}