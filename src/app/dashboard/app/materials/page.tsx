'use client';

import React, { useEffect, useState } from 'react';
import { getSupabaseClient, getUserProfile } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { DashboardShell } from '@/components/layout/DashboardShell';

interface Material {
  id: string;
  category: string;
  name: string;
  unit: string;
  default_price: number;
  currency: string;
  is_active: boolean;
}

interface LabourRate {
  id: string;
  trade: string;
  rate_type: 'hourly' | 'daily';
  price: number;
  unit: string;
  currency: string;
  is_active: boolean;
}

type Tab = 'materials' | 'labour';

export default function MaterialsPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('materials');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [labourRates, setLabourRates] = useState<LabourRate[]>([]);
  const [businessId, setBusinessId] = useState<string>('');

  // Form states
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showLabourForm, setShowLabourForm] = useState(false);
  const [materialForm, setMaterialForm] = useState({
    category: '',
    name: '',
    unit: '',
    default_price: '',
    currency: 'USD',
  });
  const [labourForm, setLabourForm] = useState({
    trade: '',
    rate_type: 'hourly' as 'hourly' | 'daily',
    price: '',
    unit: '',
    currency: 'USD',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!supabase) {
          setError('Supabase client not initialized');
          setLoading(false);
          return;
        }

        // Get user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        // Get user profile (with auto-create)
        const profile = await getUserProfile(user.id);

        if (!profile || !['staff', 'accountant'].includes(profile.role)) {
          router.push('/login');
          return;
        }

        if (!profile.businessId) {
          setError('Business ID not found');
          setLoading(false);
          return;
        }

        setBusinessId(profile.businessId);

        // Load materials
        const { data: materialsData } = await supabase
          .from('materials_catalog')
          .select('*')
          .eq('business_id', profile.businessId)
          .order('category', { ascending: true });

        setMaterials(materialsData || []);

        // Load labour rates
        const { data: labourData } = await supabase
          .from('labour_rates')
          .select('*')
          .eq('business_id', profile.businessId)
          .order('trade', { ascending: true });

        setLabourRates(labourData || []);

        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
        setLoading(false);
      }
    };

    loadData();
  }, [supabase, router]);

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    if (!supabase) {
      setError('Supabase client not initialized');
      return;
    }

    const { error } = await supabase.from('materials_catalog').insert({
      business_id: businessId,
      category: materialForm.category,
      name: materialForm.name,
      unit: materialForm.unit,
      default_price: parseFloat(materialForm.default_price),
      currency: materialForm.currency,
      is_active: true,
    } as any);

    if (!error) {
      setMaterialForm({
        category: '',
        name: '',
        unit: '',
        default_price: '',
        currency: 'USD',
      });
      setShowMaterialForm(false);
      // Reload materials
      const { data } = await supabase
        .from('materials_catalog')
        .select('*')
        .eq('business_id', businessId);
      setMaterials(data || []);
    }
  };

  const handleAddLabourRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    if (!supabase) {
      setError('Supabase client not initialized');
      return;
    }

    const { error } = await supabase.from('labour_rates').insert({
      business_id: businessId,
      trade: labourForm.trade,
      rate_type: labourForm.rate_type,
      price: parseFloat(labourForm.price),
      unit: labourForm.unit,
      currency: labourForm.currency,
      is_active: true,
    } as any);

    if (!error) {
      setLabourForm({
        trade: '',
        rate_type: 'hourly',
        price: '',
        unit: '',
        currency: 'USD',
      });
      setShowLabourForm(false);
      // Reload labour rates
      const { data } = await supabase
        .from('labour_rates')
        .select('*')
        .eq('business_id', businessId);
      setLabourRates(data || []);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (confirm('Are you sure you want to delete this material?')) {
      if (!supabase) {
        setError('Supabase client not initialized');
        return;
      }

      const { error } = await supabase
        .from('materials_catalog')
        .delete()
        .eq('id', id);

      if (!error) {
        setMaterials(materials.filter((m) => m.id !== id));
      }
    }
  };

  const handleDeleteLabour = async (id: string) => {
    if (confirm('Are you sure you want to delete this labour rate?')) {
      if (!supabase) {
        setError('Supabase client not initialized');
        return;
      }

      const { error } = await supabase
        .from('labour_rates')
        .delete()
        .eq('id', id);

      if (!error) {
        setLabourRates(labourRates.filter((l) => l.id !== id));
      }
    }
  };

  const navItems = [
    {
      label: 'Overview',
      href: '/dashboard/app',
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
      label: 'Quotes',
      href: '/dashboard/app/quotes',
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
      label: 'Materials',
      href: '/dashboard/app/materials',
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
            d="M20 7l-8-4-8 4m0 0l8 4m-8-4v10l8 4m0-10l8 4m-8-4v10M7 12l8 4m0 0l8-4"
          />
        </svg>
      ),
    },
  ];

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <DashboardShell
        navItems={navItems}
        title="Materials & Pricing"
        role="staff"
      >
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      navItems={navItems}
      title="Materials & Pricing"
      role="staff"
    >
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-8">
          <button
            onClick={() => setTab('materials')}
            className={`px-1 py-4 text-sm font-medium border-b-2 ${
              tab === 'materials'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Materials Catalog
          </button>
          <button
            onClick={() => setTab('labour')}
            className={`px-1 py-4 text-sm font-medium border-b-2 ${
              tab === 'labour'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Labour Rates
          </button>
        </div>
      </div>

      {/* Materials Tab */}
      {tab === 'materials' && (
        <div className="space-y-6">
          <button
            onClick={() => setShowMaterialForm(!showMaterialForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Material
          </button>

          {showMaterialForm && (
            <form
              onSubmit={handleAddMaterial}
              className="rounded-lg border border-gray-200 bg-white p-6"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="Category (e.g., Lumber)"
                  value={materialForm.category}
                  onChange={(e) =>
                    setMaterialForm({
                      ...materialForm,
                      category: e.target.value,
                    })
                  }
                  className="rounded border border-gray-300 px-3 py-2"
                  required
                />
                <input
                  type="text"
                  placeholder="Material Name"
                  value={materialForm.name}
                  onChange={(e) =>
                    setMaterialForm({ ...materialForm, name: e.target.value })
                  }
                  className="rounded border border-gray-300 px-3 py-2"
                  required
                />
                <input
                  type="text"
                  placeholder="Unit (e.g., sq ft, kg)"
                  value={materialForm.unit}
                  onChange={(e) =>
                    setMaterialForm({ ...materialForm, unit: e.target.value })
                  }
                  className="rounded border border-gray-300 px-3 py-2"
                  required
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={materialForm.default_price}
                  onChange={(e) =>
                    setMaterialForm({
                      ...materialForm,
                      default_price: e.target.value,
                    })
                  }
                  className="rounded border border-gray-300 px-3 py-2"
                  step="0.01"
                  required
                />
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Add Material
                </button>
                <button
                  type="button"
                  onClick={() => setShowMaterialForm(false)}
                  className="rounded bg-gray-200 px-4 py-2 text-gray-900 hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Materials List */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {materials.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No materials yet. Add one to get started.
                    </td>
                  </tr>
                ) : (
                  materials.map((material) => (
                    <tr key={material.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {material.category}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {material.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {material.unit}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        ${material.default_price.toFixed(2)}{' '}
                        <span className="text-xs text-gray-500">
                          {material.currency}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            material.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {material.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleDeleteMaterial(material.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Labour Rates Tab */}
      {tab === 'labour' && (
        <div className="space-y-6">
          <button
            onClick={() => setShowLabourForm(!showLabourForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Labour Rate
          </button>

          {showLabourForm && (
            <form
              onSubmit={handleAddLabourRate}
              className="rounded-lg border border-gray-200 bg-white p-6"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  type="text"
                  placeholder="Trade (e.g., Carpenter)"
                  value={labourForm.trade}
                  onChange={(e) =>
                    setLabourForm({ ...labourForm, trade: e.target.value })
                  }
                  className="rounded border border-gray-300 px-3 py-2"
                  required
                />
                <select
                  value={labourForm.rate_type}
                  onChange={(e) =>
                    setLabourForm({
                      ...labourForm,
                      rate_type: e.target.value as 'hourly' | 'daily',
                    })
                  }
                  className="rounded border border-gray-300 px-3 py-2"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                </select>
                <input
                  type="number"
                  placeholder="Price"
                  value={labourForm.price}
                  onChange={(e) =>
                    setLabourForm({ ...labourForm, price: e.target.value })
                  }
                  className="rounded border border-gray-300 px-3 py-2"
                  step="0.01"
                  required
                />
                <input
                  type="text"
                  placeholder="Unit"
                  value={labourForm.unit}
                  onChange={(e) =>
                    setLabourForm({ ...labourForm, unit: e.target.value })
                  }
                  className="rounded border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Add Labour Rate
                </button>
                <button
                  type="button"
                  onClick={() => setShowLabourForm(false)}
                  className="rounded bg-gray-200 px-4 py-2 text-gray-900 hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Labour Rates List */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Trade
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {labourRates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No labour rates yet. Add one to get started.
                    </td>
                  </tr>
                ) : (
                  labourRates.map((rate) => (
                    <tr key={rate.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {rate.trade}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                        {rate.rate_type}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {rate.unit}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        ${rate.price.toFixed(2)}{' '}
                        <span className="text-xs text-gray-500">
                          {rate.currency}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            rate.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {rate.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleDeleteLabour(rate.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
