'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { getSupabaseClient, getUserProfile } from '@/lib/supabase';
import { getLeads } from './actions';
import LeadsTable from '@/components/leads/LeadsTable';

export default function LeadsPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [leads, setLeads] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [filters, setFilters] = useState({
    status: 'All',
    search: '',
    sortBy: 'createdAt' as 'followUpDate' | 'valueEstimate' | 'createdAt' | 'status',
    sortOrder: 'desc' as 'asc' | 'desc',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!supabase) {
          setError('Supabase not configured');
          setLoading(false);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const profile = await getUserProfile(user.id);
        if (!profile) {
          setError('Profile not found');
          setLoading(false);
          return;
        }

        setUserRole(profile.role || 'staff');

        // Load leads
        const leadsData = await getLeads(user.id, {
          status: filters.status,
          search: filters.search || undefined,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        });

        setLeads(leadsData || []);
        setLoading(false);
      } catch (err) {
        console.error('[LeadsPage] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load leads');
        setLoading(false);
      }
    };

    loadData();
  }, [supabase, router, filters]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="text-gray-600">Loading leads...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-4xl">⚠️</div>
          <h2 className="mb-2 text-lg font-semibold">Failed to Load Leads</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: 'Overview', href: '/dashboard/app', icon: '📊' },
    { label: 'Leads', href: '/dashboard/app/leads', icon: '👥' },
    { label: 'Jobs', href: '/dashboard/app/jobs', icon: '📋' },
    { label: 'Quotes', href: '/dashboard/app/quotes', icon: '📄' },
    { label: 'Invoices', href: '/dashboard/app/invoices', icon: '💰' },
  ];

  return (
    <DashboardShell
      navItems={navItems}
      title="Leads"
      role={userRole as 'admin' | 'accountant' | 'staff' | 'client'}
    >
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Leads</h1>
          <button
            onClick={() => router.push('/dashboard/app/leads/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + New Lead
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option>All</option>
                <option>New</option>
                <option>Contacted</option>
                <option>Quoted</option>
                <option>Won</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                placeholder="Search notes..."
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    sortBy: e.target.value as any,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="createdAt">Created Date</option>
                <option value="followUpDate">Follow-up Date</option>
                <option value="valueEstimate">Value</option>
                <option value="status">Status</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order
              </label>
              <select
                value={filters.sortOrder}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    sortOrder: e.target.value as 'asc' | 'desc',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <LeadsTable leads={leads} />
      </div>
    </DashboardShell>
  );
}
