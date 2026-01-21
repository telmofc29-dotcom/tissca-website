import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analytics',
};

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Analytics</h2>
        <p className="text-gray-600 mt-2">Connect and view your Google Analytics and Search Console data.</p>
      </div>

      {/* Connection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Google Analytics */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Google Analytics 4</h3>
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-gray-600 text-sm mb-6">
            Track visitor behavior, page views, user engagement, and conversion metrics.
          </p>
          <button className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded transition-colors">
            Connect Google Analytics
          </button>
          <p className="text-xs text-gray-500 mt-3">Status: Not connected</p>
        </div>

        {/* Google Search Console */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Google Search Console</h3>
            <span className="text-2xl">🔍</span>
          </div>
          <p className="text-gray-600 text-sm mb-6">
            Monitor search performance, keywords, click-through rates, and indexing status.
          </p>
          <button className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded transition-colors">
            Connect Search Console
          </button>
          <p className="text-xs text-gray-500 mt-3">Status: Not connected</p>
        </div>
      </div>

      {/* Placeholder Metrics */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Once Connected, You'll See:</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '👥', label: 'Monthly Users', value: '--' },
            { icon: '📄', label: 'Page Views', value: '--' },
            { icon: '⏱️', label: 'Avg Session Duration', value: '--' },
            { icon: '🎯', label: 'Bounce Rate', value: '--' },
            { icon: '🔍', label: 'Organic Impressions', value: '--' },
            { icon: '🖱️', label: 'Total Clicks', value: '--' },
          ].map((metric, idx) => (
            <div key={idx} className="text-center">
              <p className="text-3xl mb-2">{metric.icon}</p>
              <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Setup Instructions</h3>
        <ol className="space-y-4 text-gray-700">
          <li className="flex gap-4">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm">1</span>
            <span>Click "Connect Google Analytics" to authorize your GA4 property</span>
          </li>
          <li className="flex gap-4">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm">2</span>
            <span>Click "Connect Search Console" to authorize your GSC property</span>
          </li>
          <li className="flex gap-4">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm">3</span>
            <span>Data will begin syncing immediately and display on this dashboard</span>
          </li>
          <li className="flex gap-4">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-sm">4</span>
            <span>Check back regularly to monitor your platform's performance</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
