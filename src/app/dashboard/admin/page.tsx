// src/app/dashboard/admin/page.tsx (admin page) v1.0
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { getSupabaseClient, getUserProfile } from '@/lib/supabase';

interface AdminStats {
  businesses: number;
  activeSubscriptions: number;
  totalRevenue: number;
  accountants: number;
}

type SupportModeStatus = 'idle' | 'saving' | 'clearing' | 'success' | 'error';

export default function AdminDashboard() {
  const supabase = getSupabaseClient();
  const router = useRouter();

  const [stats, setStats] = useState<AdminStats>({
    businesses: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    accountants: 0,
  });
  const [loading, setLoading] = useState(true);

  // Support Mode (Option B) — admin selects workspace to view as simulator
  const [supportWorkspaceId, setSupportWorkspaceId] = useState('');
  const [supportStatus, setSupportStatus] = useState<SupportModeStatus>('idle');
  const [supportMessage, setSupportMessage] = useState<string>('');

  const navItems = useMemo(
    () => [
      {
        label: 'Overview',
        href: '/dashboard/admin',
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
        label: 'Businesses',
        href: '/dashboard/admin/businesses',
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
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5.581m0 0H9m0 0h5.581M9 21m0-8v-3m0 3v3"
            />
          </svg>
        ),
      },
      {
        label: 'Accountants',
        href: '/dashboard/admin/accountants',
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
              d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10h.01M13 16h2a2 2 0 002-2v-2.5a2 2 0 00-1-1.732V5a2 2 0 10-4 0v3.268a2 2 0 00-1 1.732V14a2 2 0 002 2z"
            />
          </svg>
        ),
      },
      {
        label: 'Revenue',
        href: '/dashboard/admin/revenue',
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
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      },
      {
        label: 'Audit Log',
        href: '/dashboard/admin/audit',
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
        label: 'Support Mode',
        href: '#support-mode',
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
              d="M18.364 5.636l-1.414 1.414M6.05 17.95l-1.414 1.414M8.464 5.636l1.414 1.414M17.95 17.95l1.414 1.414M12 8v4l3 3M12 3a9 9 0 100 18 9 9 0 000-18z"
            />
          </svg>
        ),
      },
    ],
    []
  );

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
          console.log('[Admin] No user found, redirecting to sign-in');
          router.push('/sign-in');
          return;
        }

        console.log(`[Admin] Loading profile for user ${user.id}`);

        // Get user profile (with auto-create if missing)
        const profile = await getUserProfile(user.id);

        if (!profile || profile.role !== 'admin') {
          console.log('[Admin] User is not admin, redirecting');
          router.push('/sign-in');
          return;
        }

        // TODO: Load admin stats from database
        setStats({
          businesses: 24,
          activeSubscriptions: 18,
          totalRevenue: 125000,
          accountants: 3,
        });

        setLoading(false);
      } catch (error) {
        console.error('Error loading admin dashboard:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [supabase, router]);

  const onEnterSupportMode = async () => {
    const workspaceId = supportWorkspaceId.trim();

    if (!workspaceId) {
      setSupportStatus('error');
      setSupportMessage('Please enter a Workspace ID (UUID).');
      return;
    }

    setSupportStatus('saving');
    setSupportMessage('');

    try {
      const res = await fetch('/api/admin/support/set-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workspaceId }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(
          text || `Failed to set support workspace (HTTP ${res.status})`
        );
      }

      setSupportStatus('success');
      setSupportMessage(
        'Support Mode enabled. Go to a member dashboard to view as this workspace.'
      );
    } catch (e) {
      console.error('[Admin][SupportMode] set-workspace failed:', e);
      setSupportStatus('error');
      setSupportMessage(
        e instanceof Error ? e.message : 'Failed to enable Support Mode.'
      );
    }
  };

  const onExitSupportMode = async () => {
    setSupportStatus('clearing');
    setSupportMessage('');

    try {
      const res = await fetch('/api/admin/support/clear-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(
          text || `Failed to clear support workspace (HTTP ${res.status})`
        );
      }

      setSupportStatus('success');
      setSupportMessage('Support Mode cleared.');
      setSupportWorkspaceId('');
    } catch (e) {
      console.error('[Admin][SupportMode] clear-workspace failed:', e);
      setSupportStatus('error');
      setSupportMessage(
        e instanceof Error ? e.message : 'Failed to clear Support Mode.'
      );
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardShell navItems={navItems} title="Admin Dashboard" role="admin">
      {/* Stats Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <StatCard title="Businesses" value={stats.businesses} icon="🏢" color="blue" />
        <StatCard
          title="Active Subscriptions"
          value={stats.activeSubscriptions}
          icon="✅"
          color="green"
        />
        <StatCard
          title="Total Revenue"
          value={`$${(stats.totalRevenue / 1000).toFixed(0)}k`}
          icon="💰"
          color="purple"
        />
        <StatCard
          title="Accountants"
          value={stats.accountants}
          icon="👔"
          color="orange"
        />
      </div>

      {/* Support Mode (Option B) */}
      <div
        id="support-mode"
        className="mb-8 rounded-lg border border-gray-200 bg-white p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Support Mode</h2>
            <p className="mt-1 text-sm text-gray-600">
              Support Mode – Viewing as Workspace: <span className="font-mono">(selected workspace)</span>
            </p>
            <p className="mt-2 text-sm text-gray-600">
              This is a simulator view used to guide users and troubleshoot. You are <span className="font-semibold">not</span> becoming the user.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Workspace ID (UUID)
            </label>
            <input
              value={supportWorkspaceId}
              onChange={(e) => setSupportWorkspaceId(e.target.value)}
              placeholder="e.g. 3f9d2c2a-1b2c-4c5d-8e9f-1234567890ab"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400"
            />
            {supportMessage ? (
              <p
                className={`mt-2 text-sm ${
                  supportStatus === 'error'
                    ? 'text-red-600'
                    : supportStatus === 'success'
                      ? 'text-green-700'
                      : 'text-gray-600'
                }`}
              >
                {supportMessage}
              </p>
            ) : null}
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={onEnterSupportMode}
              disabled={supportStatus === 'saving' || supportStatus === 'clearing'}
              className="w-full rounded-md border border-gray-300 bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {supportStatus === 'saving' ? 'Enabling…' : 'Enter Support Mode'}
            </button>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={onExitSupportMode}
              disabled={supportStatus === 'saving' || supportStatus === 'clearing'}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {supportStatus === 'clearing' ? 'Clearing…' : 'Exit Support Mode'}
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-md bg-gray-50 p-3 text-xs text-gray-600">
          <p className="font-semibold text-gray-700">Notes (locked behaviour)</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Support workspace selection is server-trusted via admin-only API routes.</li>
            <li>Member dashboards should show a banner when support mode is active.</li>
            <li>Any support actions that change data must be explicit and auditable.</li>
          </ul>
        </div>
      </div>

      {/* System Health */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          System Health
        </h2>
        <div className="space-y-4">
          <HealthItem label="Database Status" status="healthy" />
          <HealthItem label="Authentication Service" status="healthy" />
          <HealthItem label="Email Service" status="healthy" />
          <HealthItem label="Stripe Integration" status="degraded" />
        </div>
      </div>

      {/* Recent Signups */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Recent Signups
        </h2>
        <div className="text-center text-gray-500">
          <p>No recent signups yet.</p>
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

function HealthItem({
  label,
  status,
}: {
  label: string;
  status: 'healthy' | 'degraded' | 'down';
}) {
  const statusColors = {
    healthy: 'bg-green-100 text-green-800',
    degraded: 'bg-yellow-100 text-yellow-800',
    down: 'bg-red-100 text-red-800',
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-700">{label}</span>
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
          statusColors[status]
        }`}
      >
        {status}
      </span>
    </div>
  );
}