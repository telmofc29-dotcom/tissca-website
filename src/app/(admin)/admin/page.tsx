import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-2">Welcome to your admin dashboard. Overview of platform metrics and quick actions.</p>
      </div>

      {/* Management Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Users */}
        <Link href="/admin/users" className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-400 hover:shadow-lg transition-all">
          <div className="text-4xl mb-4">👥</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Users</h2>
          <p className="text-gray-600 text-sm">View all platform users, subscriptions, and account details.</p>
        </Link>

        {/* Revenue */}
        <Link href="/admin/accountant" className="bg-white rounded-lg border border-gray-200 p-6 hover:border-green-400 hover:shadow-lg transition-all">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Revenue Report</h2>
          <p className="text-gray-600 text-sm">Financial overview, MRR, and accountant panel with CSV export.</p>
        </Link>

        {/* Pricing */}
        <Link href="/admin/pricing" className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-400 hover:shadow-lg transition-all">
          <div className="text-4xl mb-4">💰</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Pricing Configuration</h2>
          <p className="text-gray-600 text-sm">Manage trade rates, regional adjustments, and pricing modes.</p>
        </Link>

        {/* Documents */}
        <Link href="/admin/docs" className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-400 hover:shadow-lg transition-all">
          <div className="text-4xl mb-4">📄</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Document Management</h2>
          <p className="text-gray-600 text-sm">Manage templates, default terms, and service pricing library.</p>
        </Link>

        {/* Feedback */}
        <Link href="/admin/feedback" className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-400 hover:shadow-lg transition-all">
          <div className="text-4xl mb-4">💬</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Feedback & Reviews</h2>
          <p className="text-gray-600 text-sm">View and manage user feedback, bug reports, and suggestions.</p>
        </Link>

        {/* Analytics */}
        <Link href="/admin/analytics" className="bg-white rounded-lg border border-gray-200 p-6 hover:border-purple-400 hover:shadow-lg transition-all">
          <div className="text-4xl mb-4">📈</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Analytics</h2>
          <p className="text-gray-600 text-sm">View platform usage, user engagement, and growth metrics.</p>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Pages', value: '127', color: 'bg-blue-50 border-blue-200' },
          { label: 'Published Articles', value: '43', color: 'bg-green-50 border-green-200' },
          { label: 'Monthly Visitors', value: '12.4K', color: 'bg-purple-50 border-purple-200' },
          { label: 'Pending Reviews', value: '8', color: 'bg-amber-50 border-amber-200' },
        ].map((stat) => (
          <div key={stat.label} className={`p-6 rounded-lg border ${stat.color}`}>
            <p className="text-sm text-gray-600 mb-2">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {[
              { action: 'New article published', time: '2 hours ago' },
              { action: 'Media file uploaded', time: '5 hours ago' },
              { action: 'Revenue data updated', time: '1 day ago' },
              { action: 'Report generated', time: '2 days ago' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-700">{item.action}</span>
                <span className="text-xs text-gray-400">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded transition-colors text-left">
              + Create New Article
            </button>
            <button className="w-full px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 font-semibold rounded transition-colors text-left">
              + Upload Media
            </button>
            <button className="w-full px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded transition-colors text-left">
              View Analytics
            </button>
            <button className="w-full px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded transition-colors text-left">
              Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* Platform Health */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Platform Health</h3>
        <div className="space-y-4">
          {[
            { metric: 'Database', status: 'Healthy', progress: 95 },
            { metric: 'API Uptime', status: 'Excellent', progress: 99.9 },
            { metric: 'Content Coverage', status: 'Good', progress: 78 },
            { metric: 'Media Library', status: 'Optimal', progress: 65 },
          ].map((item) => (
            <div key={item.metric}>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">{item.metric}</span>
                <span className="text-xs text-green-600 font-medium">{item.status}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
