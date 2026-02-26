'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getSupabaseEnv } from '@/lib/supabase';
import { GlobalFooter } from '@/components/GlobalFooter';
import { AccountSidebar } from '@/components/AccountSidebar';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if Supabase is configured
    const env = getSupabaseEnv();
    if (!env || !supabase) {
      // Supabase not configured, redirect to home
      router.push('/');
      return;
    }

    // Check if user is logged in
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (!session) {
        // Not logged in, redirect to sign-in
        router.push('/login');
      } else {
        setIsLoading(false);
      }
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (!session) {
        router.push('/login');
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription?.unsubscribe();
  }, [router]);

  if (isLoading) {
    return (
      <>
        <main className="flex-grow flex items-center justify-center py-12">
          <div className="text-secondary">Loading...</div>
        </main>
        <GlobalFooter />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-grow">
        <AccountSidebar />
        <main className="flex-1 bg-gray-50">{children}</main>
      </div>
      <GlobalFooter />
    </>
  );
}
