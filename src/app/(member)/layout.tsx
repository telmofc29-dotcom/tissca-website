// src/app/(member)/layout.tsx v1.6
//
// CHANGES (v1.6):
// - FIX: Correct MemberMenuGate import path to use the member components folder:
//   "@/components/member/MemberMenuGate".
// - Keep v1.5 behaviour: show GlobalHeader for member routes except /app/*.
// - Keep proof-based session requirement.
// - Preserve existing auth behaviour (no redirect logic changes).
//
// VERSION HISTORY:
// - v1.3: Render GlobalHeader for member routes so /dashboard has consistent global chrome
// - v1.4: Remove GlobalHeader from member routes to prevent dark chrome overlaying light /app shell
// - v1.5: Conditional GlobalHeader via MemberMenuGate (fixes missing hamburger on /dashboard/*)
// - v1.6: Fix import path for MemberMenuGate

import type { ReactNode } from 'react';
import { requireSession } from '@/lib/access-control';
import { MemberMenuGate } from '@/components/member/MemberMenuGate';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';

export default async function MemberLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSession('/sign-in');

  return (
    <>
      <MemberMenuGate />
      <WorkspaceProvider>{children}</WorkspaceProvider>
    </>
  );
}