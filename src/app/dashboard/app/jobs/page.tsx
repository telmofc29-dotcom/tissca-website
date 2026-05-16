// src/app/dashboard/app/jobs/page.tsx v2026.03.01
//
// PURPOSE:
// - Legacy route redirect to canonical member app jobs.

import { redirect } from 'next/navigation';

export default function LegacyAppJobsRedirect() {
  redirect('/app/jobs');
}
