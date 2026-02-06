/**
 * Client Quote View Page
 * Read-only view of a quote with accept/reject actions
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { getSupabaseClient, getUserProfile } from '@/lib/supabase';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { QuoteTotalsPanel } from '@/components/quotes/QuoteTotalsPanel';
import { calculateQuoteTotals } from '@/lib/validators/quoteSchemas';
import { Quote, QuoteItem } from '@/types/quotes';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/client', icon: '📊' },
  { label: 'Quotes', href: '/dashboard/client/quotes', icon: '📄' },
];

export default function ClientQuoteViewPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Quote data
  const [quote, setQuote] = useState<Quote | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);

  // Modals
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Pricing
  const [totals, setTotals] = useState<any>({
    subtotal: 0,
    markup_amount: 0,
    discount_amount: 0,
    vat_amount: 0,
    total: 0,
    deposit_amount: null,
    balance_due: 0,
  });

  // Load quote
  useEffect(() => {
    const loadQuote = async () => {
      try {
        setLoading(true);

        // Get authenticated user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.push('/login');
          return;
        }

        // Get user profile (with auto-create)
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

        // Fetch the quote
        const { data: quoteData, error: quoteError } = await supabase
          .from('quotes')
          .select('*')
          .eq('id', quoteId)
          .eq('client_id', profileData.client_id)
          .single();

        if (quoteError) throw quoteError;

        const q = quoteData as Quote;
        setQuote(q);

        // Fetch quote items
        const { data: itemsData, error: itemsError } = await supabase
          .from('quote_items')
          .select('*')
          .eq('quote_id', quoteId)
          .order('created_at');

        if (itemsError) throw itemsError;

        setItems((itemsData as QuoteItem[]) || []);

        // Calculate totals
        const itemsArray = (itemsData as QuoteItem[]) || [];
        const subtotal = itemsArray.reduce((sum, item) => sum + item.line_total, 0);
        const result = calculateQuoteTotals(subtotal, {
          vat_rate: q.vat_rate,
          discount_type: q.discount_type,
          discount_value: q.discount_value,
          markup_type: q.markup_type,
          markup_value: q.markup_value,
          deposit_type: q.deposit_type,
          deposit_value: q.deposit_value,
        });
        setTotals(result);
      } catch (error) {
        console.error('Error loading quote:', error);
        router.push('/dashboard/client/quotes');
      } finally {
        setLoading(false);
      }
    };

    loadQuote();
  }, [router, quoteId]);

  const handleAcceptQuote = async () => {
    try {
      setUpdating(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const response = await fetch(`/api/quotes/${quoteId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptance_note: 'Accepted via client portal',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to accept quote');
      }

      await response.json();
      setQuote({ ...quote!, status: 'accepted', accepted_at: new Date().toISOString(), is_locked: true });
      setShowAcceptModal(false);
      alert('Quote accepted successfully! It is now locked and cannot be modified.');
    } catch (error: any) {
      console.error('Error accepting quote:', error);
      alert(`Failed to accept quote: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleRejectQuote = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setUpdating(true);

      const response = await fetch(`/api/quotes/${quoteId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejection_reason: rejectionReason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject quote');
      }

      await response.json();
      setQuote({ ...quote!, status: 'rejected' });
      setShowRejectModal(false);
      setRejectionReason('');
      alert('Quote rejected successfully');
    } catch (error: any) {
      console.error('Error rejecting quote:', error);
      alert(`Failed to reject quote: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
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

  const getValidityExpiredStatus = () => {
    if (!quote) return false;
    return quote.valid_until && new Date(quote.valid_until) < new Date();
  };

  if (loading) {
    return (
      <DashboardShell navItems={navItems} title="Quote" role={userRole as any}>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Loading quote...</div>
        </div>
      </DashboardShell>
    );
  }

  if (!quote) {
    return (
      <DashboardShell navItems={navItems} title="Quote" role={userRole as any}>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Quote not found</div>
        </div>
      </DashboardShell>
    );
  }

  const canRespond = quote.status === 'sent';
  const isValidityExpired = getValidityExpiredStatus();

  return (
    <DashboardShell navItems={navItems} title={quote.quote_number} role={userRole as any}>
      <div className="max-w-7xl mx-auto mb-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{quote.quote_number}</h1>
              <p className="text-gray-600 mt-1">
                {quote.title}{' '}
                <span
                  className={`inline-block px-3 py-1 text-xs font-medium rounded-full ml-3 ${getStatusColor(
                    quote.status
                  )}`}
                >
                  {quote.status === 'sent' ? 'Pending' : quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                </span>
              </p>
            </div>
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.href = `/api/quotes/${quoteId}/pdf`;
                link.download = `quote-${quote.quote_number}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              📥 Download PDF
            </button>
          </div>
        </div>

        {/* Warning if validity expired */}
        {isValidityExpired && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-medium">
              This quote expired on {formatDate(quote.valid_until || undefined)}
            </p>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT COLUMN: Quote Details */}
          <div className="col-span-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-6">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  QUOTE TITLE
                </label>
                <p className="text-lg font-medium text-gray-900">{quote.title}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  SENT DATE
                </label>
                <p className="text-gray-900">{formatDate(quote.sent_at || undefined)}</p>
              </div>

              {quote.valid_until && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    VALID UNTIL
                  </label>
                  <p
                    className={`${
                      isValidityExpired ? 'text-red-600 font-medium' : 'text-gray-900'
                    }`}
                  >
                    {formatDate(quote.valid_until)}
                  </p>
                </div>
              )}

              {quote.notes && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    NOTES
                  </label>
                  <p className="text-gray-700 whitespace-pre-wrap text-sm">
                    {quote.notes}
                  </p>
                </div>
              )}

              {quote.status === 'accepted' && quote.accepted_at && (
                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    ACCEPTED ON
                  </label>
                  <p className="text-green-700 font-medium">
                    {formatDate(quote.accepted_at)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* MIDDLE COLUMN: Line Items */}
          <div className="col-span-5">
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Line Items</h3>

              {items.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No items on this quote</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 font-semibold text-gray-700">
                          Description
                        </th>
                        <th className="text-right py-3 font-semibold text-gray-700 w-16">
                          Qty
                        </th>
                        <th className="text-right py-3 font-semibold text-gray-700 w-24">
                          Unit Price
                        </th>
                        <th className="text-right py-3 font-semibold text-gray-700 w-24">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-3 text-gray-900 pr-4">{item.custom_description || 'Item'}</td>
                          <td className="text-right text-gray-900">{item.quantity}</td>
                          <td className="text-right text-gray-900">
                            {formatCurrency(item.unit_price)}
                          </td>
                          <td className="text-right font-medium text-gray-900">
                            {formatCurrency(item.quantity * item.unit_price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Totals & Actions */}
          <div className="col-span-3 space-y-6">
            <QuoteTotalsPanel totals={totals} isLoading={false} />

            {/* Action Buttons */}
            {canRespond && !isValidityExpired && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowAcceptModal(true)}
                  disabled={updating}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updating ? 'Processing...' : 'Accept Quote'}
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={updating}
                  className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updating ? 'Processing...' : 'Reject Quote'}
                </button>
              </div>
            )}

            {isValidityExpired && canRespond && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-600 text-sm">
                  This quote has expired and can no longer be accepted.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ACCEPT CONFIRMATION MODAL */}
        {showAcceptModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Accept Quote?
                </h2>
              </div>
              <div className="px-6 py-4 space-y-4">
                <p className="text-gray-700">
                  By accepting this quote, you confirm that you agree to the terms and conditions. The quote will be locked and cannot be modified.
                </p>
                <p className="text-sm text-gray-600">
                  An immutable snapshot of the current line items and totals will be recorded.
                </p>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => setShowAcceptModal(false)}
                  disabled={updating}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAcceptQuote}
                  disabled={updating}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updating ? 'Accepting...' : 'Accept Quote'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REJECT CONFIRMATION MODAL */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Reject Quote
                </h2>
              </div>
              <div className="px-6 py-4 space-y-4">
                <p className="text-gray-700">
                  Please provide a reason for rejecting this quote.
                </p>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason for rejection..."
                  disabled={updating}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                  }}
                  disabled={updating}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectQuote}
                  disabled={updating || !rejectionReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {updating ? 'Rejecting...' : 'Reject Quote'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
