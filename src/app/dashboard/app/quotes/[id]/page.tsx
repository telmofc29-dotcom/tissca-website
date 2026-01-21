/**
 * View/Edit Quote Page
 * Desktop-first three-column layout for viewing and editing existing quotes
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { getSupabaseClient, getUserProfile } from '@/lib/supabase';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { QuoteItemsTable, QuoteLineItem } from '@/components/quotes/QuoteItemsTable';
import { QuoteTotalsPanel } from '@/components/quotes/QuoteTotalsPanel';
import { MaterialPickerModal } from '@/components/quotes/MaterialPickerModal';
import { LabourPickerModal } from '@/components/quotes/LabourPickerModal';
import { calculateQuoteTotals } from '@/lib/validators/quoteSchemas';
import {
  Client,
  Material,
  MaterialVariant,
  LabourRate,
  Quote,
  QuoteItem,
} from '@/types/quotes';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/app', icon: '📊' },
  { label: 'Materials', href: '/dashboard/app/materials', icon: '📦' },
  { label: 'Quotes', href: '/dashboard/app/quotes', icon: '📄' },
];

export default function ViewQuotePage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);

  // Quote data
  const [quote, setQuote] = useState<Quote | null>(null);
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [validityUntil, setValidityUntil] = useState('');
  const [items, setItems] = useState<QuoteLineItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Invoice state
  const [existingInvoiceId, setExistingInvoiceId] = useState<string | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  // Modal state
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showLabourModal, setShowLabourModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');

  // Materials and labour data
  const [materials, setMaterials] = useState<Material[]>([]);
  const [variants, setVariants] = useState<MaterialVariant[]>([]);
  const [labourRates, setLabourRates] = useState<LabourRate[]>([]);

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
          router.push('/auth/login');
          return;
        }

        // Get user profile (with auto-create)
        const profileData = await getUserProfile(user.id);

        if (!profileData) {
          router.push('/auth/login');
          return;
        }

        // Verify role
        if (profileData.role !== 'staff' && profileData.role !== 'admin') {
          router.push('/dashboard');
          return;
        }

        setUserRole(profileData.role);

        // Fetch clients
        const { data: clientsData } = await supabase
          .from('clients')
          .select('*')
          .eq('business_id', profileData.businessId)
          .order('name');

        setClients((clientsData as Client[]) || []);

        // Fetch materials
        const { data: materialsData } = await supabase
          .from('materials')
          .select('*')
          .eq('business_id', profileData.businessId)
          .order('name');

        setMaterials((materialsData as Material[]) || []);

        // Fetch variants
        const { data: variantsData } = await supabase
          .from('material_variants')
          .select('*')
          .eq('business_id', profileData.business_id);

        setVariants((variantsData as MaterialVariant[]) || []);

        // Fetch labour rates
        const { data: labourData } = await supabase
          .from('labour_rates_new')
          .select('*')
          .eq('business_id', profileData.business_id)
          .order('trade');

        setLabourRates((labourData as LabourRate[]) || []);

        // Fetch the quote
        const { data: quoteData, error: quoteError } = await supabase
          .from('quotes')
          .select('*')
          .eq('id', quoteId)
          .eq('business_id', profileData.business_id)
          .single();

        if (quoteError) throw quoteError;

        const q = quoteData as Quote;
        setQuote(q);
        setClientId(q.client_id);
        setTitle(q.title || '');
        setNotes(q.notes || '');
        setValidityUntil(q.valid_until?.split('T')[0] || '');

        // Fetch quote items
        const { data: itemsData, error: itemsError } = await supabase
          .from('quote_items')
          .select('*')
          .eq('quote_id', quoteId)
          .order('created_at');

        if (itemsError) throw itemsError;

        const lineItems = (itemsData as QuoteItem[]).map((item) => ({
          ...item,
          description: item.custom_description || 'Item',
          line_total: item.quantity * item.unit_price,
        }));

        setItems(lineItems);

        // Check for existing invoice from this quote
        const { data: invoiceData } = await supabase
          .from('invoices')
          .select('id')
          .eq('quote_id', quoteId)
          .single();

        if (invoiceData) {
          setExistingInvoiceId(invoiceData.id);
        }
      } catch (error) {
        console.error('Error loading quote:', error);
        router.push('/dashboard/app/quotes');
      } finally {
        setLoading(false);
      }
    };

    loadQuote();
  }, [router, quoteId]);

  // Calculate totals when items change
  useEffect(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const result = calculateQuoteTotals(subtotal, {
      vat_rate: 20,
      discount_type: 'none',
      discount_value: null,
      markup_type: 'none',
      markup_value: null,
      deposit_type: 'none',
      deposit_value: null,
    });
    setTotals(result);
  }, [items]);

  const handleAddMaterial = (material: Material, variant?: MaterialVariant) => {
    const description = variant
      ? `${material.name} (${variant.label})`
      : material.name;
    const price = (variant && variant.price_override) ? variant.price_override : material.default_price;

    const newItem: QuoteLineItem = {
      id: `temp-${Date.now()}`,
      description,
      quantity: 1,
      unit_price: price,
      item_type: 'material',
      is_locked: true,
    };

    setItems([...items, newItem]);
    setShowMaterialModal(false);
  };

  const handleAddLabour = (labour: LabourRate) => {
    const newItem: QuoteLineItem = {
      id: `temp-${Date.now()}`,
      description: labour.trade,
      quantity: 1,
      unit_price: labour.price,
      item_type: 'labour',
      is_locked: true,
    };

    setItems([...items, newItem]);
    setShowLabourModal(false);
  };

  const handleDeleteItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId));
  };

  const handleUpdateItem = async (itemId: string, updates: Partial<QuoteLineItem>) => {
    setItems(
      items.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      )
    );
  };

  const handleSaveChanges = async () => {
    if (!clientId || !title) {
      alert('Please fill in client and title');
      return;
    }

    try {
      setSaving(true);

      // Update quote
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          client_id: clientId,
          title,
          notes,
          validity_until: validityUntil || null,
          total_amount: totals.total,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quoteId);

      if (updateError) throw updateError;

      // Delete old items
      await supabase.from('quote_items').delete().eq('quote_id', quoteId);

      // Add new items
      for (const item of items) {
        await supabase.from('quote_items').insert({
          quote_id: quoteId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          item_type: item.item_type,
          created_at: new Date().toISOString(),
        });
      }

      setIsEditing(false);
      alert('Quote updated successfully');
    } catch (error) {
      console.error('Error saving quote:', error);
      alert('Failed to save quote');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRevision = async () => {
    if (!revisionReason.trim()) {
      alert('Please provide a reason for the revision');
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`/api/quotes/${quoteId}/create-revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          change_reason: revisionReason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create revision');
      }

      const result = await response.json();
      setQuote({ ...quote!, is_locked: false });
      setShowRevisionModal(false);
      setRevisionReason('');
      setIsEditing(true);
      alert(`Revision ${result.revision_number} created. You can now edit the quote.`);
    } catch (error: any) {
      console.error('Error creating revision:', error);
      alert(`Failed to create revision: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateInvoice = async () => {
    try {
      setCreatingInvoice(true);
      const response = await fetch(`/api/quotes/${quoteId}/create-invoice`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create invoice');
      }

      const data = await response.json();
      router.push(`/dashboard/app/invoices/${data.invoice_id}`);
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      alert(`Failed to create invoice: ${error.message}`);
    } finally {
      setCreatingInvoice(false);
    }
  };

  const canEdit = quote && (quote.status === 'draft' || (quote.status === 'accepted' && !quote.is_locked));
  const isLocked = quote && quote.is_locked && quote.status === 'accepted';

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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <DashboardShell navItems={navItems} title={quote.quote_number} role={userRole as any}>
      <div className="max-w-7xl mx-auto mb-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{quote.quote_number}</h1>
            <p className="text-gray-600 mt-1">
              {quote.title}{' '}
              <span
                className={`inline-block px-3 py-1 text-xs font-medium rounded-full ml-3 ${getStatusColor(
                  quote.status
                )}`}
              >
                {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
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
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Edit Quote
              </button>
            )}
            {isLocked && !isEditing && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-xs font-semibold text-green-700">LOCKED (ACCEPTED)</span>
                </div>
                <button
                  onClick={() => setShowRevisionModal(true)}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                >
                  Create Revision
                </button>
                {existingInvoiceId ? (
                  <button
                    onClick={() => router.push(`/dashboard/app/invoices/${existingInvoiceId}`)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    View Invoice
                  </button>
                ) : (
                  <button
                    onClick={handleCreateInvoice}
                    disabled={creatingInvoice}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingInvoice ? 'Creating...' : 'Create Invoice'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* View Mode */}
        {!isEditing ? (
          <div className="grid grid-cols-12 gap-6">
            {/* LEFT COLUMN */}
            <div className="col-span-4">
              <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    CLIENT
                  </label>
                  <p className="text-lg font-medium text-gray-900">
                    {clients.find((c) => c.id === clientId)?.name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    QUOTE TITLE
                  </label>
                  <p className="text-lg font-medium text-gray-900">{title}</p>
                </div>
                {validityUntil && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      VALID UNTIL
                    </label>
                    <p className="text-gray-900">
                      {new Date(validityUntil).toLocaleDateString('en-GB')}
                    </p>
                  </div>
                )}
                {notes && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      NOTES
                    </label>
                    <p className="text-gray-700 whitespace-pre-wrap">{notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* MIDDLE COLUMN */}
            <div className="col-span-5">
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Line Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 font-semibold text-gray-700">
                          Description
                        </th>
                        <th className="text-right py-3 font-semibold text-gray-700 w-20">
                          Qty
                        </th>
                        <th className="text-right py-3 font-semibold text-gray-700 w-28">
                          Unit Price
                        </th>
                        <th className="text-right py-3 font-semibold text-gray-700 w-28">
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
                          <td className="py-3 text-gray-900">{item.description}</td>
                          <td className="text-right text-gray-900">{item.quantity}</td>
                          <td className="text-right text-gray-900">
                            {new Intl.NumberFormat('en-GB', {
                              style: 'currency',
                              currency: 'GBP',
                            }).format(item.unit_price)}
                          </td>
                          <td className="text-right font-medium text-gray-900">
                            {new Intl.NumberFormat('en-GB', {
                              style: 'currency',
                              currency: 'GBP',
                            }).format(item.quantity * item.unit_price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="col-span-3">
              <QuoteTotalsPanel totals={totals} isLoading={false} />
            </div>
          </div>
        ) : (
          /* EDIT MODE */
          <div className="grid grid-cols-12 gap-6">
            {/* LEFT COLUMN */}
            <div className="col-span-4">
              <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Client
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a client...</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Quote Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Validity Until
                  </label>
                  <input
                    type="date"
                    value={validityUntil}
                    onChange={(e) => setValidityUntil(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* MIDDLE COLUMN */}
            <div className="col-span-5">
              <QuoteItemsTable
                items={items}
                onAddMaterial={() => setShowMaterialModal(true)}
                onAddLabour={() => setShowLabourModal(true)}
                onAddCustom={() => {}}
                onDeleteItem={handleDeleteItem}
                onUpdateItem={handleUpdateItem}
              />
            </div>

            {/* RIGHT COLUMN */}
            <div className="col-span-3">
              <QuoteTotalsPanel totals={totals} />

              <div className="mt-6 space-y-3">
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="w-full px-4 py-2 bg-gray-300 text-gray-900 rounded-lg font-medium hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isEditing && (
        <>
          <MaterialPickerModal
            isOpen={showMaterialModal}
            onClose={() => setShowMaterialModal(false)}
            materials={materials}
            variants={variants}
            onSelect={handleAddMaterial}
          />
          <LabourPickerModal
            isOpen={showLabourModal}
            onClose={() => setShowLabourModal(false)}
            labourRates={labourRates}
            onSelect={handleAddLabour}
          />

          {/* CREATE REVISION MODAL */}
          {showRevisionModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Create Quote Revision
                  </h2>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <p className="text-gray-700">
                    This quote has been accepted and locked. Creating a revision will unlock it and allow edits.
                  </p>
                  <p className="text-sm text-gray-600">
                    A historical record of this revision will be maintained for audit purposes.
                  </p>
                  <textarea
                    value={revisionReason}
                    onChange={(e) => setRevisionReason(e.target.value)}
                    placeholder="Reason for revision (e.g., 'Client requested changes')"
                    disabled={saving}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
                  <button
                    onClick={() => {
                      setShowRevisionModal(false);
                      setRevisionReason('');
                    }}
                    disabled={saving}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateRevision}
                    disabled={saving || !revisionReason.trim()}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? 'Creating...' : 'Create Revision'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}
