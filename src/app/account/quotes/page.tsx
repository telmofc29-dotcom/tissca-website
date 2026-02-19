'use client';

export default function QuotesPage() {
  return (
    <div className="p-8 md:p-12">
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Quotes
            </h1>
            <p className="text-gray-600">
              Create and manage your project quotes.
            </p>
          </div>
          <button
            disabled
            title="Coming soon"
            className="px-6 py-2 bg-gray-300 text-white rounded-lg cursor-not-allowed opacity-50"
          >
            Create Quote
          </button>
        </div>

        {/* Empty State */}
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <span className="text-3xl">📋</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            No quotes yet
          </h2>
          <p className="text-gray-600 mb-6">
            When you create your first quote, it will appear here.
          </p>
          <div className="inline-flex flex-col gap-2 text-sm text-gray-600">
            <p>✓ Create professional quotes</p>
            <p>✓ Track quote status</p>
            <p>✓ Calculate project costs</p>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-slate-900 mb-2">About Quotes</h3>
          <p className="text-gray-700 text-sm">
            Quotes are formal proposals you send to potential clients with cost estimates for work or services. 
            They help clients understand project scope and pricing before committing. Quote creation is coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
