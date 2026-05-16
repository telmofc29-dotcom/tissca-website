// src/app/account/settings/page.tsx v1.1
//
// PURPOSE:
// - Legacy route redirect to canonical member app settings.
//
// CHANGES (v1.1):
// - Confirm minimal redirect for member-facing Settings entry.

import { redirect } from 'next/navigation';

export default function AccountSettingsPageRedirect() {
  redirect('/app/settings');
}
