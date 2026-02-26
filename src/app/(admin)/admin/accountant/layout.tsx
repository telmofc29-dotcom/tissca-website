import { requirePlatformStaffRole } from '@/lib/access-control';

export default async function AdminAccountantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePlatformStaffRole(['accountant', 'admin', 'superadmin'], '/access-denied');

  return children;
}
