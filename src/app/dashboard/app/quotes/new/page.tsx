// src/app/dashboard/app/quotes/new/page.tsx v2026.03.01
//
// PURPOSE:
// - Legacy route redirect to canonical member app quotes.

import { redirect } from 'next/navigation';

export default function LegacyAppQuotesNewRedirect() {
  redirect('/app/quotes');
}
