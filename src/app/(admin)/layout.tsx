// src/app/(admin)/layout.tsx v1.3
//
// PURPOSE:
// - Root layout for all /(admin) routes.
// - Enforces platform staff gate BEFORE rendering anything.
// - Renders admin-only shell (sealed; no GlobalHeader).
//
// CHANGES (v1.3):
// - Remove GlobalHeader from admin layout to prevent public/member navigation leaking into admin.
// - Keep proof-based access gate unchanged.
//

import AdminShell from '@/components/AdminShell';
import { AuthProvider } from '@/context/auth-context';
import { requirePlatformStaff } from '@/lib/access-control';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // LOCKED: Proof-based gate must run BEFORE rendering anything.
  // Behaviour expectation:
  // - Not logged in -> redirect to /login
  // - Logged in but not platform staff -> redirect to /access-denied
  await requirePlatformStaff();

  return (
    <AuthProvider>
      <AdminShell>{children}</AdminShell>
    </AuthProvider>
  );
}