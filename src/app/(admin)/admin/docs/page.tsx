import Link from 'next/link';

export default function AdminDocsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Link href="/admin/pricing" className="text-blue-600 hover:text-blue-700">← Back to Admin</Link>
        </div>

        <h1 className="text-4xl font-bold text-slate-900 mb-3">Document Management</h1>
        <p className="text-gray-600 mb-12">Manage templates, default terms, and pricing libraries for documents.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">📋 Templates</h3>
            <p className="text-gray-600 text-sm mb-4">Configure professional document templates with your branding.</p>
            <div className="space-y-2 text-sm text-gray-700 mb-4">
              <p>• Professional Clean (default)</p>
              <p>• Construction Bold</p>
              <p>• Modern Minimal</p>
              <p>• Premium Gold</p>
            </div>
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
              Manage Templates
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">📝 Default Terms</h3>
            <p className="text-gray-600 text-sm mb-4">Set default payment and contract terms for all documents.</p>
            <textarea
              defaultValue="Payment due within 30 days of invoice date."
              className="w-full h-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              readOnly
            />
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all mt-3">
              Edit Terms
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">💰 Pricing Library</h3>
            <p className="text-gray-600 text-sm mb-4">Manage service pricing for quick quote generation.</p>
            <div className="space-y-2 text-sm text-gray-700 mb-4">
              <p className="font-semibold">Services: 15</p>
              <p className="font-semibold">Last Updated: Today</p>
            </div>
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
              Manage Pricing
            </button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">🔧 Integration Settings</h3>
            <p className="text-gray-600 text-sm mb-4">Configure how quotes are generated from calculators.</p>
            <div className="space-y-2 text-sm text-gray-700 mb-4">
              <p>✓ Auto-populate from calculator results</p>
              <p>✓ Show "Generate Quote" buttons</p>
            </div>
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
              View Settings
            </button>
          </div>
        </div>

        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">📊 Document Analytics</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600">Quotes Created</p>
              <p className="text-2xl font-bold text-blue-600">12</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600">Invoices Created</p>
              <p className="text-2xl font-bold text-green-600">8</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-slate-900">£24,500</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600">Avg Document</p>
              <p className="text-2xl font-bold text-slate-900">£1,225</p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-amber-900 mb-3">⚠️ System Notes</h3>
          <ul className="text-sm text-amber-900 space-y-2 list-disc list-inside">
            <li>Templates are stored per-workspace (multi-team support coming)</li>
            <li>Default terms apply to new documents only</li>
            <li>Pricing library integrates with calculator results</li>
            <li>Document history is immutable (audit trail)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
