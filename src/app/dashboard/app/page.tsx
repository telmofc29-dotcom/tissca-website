'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { getSupabaseClient, getUserProfile } from '@/lib/supabase';

interface DashboardStats {
  quotes: number;
  invoices: number;
  revenue: number;
  clients: number;
}

export default function ContractorDashboard() {
  // Use singleton client (no creating new instances)
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    quotes: 0,
    invoices: 0,
    revenue: 0,
    clients: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
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
          console.log('[Dashboard] No user found, redirecting to sign-in');
          router.push('/login');
          return;
        }

        console.log(`[Dashboard] Loading profile for user ${user.id}`);

        // Get user profile (with auto-create if missing)
        const profile = await getUserProfile(user.id);

        if (!profile) {
          console.error('[Dashboard] Profile is null after fetch/create');
          setError('Failed to load profile. Please sign in again.');
          setLoading(false);
          return;
        }

        console.log('[Dashboard] Profile loaded:', { role: profile.role || 'N/A', business_id: profile.businessId || 'N/A' });

        // Check if profile has required fields
        const role = profile.role || 'staff'; // Default role if not set

        // Only allow staff and accountant roles
        if (!['staff', 'accountant'].includes(role)) {
          console.log(`[Dashboard] User role ${role} not allowed, redirecting`);
          router.push('/dashboard/' + role);
          return;
        }

        setUserRole(role);

        // TODO: Load stats from database
        // For now, show placeholder values
        setStats({
          quotes: 12,
          invoices: 8,
          revenue: 45000,
          clients: 6,
        });

        setLoading(false);
      } catch (error) {
        console.error('[Dashboard] Error loading data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load dashboard');
        setLoading(false);
      }
    };

    loadData();
  }, [supabase, router]);

  const navItems = [
    {
      label: 'Overview',
      href: '/dashboard/app',
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
      href: '/dashboard/app/quotes',
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
      badge: 2,
    },
    {
      label: 'Invoices',
      href: '/dashboard/app/invoices',
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
      label: 'Statements',
      href: '/dashboard/app/statements',
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
            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
          />
        </svg>
      ),
    },
    {
      label: 'Materials',
      href: '/dashboard/app/materials',
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
            d="M20 7l-8-4-8 4m0 0l8 4m-8-4v10l8 4m0-10l8 4m-8-4v10M7 12l8 4m0 0l8-4"
          />
        </svg>
      ),
    },
    {
      label: 'Settings',
      href: '/dashboard/app/settings',
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
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-4xl">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to Load Dashboard
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError('');
              window.location.reload();
            }}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      navItems={navItems}
      title="Contractor Overview"
      role={userRole as 'staff' | 'accountant'}
    >
      {/* Stats Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <StatCard
          title="Quotes"
          value={stats.quotes}
          icon="📋"
          color="blue"
        />
        <StatCard
          title="Invoices"
          value={stats.invoices}
          icon="📄"
          color="green"
        />
        <StatCard
          title="Revenue"
          value={`$${(stats.revenue / 1000).toFixed(1)}k`}
          icon="💰"
          color="purple"
        />
        <StatCard
          title="Clients"
          value={stats.clients}
          icon="👥"
          color="orange"
        />
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Recent Activity
        </h2>
        <div className="text-center text-gray-500">
          <p>No recent activity yet.</p>
          <p className="text-sm">
            Create a quote or invoice to get started.
          </p>
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-6">
        <h3 className="mb-2 font-semibold text-amber-900">Getting Started</h3>
        <p className="text-sm text-amber-800">
          Start by setting up your materials and labour rates in the Materials
          section, then create your first quote!
        </p>
      </div>
    </DashboardShell>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    orange: 'bg-orange-50 border-orange-200',
  };

  return (
    <div className={`rounded-lg border p-6 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}
