// src/app/account/statements/page.tsx v2026.03.01
//
// PURPOSE:
// - Legacy route redirect to canonical member app invoices.

import { redirect } from 'next/navigation';

export default function AccountStatementsPageRedirect() {
  redirect('/app/invoices');
}
