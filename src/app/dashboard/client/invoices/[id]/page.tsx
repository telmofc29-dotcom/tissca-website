/**
 * Client Invoice Detail Page (Read-Only)
 * View invoice details and download PDF
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { getSupabaseClient, getUserProfile } from '@/lib/supabase';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Invoice, InvoiceItem } from '@/types/invoices';
import { Client } from '@/types/quotes';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/client', icon: '📊' },
  { label: 'Quotes', href: '/dashboard/client/quotes', icon: '📄' },
  { label: 'Invoices', href: '/dashboard/client/invoices', icon: '💰' },
];

export default function ClientInvoiceDetailPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);

  // Invoice data
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [totals, setTotals] = useState({
    subtotal: 0,
    vat_total: 0,
    total: 0,
  });

  // Load invoice
  useEffect(() => {
    const loadInvoice = async () => {
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

        // Fetch invoice - verify it belongs to this client and is not draft
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .eq('client_id', profileData.client_id)
          .neq('status', 'draft')
          .single();

        if (invoiceError || !invoiceData) {
          router.push('/dashboard/client/invoices');
          return;
        }

        setInvoice(invoiceData as Invoice);

        // Fetch client
        const { data: clientData } = await supabase
          .from('clients')
          .select('*')
          .eq('id', invoiceData.client_id)
          .single();

        setClient(clientData as Client);

        // Fetch items
        const { data: itemsData } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', invoiceId)
          .order('created_at', { ascending: true });

        setItems((itemsData as InvoiceItem[]) || []);

        // Fetch payments
        const { data: paymentsData } = await supabase
          .from('invoice_payments')
          .select('*')
          .eq('invoice_id', invoiceId)
          .order('paid_at', { ascending: true });

        setPayments(paymentsData || []);

        // Calculate totals from items
        if (itemsData) {
          let subtotal = 0;
          let vat_total = 0;
          itemsData.forEach((item: InvoiceItem) => {
            const lineSubtotal = item.qty * item.unit_price;
            const lineVat = lineSubtotal * (item.vat_rate / 100);
            subtotal += lineSubtotal;
            vat_total += lineVat;
          });
          setTotals({
            subtotal,
            vat_total,
            total: subtotal + vat_total,
          });
        }
      } catch (error) {
        console.error('Error fetching invoice:', error);
        router.push('/dashboard/client/invoices');
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [router, invoiceId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
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

  const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = totals.total - amountPaid;

  if (loading) {
    return (
      <DashboardShell navItems={navItems} title="Invoice" role={userRole as any}>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Loading invoice...</div>
        </div>
      </DashboardShell>
    );
  }

  if (!invoice || !client) {
    return (
      <DashboardShell navItems={navItems} title="Invoice" role={userRole as any}>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Invoice not found</div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell navItems={navItems} title="Invoice" role={userRole as any}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
            <p className="text-gray-600 mt-1">
              {formatDate(invoice.issue_date)}{' '}
              <span
                className={`inline-block px-3 py-1 text-xs font-medium rounded-full ml-3 ${getStatusColor(
                  invoice.status
                )}`}
              >
                {invoice.status === 'partially_paid'
                  ? 'Partially Paid'
                  : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </span>
            </p>
          </div>
          <button
            onClick={() => {
              const link = document.createElement('a');
              link.href = `/api/invoices/${invoiceId}/pdf`;
              link.download = `invoice-${invoice.invoice_number}.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            📥 Download PDF
          </button>
        </div>

        {/* Invoice Info and Summary */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* Billed To */}
          <div className="rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">BILLED TO</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p className="font-medium text-gray-900">{client.name}</p>
              {client.company_name && <p>{client.company_name}</p>}
              {client.address_line_1 && <p>{client.address_line_1}</p>}
              {client.address_line_2 && <p>{client.address_line_2}</p>}
              {client.city && <p>{client.city}</p>}
              {client.postcode && <p>{client.postcode}</p>}
              {client.phone && <p>Tel: {client.phone}</p>}
              {client.email && <p>Email: {client.email}</p>}
            </div>
          </div>

          {/* Invoice Details */}
          <div className="rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">DETAILS</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex justify-between">
                <span>Invoice Number:</span>
                <span className="font-medium text-gray-900">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Issue Date:</span>
                <span className="font-medium text-gray-900">{formatDate(invoice.issue_date)}</span>
              </div>
              <div className="flex justify-between">
                <span>Due Date:</span>
                <span className="font-medium text-gray-900">
                  {invoice.due_date ? formatDate(invoice.due_date) : 'Not set'}
                </span>
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-lg border border-gray-200 p-6 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">TOTALS</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal:</span>
                <span className="font-medium text-gray-900">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>VAT:</span>
                <span className="font-medium text-gray-900">{formatCurrency(totals.vat_total)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between text-base font-semibold text-gray-900 bg-blue-50 -m-6 px-6 py-3 rounded-b">
                  <span>Total:</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
              {amountPaid > 0 && (
                <>
                  <div className="flex justify-between text-sm text-green-600 pt-2">
                    <span>Amount Paid:</span>
                    <span className="font-medium">{formatCurrency(amountPaid)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Balance Due:</span>
                    <span className={`font-medium ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(Math.max(0, balanceDue))}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8 rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
            <h3 className="text-sm font-semibold text-gray-700">LINE ITEMS</h3>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">
                  Description
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-700">
                  Qty
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-700">
                  Unit Price
                </th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-700">
                  VAT %
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-700">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center px-6 py-8 text-gray-500">
                    No items in this invoice
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const lineSubtotal = item.qty * item.unit_price;
                  const lineVat = lineSubtotal * (item.vat_rate / 100);
                  const lineTotal = lineSubtotal + lineVat;
                  return (
                    <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                      <td className="text-right px-6 py-4 text-sm text-gray-600">
                        {item.qty.toFixed(2)}
                      </td>
                      <td className="text-right px-6 py-4 text-sm text-gray-600">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="text-center px-6 py-4 text-sm text-gray-600">
                        {item.vat_rate}%
                      </td>
                      <td className="text-right px-6 py-4 text-sm font-medium text-gray-900">
                        {formatCurrency(lineTotal)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Payment Status */}
        <div className="mb-8 rounded-lg border border-gray-200 p-6 bg-blue-50">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">PAYMENT STATUS</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Amount Due</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.total)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">
                {balanceDue > 0 ? 'Balance Due' : 'Amount Paid'}
              </p>
              <p className={`text-2xl font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(Math.max(0, balanceDue))}
              </p>
            </div>
          </div>
        </div>

        {/* Payments History */}
        {payments.length > 0 && (
          <div className="mb-8 rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
              <h3 className="text-sm font-semibold text-gray-700">PAYMENT HISTORY</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">
                    Date
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">
                    Method
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">
                    Reference
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-700">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(payment.paid_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {payment.method.charAt(0).toUpperCase() + payment.method.slice(1)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{payment.reference || '—'}</td>
                    <td className="text-right px-6 py-4 text-sm font-medium text-green-600">
                      {formatCurrency(payment.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Payment Instructions */}
        <div className="rounded-lg border border-gray-200 p-6 bg-amber-50">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">💡 PAYMENT INSTRUCTIONS</h3>
          <div className="text-sm text-gray-600 space-y-2">
            {balanceDue > 0 ? (
              <>
                <p>This invoice is outstanding. Please send payment within the due date.</p>
                <p className="font-medium">
                  Please check your invoice for payment details or contact the business directly.
                </p>
              </>
            ) : (
              <p className="text-green-600 font-medium">✓ Thank you! This invoice has been paid in full.</p>
            )}
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-8 rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">NOTES</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Terms */}
        {invoice.terms && (
          <div className="mt-8 rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">TERMS & CONDITIONS</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.terms}</p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
