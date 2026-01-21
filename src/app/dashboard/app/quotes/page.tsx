/**
 * Staff Quotes List Page
 * View all quotes created by staff member
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient, getUserProfile } from '@/lib/supabase';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Quote } from '@/types/quotes';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/app', icon: '📊' },
  { label: 'Materials', href: '/dashboard/app/materials', icon: '📦' },
  { label: 'Quotes', href: '/dashboard/app/quotes', icon: '📄' },
];

export default function StaffQuotesPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!supabase) {
          console.error('[Quotes] Supabase not initialized');
          router.push('/auth/login');
          return;
        }

        // Get authenticated user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.push('/auth/login');
          return;
        }

        // Get user profile to check role (with auto-create)
        const profileData = await getUserProfile(user.id);

        if (!profileData) {
          router.push('/auth/login');
          return;
        }

        // Verify role is staff or admin
        if (profileData.role !== 'staff' && profileData.role !== 'admin') {
          router.push('/dashboard');
          return;
        }

        setUserRole(profileData.role);

        // Fetch quotes for this business
        let query = supabase
          .from('quotes')
          .select('*')
          .eq('business_id', profileData.businessId)
          .order('created_at', { ascending: false });

        if (statusFilter) {
          query = query.eq('status', statusFilter);
        }

        const { data: quotesData, error: quotesError } = await query;

        if (quotesError) throw quotesError;

        setQuotes((quotesData as Quote[]) || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, statusFilter]);

  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch = quote.quote_number
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <DashboardShell navItems={navItems} title="Quotes" role={userRole as any}>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Loading quotes...</div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell navItems={navItems} title="Quotes" role={userRole as any}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
            <p className="text-gray-600 mt-1">Manage all your quotes</p>
          </div>
          <Link
            href="/dashboard/app/quotes/new"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            + New Quote
          </Link>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
          <input
            type="text"
            placeholder="Search by quote number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Quotes Table */}
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">
                  Quote Number
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">
                  Client
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">
                  Created
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-700">
                  Total
                </th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-700">
                  Status
                </th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center px-6 py-8 text-gray-500">
                    {quotes.length === 0 ? (
                      <div>
                        <p>No quotes yet.</p>
                        <Link
                          href="/dashboard/app/quotes/new"
                          className="text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block"
                        >
                          Create your first quote
                        </Link>
                      </div>
                    ) : (
                      'No quotes match your search'
                    )}
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((quote) => (
                  <tr
                    key={quote.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {quote.quote_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      Client
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(quote.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(0)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          quote.status
                        )}`}
                      >
                        {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm">
                      <Link
                        href={`/dashboard/app/quotes/${quote.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
