import { GlobalFooter } from '@/components/GlobalFooter';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="flex-grow">{children}</main>
      <GlobalFooter />
    </>
  );
}
