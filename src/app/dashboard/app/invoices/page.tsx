// src/app/dashboard/app/invoices/page.tsx v2026.03.01
//
// PURPOSE:
// - Legacy route redirect to canonical member app invoices.

import { redirect } from 'next/navigation';

export default function LegacyAppInvoicesRedirect() {
  redirect('/app/invoices');
}
