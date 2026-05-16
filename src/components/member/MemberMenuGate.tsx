// src/components/member/MemberMenuGate.tsx v1.2
//
// PURPOSE:
// - Member-route menu gate to prevent GlobalHeader from breaking the /app/* light shell.
// - Ensures member routes like /dashboard/* still get navigation access.
//
// CHANGES (v1.2):
// - FIX: Align hamburger with dashboard content width instead of pinning to viewport edge.
//   Uses inline placement inside a sticky top bar with max-w-6xl to match dashboard content.
//
// NOTES (LOCKED):
// - Minimal logic only.
// - /app/* uses its own member shell (sidebar + top bar).
// - Non-/app member routes (e.g. /dashboard/*) rely on the global hamburger dropdown.
//
// VERSION HISTORY:
// - v1.0: Initial file
// - v1.1: Use hamburger-only GlobalHeader mode
// - v1.2: Align burger with dashboard content (not viewport edge)

'use client';

import { usePathname } from 'next/navigation';
import { GlobalHeader } from '@/components/GlobalHeader';

export function MemberMenuGate() {
  const pathname = usePathname();

  // /app/* has its own member shell (sidebar + top bar).
  // Rendering GlobalHeader there causes visual/theme conflicts.
  if (pathname?.startsWith('/app')) return null;

  // For /dashboard/* and other member routes, show the hamburger button
  // aligned with the dashboard content width (not stuck at viewport edge).
  return (
    <div className="sticky top-0 z-[90] w-full">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-end px-4 py-3">
        <GlobalHeader mode="button" buttonPlacement="inline" />
      </div>
    </div>
  );
}