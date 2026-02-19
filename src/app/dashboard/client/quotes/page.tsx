/**
 * Client Quotes List Page
 * View quotes sent to the logged-in client
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseClient, getUserProfile } from '@/lib/supabase';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Quote } from '@/types/quotes';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/client', icon: '📊' },
  { label: 'Quotes', href: '/dashboard/client/quotes', icon: '📄' },
];

export default function ClientQuotesPage() {
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
          console.error('[ClientQuotes] Supabase not initialized');
          router.push('/login');
          return;
        }

        // Get authenticated user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.push('/login');
          return;
        }

        // Get user profile to get client_id (with auto-create)
        const profileData = await getUserProfile(user.id);

        if (!profileData) {
          router.push('/login');
          return;
        }

        // Verify role is client
        if (profileData.role !== 'client') {
          router.push('/dashboard');
          return;
        }

        setUserRole(profileData.role);

        // Fetch quotes sent to this client (exclude 'draft' - only visible to staff)
        let query = supabase
          .from('quotes')
          .select('*')
          .eq('client_id', (profileData as any).clientId)
          .neq('status', 'draft')
          .order('created_at', { ascending: false });

        if (statusFilter) {
          query = query.eq('status', statusFilter);
        }

        const { data: quotesData, error: quotesError } = await query;

        if (quotesError) throw quotesError;

        setQuotes((quotesData as Quote[]) || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        router.push('/login');
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
          <p className="text-gray-600 mt-1">Review quotes sent to you</p>
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
            <option value="sent">Pending</option>
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
                  Title
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">
                  Sent
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
                    {quotes.length === 0
                      ? 'No quotes have been sent to you yet.'
                      : 'No quotes match your search'}
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
                      {quote.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {quote.sent_at ? formatDate(quote.sent_at) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      {'N/A'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          quote.status
                        )}`}
                      >
                        {quote.status === 'sent'
                          ? 'Pending'
                          : quote.status.charAt(0).toUpperCase() +
                            quote.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm">
                      <Link
                        href={`/dashboard/client/quotes/${quote.id}`}
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
