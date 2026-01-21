import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Revenue',
};

export default function AdminRevenuePagePage() {
  const monthlyData = [
    { month: 'January', ads: 2450, affiliate: 1200, subscriptions: 5600, total: 9250 },
    { month: 'February', ads: 2100, affiliate: 1400, subscriptions: 5200, total: 8700 },
    { month: 'March', ads: 2800, affiliate: 950, subscriptions: 6100, total: 9850 },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Revenue Tracking</h2>
        <p className="text-gray-600 mt-2">Track and manage revenue from ads, affiliates, and subscriptions.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Ad Revenue (This Month)', value: '$2,800', color: 'bg-green-50 border-green-200' },
          { label: 'Affiliate Revenue', value: '$950', color: 'bg-blue-50 border-blue-200' },
          { label: 'Subscriptions', value: '$6,100', color: 'bg-purple-50 border-purple-200' },
          { label: 'Total Revenue', value: '$9,850', color: 'bg-amber-50 border-amber-200' },
        ].map((card) => (
          <div key={card.label} className={`rounded-lg border ${card.color} p-6`}>
            <p className="text-sm text-gray-600 mb-2">{card.label}</p>
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Revenue Breakdown</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Month</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Ad Revenue</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Affiliate</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Subscriptions</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Total</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((row, idx) => (
              <tr key={row.month} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.month}</td>
                <td className="px-6 py-4 text-sm text-right text-gray-600">${row.ads}</td>
                <td className="px-6 py-4 text-sm text-right text-gray-600">${row.affiliate}</td>
                <td className="px-6 py-4 text-sm text-right text-gray-600">${row.subscriptions}</td>
                <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">${row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Revenue Sources Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: 'Display Ads',
            icon: '📺',
            description: 'CPM and CPC advertising revenue',
            action: 'Manage Ad Networks',
          },
          {
            title: 'Affiliate Commissions',
            icon: '🤝',
            description: 'Product affiliate and referral revenue',
            action: 'View Affiliates',
          },
          {
            title: 'Subscriptions',
            icon: '💳',
            description: 'Premium content and membership revenue',
            action: 'Manage Subscriptions',
          },
        ].map((source) => (
          <div key={source.title} className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-3xl mb-2">{source.icon}</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{source.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{source.description}</p>
            <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
              {source.action}
            </button>
          </div>
        ))}
      </div>

      {/* Coming Soon */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-amber-900 mb-2">Feature Coming Soon</h3>
        <p className="text-amber-800 text-sm">
          Detailed revenue analytics, payment processing integration, and automated payout management will be available soon.
        </p>
      </div>
    </div>
  );
}
