// src/app/dashboard/app/materials/page.tsx v2026.03.01
//
// PURPOSE:
// - Legacy route redirect to canonical member app assets.

import { redirect } from 'next/navigation';

export default function LegacyAppMaterialsRedirect() {
  redirect('/app/assets');
}
