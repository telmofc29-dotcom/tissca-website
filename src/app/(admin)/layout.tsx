'use client';

import AdminShell from '@/components/AdminShell';
import { AuthProvider } from '@/context/auth-context';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AdminShell>
        {children}
      </AdminShell>
    </AuthProvider>
  );
}
