import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reports',
};

export default function AdminReportsPage() {
  const reports = [
    { name: 'Monthly Performance Report', type: 'PDF', size: '2.4 MB', date: '2024-01-31' },
    { name: 'Q4 Analytics Summary', type: 'PDF', size: '3.1 MB', date: '2023-12-31' },
    { name: 'Revenue Report 2024', type: 'CSV', size: '0.5 MB', date: '2024-01-31' },
    { name: 'Content Audit Q1', type: 'PDF', size: '1.8 MB', date: '2024-01-15' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Reports & Exports</h2>
          <p className="text-gray-600 mt-2">Generate and download reports for your accountants, investors, and stakeholders.</p>
        </div>
        <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition-colors">
          + Generate Report
        </button>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          {
            title: 'Monthly Report',
            icon: '📊',
            description: 'Traffic, revenue, content metrics, and analytics',
            formats: ['PDF', 'CSV', 'Excel'],
          },
          {
            title: 'Quarterly Report',
            icon: '📈',
            description: 'Detailed analysis of quarterly performance',
            formats: ['PDF', 'CSV', 'Excel'],
          },
          {
            title: 'Annual Report',
            icon: '📅',
            description: 'Full year summary for investors and stakeholders',
            formats: ['PDF', 'Excel'],
          },
          {
            title: 'Custom Report',
            icon: '⚙️',
            description: 'Select your own metrics and date ranges',
            formats: ['PDF', 'CSV', 'Excel'],
          },
        ].map((report) => (
          <div key={report.title} className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-3xl mb-3">{report.icon}</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{report.title}</h3>
            <p className="text-sm text-gray-600 mb-4">{report.description}</p>
            <div className="flex gap-2">
              {report.formats.map((format) => (
                <button
                  key={format}
                  className="px-3 py-2 text-xs font-medium border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  {format}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Reports</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Report Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Size</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Generated</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report, idx) => (
              <tr key={report.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{report.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{report.type}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{report.size}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{report.date}</td>
                <td className="px-6 py-4 text-sm">
                  <button className="text-blue-600 hover:text-blue-700 font-medium mr-4">Download</button>
                  <button className="text-red-600 hover:text-red-700 font-medium">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Report Templates */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Available Report Sections</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <p className="font-medium mb-2">Traffic & Engagement</p>
            <ul className="space-y-1 text-xs ml-4">
              <li>• Monthly visitor metrics</li>
              <li>• Page view breakdown</li>
              <li>• User engagement rates</li>
              <li>• Bounce rate analysis</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">Revenue & Growth</p>
            <ul className="space-y-1 text-xs ml-4">
              <li>• Ad revenue summary</li>
              <li>• Affiliate commissions</li>
              <li>• Subscription metrics</li>
              <li>• Year-over-year growth</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">Content Performance</p>
            <ul className="space-y-1 text-xs ml-4">
              <li>• Top performing articles</li>
              <li>• Content categories report</li>
              <li>• Publishing schedule</li>
              <li>• SEO performance</li>
            </ul>
          </div>
          <div>
            <p className="font-medium mb-2">Technical Health</p>
            <ul className="space-y-1 text-xs ml-4">
              <li>• Site uptime & performance</li>
              <li>• Page load times</li>
              <li>• Error logs</li>
              <li>• SEO health check</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
