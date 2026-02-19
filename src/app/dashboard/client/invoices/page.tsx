/**
 * Client Invoices List Page
 * View invoices sent to the logged-in client
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient, getUserProfile } from '@/lib/supabase';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Invoice } from '@/types/invoices';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/client', icon: '📊' },
  { label: 'Quotes', href: '/dashboard/client/quotes', icon: '📄' },
  { label: 'Invoices', href: '/dashboard/client/invoices', icon: '💰' },
];

export default function ClientInvoicesPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!supabase) {
          console.error('[ClientInvoices] Supabase not initialized');
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

        // Fetch invoices sent to this client (exclude 'draft' - only visible to staff)
        let query = supabase
          .from('invoices')
          .select('*')
          .eq('client_id', (profileData as any).clientId)
          .neq('status', 'draft')
          .order('created_at', { ascending: false });

        if (statusFilter) {
          query = query.eq('status', statusFilter);
        }

        const { data: invoicesData, error: invoicesError } = await query;

        if (invoicesError) throw invoicesError;

        setInvoices((invoicesData as Invoice[]) || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, statusFilter]);

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = invoice.invoice_number
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
      sent: 'bg-blue-100 text-blue-800',
      partially_paid: 'bg-amber-100 text-amber-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const calculateBalanceDue = (invoice: Invoice) => {
    return invoice.total - (invoice.amount_paid || 0);
  };

  if (loading) {
    return (
      <DashboardShell navItems={navItems} title="Invoices" role={userRole as any}>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Loading invoices...</div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell navItems={navItems} title="Invoices" role={userRole as any}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-1">View and manage your invoices</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
          <input
            type="text"
            placeholder="Search by invoice number..."
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
            <option value="sent">Sent</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Invoices Table */}
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">
                  Invoice Number
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">
                  Issue Date
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">
                  Due Date
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-700">
                  Total
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-700">
                  Balance Due
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
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center px-6 py-8 text-gray-500">
                    {invoices.length === 0
                      ? 'No invoices yet.'
                      : 'No invoices match your search'}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/client/invoices/${invoice.id}`)}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(invoice.issue_date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {invoice.due_date ? formatDate(invoice.due_date) : 'Not set'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(calculateBalanceDue(invoice))}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          invoice.status
                        )}`}
                      >
                        {invoice.status === 'partially_paid'
                          ? 'Partially Paid'
                          : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/client/invoices/${invoice.id}`);
                        }}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View
                      </button>
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
