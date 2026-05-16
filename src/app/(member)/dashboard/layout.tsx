// src/app/(member)/dashboard/layout.tsx v1.0
//
// PURPOSE:
// - Member dashboard layout wrapper for /dashboard route.
// - Enforces proof-based staff separation WITH Support Mode.
//
// CHANGES (v1.0):
// - New file: apply Support Mode rules to member dashboard route.

import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getPlatformStaffStatus, requireSession } from '@/lib/access-control';

const SUPPORT_WORKSPACE_COOKIE = 'tissca_support_workspace_id';

export default async function MemberDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireSession('/sign-in');

  const supportWorkspaceId =
    cookies().get(SUPPORT_WORKSPACE_COOKIE)?.value ?? null;
  const isSupportModeActive = Boolean(supportWorkspaceId);

  try {
    const staffStatus = await getPlatformStaffStatus(user.id);

    if (staffStatus.is_platform_staff && !isSupportModeActive) {
      redirect('/admin');
    }
  } catch (e) {
    redirect('/access-denied');
  }

  return <>{children}</>;
}