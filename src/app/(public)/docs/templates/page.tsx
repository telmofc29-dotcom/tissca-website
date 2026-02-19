import Link from 'next/link';

export default function TemplatesPage() {
  const templates = [
    { id: 1, name: 'Professional Clean', description: 'Minimalist design, corporate feel. Perfect for corporate clients.', color: 'blue' },
    { id: 2, name: 'Construction Bold', description: 'Strong typography, high-contrast. Built for tradespeople.', color: 'slate' },
    { id: 3, name: 'Modern Minimal', description: 'Simple, elegant layout. Contemporary aesthetic.', color: 'gray' },
    { id: 4, name: 'Premium Gold', description: 'Luxury design with accent colours. High-end feel.', color: 'amber' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Link href="/docs" className="text-blue-600 hover:text-blue-700">← Back to Docs</Link>
        </div>

        <h1 className="text-4xl font-bold text-slate-900 mb-3">Document Templates</h1>
        <p className="text-gray-600 mb-12">Choose a template style. Customize colours and fonts to match your brand.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-400 hover:shadow-lg transition-all">
              <div className={`w-full h-32 bg-${template.color}-50 rounded-lg mb-4 border border-${template.color}-200`}></div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{template.name}</h3>
              <p className="text-gray-600 text-sm mb-6">{template.description}</p>
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
                Use Template
              </button>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-8">
          <h3 className="text-lg font-bold text-slate-900 mb-3">Template Management</h3>
          <p className="text-gray-600 mb-4">Templates allow you to customize the appearance of your quotes and invoices.</p>
          <p className="text-sm text-gray-600 mb-4">Features coming soon:</p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Custom colours and fonts</li>
            <li>Logo upload</li>
            <li>Save custom templates</li>
            <li>Multiple templates per workspace</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
