import Link from 'next/link';

export default function PriceBookPage() {
  const categories = [
    { name: 'Painting Services', items: 4 },
    { name: 'Tiling Services', items: 3 },
    { name: 'Plastering', items: 2 },
    { name: 'Flooring', items: 3 },
    { name: 'Labour Rates', items: 6 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Link href="/docs" className="text-blue-600 hover:text-blue-700">← Back to Docs</Link>
        </div>

        <h1 className="text-4xl font-bold text-slate-900 mb-3">Price Book</h1>
        <p className="text-gray-600 mb-12">Manage your service library. Build a library of services and pricing for quick invoice generation.</p>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Service Categories</h2>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
              + Add Service
            </button>
          </div>

          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat.name} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-all cursor-pointer">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-slate-900">{cat.name}</h3>
                    <p className="text-sm text-gray-600">{cat.items} items</p>
                  </div>
                  <div className="text-right">
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      View →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-3">📚 How to Use</h3>
            <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
              <li>Create service categories</li>
              <li>Add services with standard pricing</li>
              <li>Use services when creating quotes/invoices</li>
              <li>Update prices centrally</li>
            </ol>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-3">💡 Benefits</h3>
            <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
              <li>Save time on invoice creation</li>
              <li>Consistent pricing</li>
              <li>Easy price updates</li>
              <li>Track popular services</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-amber-900 mb-3">📌 Coming Soon</h3>
          <ul className="text-sm text-amber-900 space-y-1 list-disc list-inside">
            <li>Bulk pricing updates</li>
            <li>Category import/export</li>
            <li>Price history tracking</li>
            <li>Seasonal pricing rules</li>
            <li>Integration with TISSCA calculators</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
