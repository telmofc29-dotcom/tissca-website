// src/app/dashboard/layout.tsx v1.2
//
// CHANGES (v1.2):
// - Support Mode (Option B): Allow platform staff to access /dashboard when Support Mode cookie is set.
// - Still enforce proof-based separation:
//   - If staff status cannot be proven -> fail closed to /access-denied
//   - If platform staff AND NOT in support mode -> redirect to /admin
// - Minimal change only (no refactors)

import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getPlatformStaffStatus, requireSession } from '@/lib/access-control';

const SUPPORT_WORKSPACE_COOKIE = 'tissca_support_workspace_id';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireSession('/login');

  // Support Mode proof: presence of server-trusted cookie
  // NOTE: httpOnly cookie is readable server-side.
  const supportWorkspaceId = cookies().get(SUPPORT_WORKSPACE_COOKIE)?.value ?? null;
  const isSupportModeActive = Boolean(supportWorkspaceId);

  // LOCKED: Proof-based separation
  // Platform staff must not use member dashboard as their main panel,
  // except when explicitly in Support Mode.
  try {
    const staffStatus = await getPlatformStaffStatus(user.id);

    if (staffStatus.is_platform_staff && !isSupportModeActive) {
      redirect('/admin');
    }
  } catch (e) {
    // Fail closed: if staff evaluation cannot be proven, do not render member dashboard.
    redirect('/access-denied');
  }

  return <>{children}</>;
}