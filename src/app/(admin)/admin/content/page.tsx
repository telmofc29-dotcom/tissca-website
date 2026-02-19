import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Content Manager',
};

export default function AdminContentPage() {
  const articles = [
    { id: 1, title: 'How to Tile a Bathroom', type: 'Guide', status: 'Published', date: '2024-01-15' },
    { id: 2, title: 'Common Painting Mistakes', type: 'Article', status: 'Draft', date: '2024-01-10' },
    { id: 3, title: 'Flooring Installation Standards', type: 'Guide', status: 'Published', date: '2024-01-08' },
    { id: 4, title: 'Cost Breakdown: Renovations', type: 'Article', status: 'Published', date: '2024-01-05' },
    { id: 5, title: 'Preventing Electrical Issues', type: 'Guide', status: 'Review', date: '2024-01-03' },
    { id: 6, title: 'Drywall Repair Techniques', type: 'Article', status: 'Draft', date: '2024-01-01' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Content Manager</h2>
          <p className="text-gray-600 mt-2">Manage your articles, guides, and content pages.</p>
        </div>
        <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition-colors">
          + New Content
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        {['All', 'Published', 'Draft', 'Review'].map((filter) => (
          <button
            key={filter}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              filter === 'All'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Content Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article, idx) => (
              <tr key={article.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{article.title}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{article.type}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    article.status === 'Published' ? 'bg-green-100 text-green-700' :
                    article.status === 'Draft' ? 'bg-gray-100 text-gray-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {article.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{article.date}</td>
                <td className="px-6 py-4 text-sm">
                  <button className="text-blue-600 hover:text-blue-700 font-medium">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Showing 1 to 6 of {articles.length} articles</p>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50">
            Previous
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
