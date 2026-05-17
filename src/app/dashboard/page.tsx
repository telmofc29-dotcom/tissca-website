// src/app/dashboard/page.tsx
//
// PURPOSE:
// Redirect bare /dashboard visits to the canonical member app overview.
//
// REASON:
// There is no member UI at /dashboard itself (only /dashboard/admin,
// /dashboard/client, etc. exist). Navigation links historically pointed here.
// Rather than a 404, redirect to /app/overview.
//
// NOTE: Platform-staff users are already redirected to /admin by the
// /dashboard/layout.tsx before this page renders.

import { redirect } from 'next/navigation';

export default function DashboardRootPage() {
  redirect('/app/overview');
}
