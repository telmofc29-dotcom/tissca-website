import AdminShell from '@/components/AdminShell';
import { AuthProvider } from '@/context/auth-context';
import { requirePlatformStaff } from '@/lib/access-control';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePlatformStaff('/access-denied');

  return (
    <AuthProvider>
      <AdminShell>
        {children}
      </AdminShell>
    </AuthProvider>
  );
}
