import Link from 'next/link';

export default function AccountantPage() {
  const summaries = [
    { label: 'Invoices Total (MTD)', value: '£12,480.00' },
    { label: 'Invoices Paid (MTD)', value: '£8,920.00' },
    { label: 'Outstanding Balance', value: '£3,560.00' },
    { label: 'Open Invoices', value: '14' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <Link href="/(admin)/admin" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
            ← Admin Dashboard
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Accountant Console</h1>
            <p className="text-gray-600">Read-only platform finance summary</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {summaries.map((item) => (
            <div key={item.label} className="bg-white rounded-lg border border-gray-200 p-6">
              <p className="text-gray-600 text-sm mb-1">{item.label}</p>
              <p className="text-2xl font-bold text-slate-900">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Read-only Placeholder</h2>
          <p className="text-gray-600">
            This console is intentionally read-only for now. Live accounting queries can be wired later without changing
            route or access policy.
          </p>
        </div>
      </div>
    </div>
  );
}
