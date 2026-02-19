'use client';

export default function InvoicesPage() {
  return (
    <div className="p-8 md:p-12">
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Invoices
            </h1>
            <p className="text-gray-600">
              Create and manage your client invoices.
            </p>
          </div>
          <button
            disabled
            title="Coming soon"
            className="px-6 py-2 bg-gray-300 text-white rounded-lg cursor-not-allowed opacity-50"
          >
            Create Invoice
          </button>
        </div>

        {/* Empty State */}
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <span className="text-3xl">📄</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            No invoices yet
          </h2>
          <p className="text-gray-600 mb-6">
            When you create your first invoice, it will appear here.
          </p>
          <div className="inline-flex flex-col gap-2 text-sm text-gray-600">
            <p>✓ Create professional invoices</p>
            <p>✓ Track invoice status</p>
            <p>✓ Manage payment details</p>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-slate-900 mb-2">About Invoices</h3>
          <p className="text-gray-700 text-sm">
            Invoices are formal documents you send to clients for completed work or services. 
            They include itemized costs and payment terms. Invoice creation is coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
