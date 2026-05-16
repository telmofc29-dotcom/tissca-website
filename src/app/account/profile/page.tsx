// src/app/account/profile/page.tsx v2026.03.01
//
// PURPOSE:
// - Legacy route redirect to canonical member app settings.

import { redirect } from 'next/navigation';

export default function AccountProfilePageRedirect() {
  redirect('/app/settings');
}
