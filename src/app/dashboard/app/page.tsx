// src/app/dashboard/app/page.tsx v2026.03.01
//
// PURPOSE:
// - Legacy route redirect to canonical member app overview.

import { redirect } from 'next/navigation';

export default function LegacyAppRootRedirect() {
  redirect('/app/overview');
}
