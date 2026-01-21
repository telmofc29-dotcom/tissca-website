'use client';

import { AuthProvider } from '@/context/auth-context';
import { generateDefaultJsonLd } from '@/config/metadata';
import { GlobalHeader } from '@/components/GlobalHeader';
import { GlobalFooter } from '@/components/GlobalFooter';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(generateDefaultJsonLd()) }}
        />
        <GlobalHeader />
        <main className="min-h-[calc(100vh-16rem)]">{children}</main>
        <GlobalFooter />
      </>
    </AuthProvider>
  );
}
