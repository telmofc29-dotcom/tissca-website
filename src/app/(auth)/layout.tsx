import { GlobalHeader } from '@/components/GlobalHeader';
import { GlobalFooter } from '@/components/GlobalFooter';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GlobalHeader />
      <main className="flex-grow">{children}</main>
      <GlobalFooter />
    </>
  );
}
