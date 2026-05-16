// src/app/dashboard/app/leads/page.tsx v2026.03.01
//
// PURPOSE:
// - Legacy route redirect to canonical member app leads.

import { redirect } from 'next/navigation';

export default function LegacyAppLeadsRedirect() {
  redirect('/app/leads');
}
