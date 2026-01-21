'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { getSupabaseClient, getUserProfile } from '@/lib/supabase';

export default function ClientDashboard() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!supabase) {
          setError('Supabase not configured');
          setLoading(false);
          return;
        }

        // Get user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          console.log('[Client] No user found, redirecting to sign-in');
          router.push('/sign-in');
          return;
        }

        console.log(`[Client] Loading profile for user ${user.id}`);

        // Get user profile (with auto-create if missing)
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'client') {
          console.log('[Client] User is not client, redirecting');
          router.push('/sign-in');
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading client dashboard:', error);
        setError(error instanceof Error ? error.message : 'Failed to load dashboard');
        setLoading(false);
      }
    };

    loadData();
  }, [supabase, router]);

  const navItems = [
    {
      label: 'Overview',
      href: '/dashboard/client',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-3m2 3l2-3m2 3l2-3m2-4a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      ),
    },
    {
      label: 'Quotes',
      href: '/dashboard/client/quotes',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      label: 'Invoices',
      href: '/dashboard/client/invoices',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
      ),
    },
    {
      label: 'Profile',
      href: '/dashboard/client/profile',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
  ];

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardShell
      navItems={navItems}
      title="Client Portal"
      role="client"
    >
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Welcome to Your Portal
        </h2>
        <p className="mb-6 text-gray-600">
          View quotes, invoices, and track your projects with your builder.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="mb-2 font-semibold text-gray-900">Active Quotes</h3>
            <p className="text-3xl font-bold text-blue-600">0</p>
            <p className="mt-2 text-sm text-gray-600">
              Awaiting your decision
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="mb-2 font-semibold text-gray-900">Recent Invoices</h3>
            <p className="text-3xl font-bold text-green-600">0</p>
            <p className="mt-2 text-sm text-gray-600">All paid</p>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
