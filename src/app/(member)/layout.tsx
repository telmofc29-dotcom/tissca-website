import { requireSession } from '@/lib/access-control';

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession('/login');

  return children;
}
