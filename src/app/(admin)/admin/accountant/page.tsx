'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface RevenueData {
  activePremiumSubscriptions: number;
  estimatedMRR: number;
  premiumMonthlyCount: number;
  premiumAnnualCount: number;
  monthlyBreakdown: Array<{
    month: string;
    subscriptionRevenue: number;
    adRevenue: number;
    totalRevenue: number;
  }>;
  annualProjected: number;
}

export default function AccountantPage() {
  const { isLoggedIn, getAccessToken } = useAuth();
  const router = useRouter();
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/auth/login');
      return;
    }
    loadRevenueData();
  }, [isLoggedIn]);

  async function loadRevenueData() {
    try {
      setLoading(true);
      const token = await getAccessToken();
      if (!token) throw new Error('No auth token');

      const response = await fetch('/api/admin/revenue', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Admin access required.');
        }
        throw new Error('Failed to load revenue data');
      }
      const data = await response.json();
      setRevenue(data.revenue);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function exportToCSV() {
    if (!revenue) return;

    const headers = ['Month', 'Subscription Revenue', 'Ad Revenue', 'Total Revenue'];
    const rows = revenue.monthlyBreakdown.map((month) => [
      month.month,
      month.subscriptionRevenue.toFixed(2),
      month.adRevenue.toFixed(2),
      month.totalRevenue.toFixed(2),
    ]);

    // Add summary rows
    rows.push(['']);
    rows.push(['Annual Projected', revenue.annualProjected.toFixed(2), '0.00', revenue.annualProjected.toFixed(2)]);
    rows.push(['Active Premium Subscriptions', revenue.activePremiumSubscriptions.toString()]);
    rows.push(['Monthly (£3): ', revenue.premiumMonthlyCount.toString()]);
    rows.push(['Annual (£20): ', revenue.premiumAnnualCount.toString()]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `buildr-revenue-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <Link href="/(admin)/admin" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
            ← Admin Dashboard
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Revenue Report</h1>
              <p className="text-gray-600">Financial overview and accountant panel</p>
            </div>
            {revenue && (
              <button
                onClick={exportToCSV}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Export CSV
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <p>Loading revenue data...</p>
        ) : revenue ? (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600 text-sm mb-1">Active Premium</p>
                <p className="text-3xl font-bold text-slate-900">{revenue.activePremiumSubscriptions}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600 text-sm mb-1">Estimated MRR</p>
                <p className="text-3xl font-bold text-green-600">£{revenue.estimatedMRR.toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600 text-sm mb-1">Monthly Plans</p>
                <p className="text-3xl font-bold text-slate-900">{revenue.premiumMonthlyCount}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <p className="text-gray-600 text-sm mb-1">Annual Plans</p>
                <p className="text-3xl font-bold text-slate-900">{revenue.premiumAnnualCount}</p>
              </div>
            </div>

            {/* Annual Projection */}
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Annual Projection</h2>
              <p className="text-4xl font-bold text-green-600 mb-2">£{revenue.annualProjected.toFixed(2)}</p>
              <p className="text-gray-600">Based on current active subscriptions</p>
            </div>

            {/* Monthly Breakdown */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-slate-900">Monthly Revenue Breakdown</h2>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Month</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Subscription Revenue</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Ad Revenue</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.monthlyBreakdown.map((month, idx) => (
                    <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-slate-900 font-semibold">{month.month}</td>
                      <td className="px-6 py-4 text-slate-900">£{month.subscriptionRevenue.toFixed(2)}</td>
                      <td className="px-6 py-4 text-gray-600">£{month.adRevenue.toFixed(2)}</td>
                      <td className="px-6 py-4 text-slate-900 font-semibold">£{month.totalRevenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Subscription Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Subscription Summary</h3>
              <div className="space-y-2 text-gray-700">
                <p>• <strong>Total Active Premium:</strong> {revenue.activePremiumSubscriptions} subscriptions</p>
                <p>• <strong>Monthly Plans (£3):</strong> {revenue.premiumMonthlyCount} subscriptions (£{(revenue.premiumMonthlyCount * 3).toFixed(2)}/month)</p>
                <p>• <strong>Annual Plans (£20):</strong> {revenue.premiumAnnualCount} subscriptions (£{(revenue.premiumAnnualCount * 20 / 12).toFixed(2)}/month avg)</p>
                <p>• <strong>Total Estimated MRR:</strong> £{revenue.estimatedMRR.toFixed(2)}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
