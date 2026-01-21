/**
 * Create New Quote Page
 * Desktop-first three-column layout: left (details), middle (items), right (totals)
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient, getUserProfile } from '@/lib/supabase';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { QuoteItemsTable, QuoteLineItem } from '@/components/quotes/QuoteItemsTable';
import { QuoteTotalsPanel } from '@/components/quotes/QuoteTotalsPanel';
import { MaterialPickerModal } from '@/components/quotes/MaterialPickerModal';
import { LabourPickerModal } from '@/components/quotes/LabourPickerModal';
import { calculateQuoteTotals } from '@/lib/validators/quoteSchemas';
import { Client, Material, MaterialVariant, LabourRate } from '@/types/quotes';

const navItems = [
  { label: 'Dashboard', href: '/dashboard/app', icon: '📊' },
  { label: 'Materials', href: '/dashboard/app/materials', icon: '📦' },
  { label: 'Quotes', href: '/dashboard/app/quotes', icon: '📄' },
];

export default function CreateQuotePage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [items, setItems] = useState<QuoteLineItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [saving, setSaving] = useState(false);
  const [businessId, setBusinessId] = useState('');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');

  // Form state
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [validityUntil, setValidityUntil] = useState('');

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

  // Modal state
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showLabourModal, setShowLabourModal] = useState(false);

  // Materials and labour data
  const [materials, setMaterials] = useState<Material[]>([]);
  const [variants, setVariants] = useState<MaterialVariant[]>([]);
  const [labourRates, setLabourRates] = useState<LabourRate[]>([]);

  // Initialize page
  useEffect(() => {
    const initialize = async () => {
      try {
        if (!supabase) {
          console.error('[NewQuote] Supabase not initialized');
          router.push('/auth/login');
          return;
        }

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
        setBusinessId(profileData.businessId);

        // Fetch clients
        const { data: clientsData, error: clientsError } = await supabase
          .from('clients')
          .select('*')
          .eq('business_id', profileData.businessId)
          .order('name');

        if (clientsError) throw clientsError;
        setClients((clientsData as Client[]) || []);

        // Fetch materials
        const { data: materialsData, error: materialsError } = await supabase
          .from('materials')
          .select('*')
          .eq('business_id', profileData.businessId)
          .order('name');

        if (materialsError) throw materialsError;
        setMaterials((materialsData as Material[]) || []);

        // Fetch variants
        const { data: variantsData, error: variantsError } = await supabase
          .from('material_variants')
          .select('*')
          .eq('business_id', profileData.businessId);

        if (variantsError) throw variantsError;
        setVariants((variantsData as MaterialVariant[]) || []);

        // Fetch labour rates
        const { data: labourData, error: labourError } = await supabase
          .from('labour_rates_new')
          .select('*')
          .eq('business_id', profileData.business_id)
          .order('trade');

        if (labourError) throw labourError;
        setLabourRates((labourData as LabourRate[]) || []);
      } catch (error) {
        console.error('Error initializing:', error);
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [router]);

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

  const handleSaveDraft = async () => {
    if (!clientId || !title) {
      alert('Please fill in client and title');
      return;
    }

    try {
      setSaving(true);

      // Generate sequential quote number: get max from existing quotes and increment
      const { data: existingQuotes } = await supabase
        .from('quotes')
        .select('quote_number')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(1);

      let quoteNumber = `Q-${businessId.substring(0, 8).toUpperCase()}-000001`;
      if (existingQuotes && existingQuotes.length > 0) {
        const lastNumber = existingQuotes[0].quote_number;
        const match = lastNumber.match(/-(\d+)$/);
        if (match) {
          const nextNum = (parseInt(match[1]) + 1).toString().padStart(6, '0');
          quoteNumber = lastNumber.substring(0, lastNumber.lastIndexOf('-') + 1) + nextNum;
        }
      }

      // Create quote
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          business_id: businessId,
          client_id: clientId,
          quote_number: quoteNumber,
          title,
          notes,
          validity_until: validityUntil || null,
          status: 'draft',
          total_amount: totals.total,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Add items
      const quoteId = quoteData.id;
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

      // Redirect to view page
      router.push(`/dashboard/app/quotes/${quoteId}`);
    } catch (error) {
      console.error('Error saving quote:', error);
      alert('Failed to save quote');
    } finally {
      setSaving(false);
    }
  };

  const handleSendToClient = async () => {
    if (!clientId || !title) {
      alert('Please fill in client and title');
      return;
    }

    try {
      setSaving(true);

      // Generate sequential quote number: get max from existing quotes and increment
      const { data: existingQuotes } = await supabase
        .from('quotes')
        .select('quote_number')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(1);

      let quoteNumber = `Q-${businessId.substring(0, 8).toUpperCase()}-000001`;
      if (existingQuotes && existingQuotes.length > 0) {
        const lastNumber = existingQuotes[0].quote_number;
        const match = lastNumber.match(/-(\d+)$/);
        if (match) {
          const nextNum = (parseInt(match[1]) + 1).toString().padStart(6, '0');
          quoteNumber = lastNumber.substring(0, lastNumber.lastIndexOf('-') + 1) + nextNum;
        }
      }

      // Create quote with 'sent' status
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          business_id: businessId,
          client_id: clientId,
          quote_number: quoteNumber,
          title,
          notes,
          validity_until: validityUntil || null,
          status: 'sent',
          total_amount: totals.total,
          sent_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Add items
      const quoteId = quoteData.id;
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

      // Redirect to view page
      router.push(`/dashboard/app/quotes/${quoteId}`);
    } catch (error) {
      console.error('Error sending quote:', error);
      alert('Failed to send quote');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell navItems={navItems} title="New Quote" role={userRole as any}>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Loading...</div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell navItems={navItems} title="New Quote" role={userRole as any}>
      <div className="max-w-7xl mx-auto mb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create Quote</h1>
          <p className="text-gray-600 mt-1">Build a new quote for your client</p>
        </div>

        {/* Three Column Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT COLUMN: Quote Details */}
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
                  placeholder="e.g., Kitchen Renovation"
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
                  placeholder="Add any additional notes or terms..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* MIDDLE COLUMN: Line Items */}
          <div className="col-span-5">
            <QuoteItemsTable
              items={items}
              onAddMaterial={() => setShowMaterialModal(true)}
              onAddLabour={() => setShowLabourModal(true)}
                onAddCustom={() => {}}
              onDeleteItem={handleDeleteItem}
              onUpdateItem={handleUpdateItem}
              isLoading={false}
            />
          </div>

          {/* RIGHT COLUMN: Totals Panel */}
          <div className="col-span-3">
            <QuoteTotalsPanel totals={totals} isLoading={false} />

            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              <button
                onClick={handleSaveDraft}
                disabled={saving || !clientId || !title}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={handleSendToClient}
                disabled={saving || !clientId || !title}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Sending...' : 'Send to Client'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
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
    </DashboardShell>
  );
}
