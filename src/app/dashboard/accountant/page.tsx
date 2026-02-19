'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { getSupabaseClient, getUserProfile } from '@/lib/supabase';

interface AccountantStats {
  clients: number;
  totalInvoiced: number;
  pendingPayments: number;
  completedProjects: number;
}

export default function AccountantDashboard() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [stats, setStats] = useState<AccountantStats>({
    clients: 0,
    totalInvoiced: 0,
    pendingPayments: 0,
    completedProjects: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!supabase) {
          setLoading(false);
          return;
        }

        // Get user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          console.log('[Accountant] No user found, redirecting to sign-in');
          router.push('/login');
          return;
        }

        console.log(`[Accountant] Loading profile for user ${user.id}`);

        // Get user profile (with auto-create if missing)
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'accountant') {
          console.log('[Accountant] User is not accountant, redirecting');
          router.push('/login');
          return;
        }

        // TODO: Load accountant stats from database
        setStats({
          clients: 8,
          totalInvoiced: 250000,
          pendingPayments: 35000,
          completedProjects: 42,
        });

        setLoading(false);
      } catch (error) {
        console.error('Error loading accountant dashboard:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [supabase, router]);

  const navItems = [
    {
      label: 'Overview',
      href: '/dashboard/accountant',
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
      label: 'Monthly Breakdown',
      href: '/dashboard/accountant/breakdown',
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
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      label: 'Client Invoices',
      href: '/dashboard/accountant/invoices',
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
      label: 'Exports',
      href: '/dashboard/accountant/exports',
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
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      label: 'Reports',
      href: '/dashboard/accountant/reports',
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
  ];

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardShell
      navItems={navItems}
      title="Accountant Dashboard"
      role="accountant"
    >
      {/* Stats Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <StatCard
          title="Clients"
          value={stats.clients}
          icon="👥"
          color="blue"
        />
        <StatCard
          title="Total Invoiced"
          value={`$${(stats.totalInvoiced / 1000).toFixed(0)}k`}
          icon="💵"
          color="green"
        />
        <StatCard
          title="Pending Payments"
          value={`$${(stats.pendingPayments / 1000).toFixed(0)}k`}
          icon="⏳"
          color="orange"
        />
        <StatCard
          title="Completed Projects"
          value={stats.completedProjects}
          icon="✅"
          color="purple"
        />
      </div>

      {/* Monthly Summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Current Month
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-sm text-gray-600">Total Invoiced</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">$52,000</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Paid</p>
            <p className="mt-1 text-2xl font-bold text-green-600">$48,000</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Outstanding</p>
            <p className="mt-1 text-2xl font-bold text-orange-600">$4,000</p>
          </div>
        </div>
      </div>

      {/* Pending Reviews */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Pending Reviews
        </h2>
        <div className="space-y-3">
          <ReviewItem client="Acme Corp" amount="$8,500" daysOverdue={2} />
          <ReviewItem
            client="BuildCo Industries"
            amount="$12,300"
            daysOverdue={0}
          />
        </div>
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

function ReviewItem({
  client,
  amount,
  daysOverdue,
}: {
  client: string;
  amount: string;
  daysOverdue: number;
}) {
  return (
    <div className="flex items-center justify-between border-b pb-3 last:border-b-0">
      <div>
        <p className="font-medium text-gray-900">{client}</p>
        <p className="text-sm text-gray-600">{amount}</p>
      </div>
      {daysOverdue > 0 ? (
        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-600">
          {daysOverdue} days overdue
        </span>
      ) : (
        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-600">
          Due Soon
        </span>
      )}
    </div>
  );
}
