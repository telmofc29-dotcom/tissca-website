export default function AccountPage() {
  return (
    <div className="p-8 md:p-12">
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Account Overview
          </h1>
          <p className="text-gray-600">
            Welcome to your account dashboard. Manage your invoices, quotes, and profile settings.
          </p>
        </div>

        {/* Quick Stats Cards (Empty State) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Invoices Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Total Invoices</p>
                <p className="text-3xl font-bold text-slate-900">0</p>
              </div>
              <span className="text-3xl">📄</span>
            </div>
            <p className="text-gray-500 text-xs mt-4">Create your first invoice to get started</p>
          </div>

          {/* Quotes Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Total Quotes</p>
                <p className="text-3xl font-bold text-slate-900">0</p>
              </div>
              <span className="text-3xl">📋</span>
            </div>
            <p className="text-gray-500 text-xs mt-4">Create your first quote to get started</p>
          </div>

          {/* Profile Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Profile Status</p>
                <p className="text-3xl font-bold text-slate-900">Setup</p>
              </div>
              <span className="text-3xl">👤</span>
            </div>
            <p className="text-gray-500 text-xs mt-4">Complete your profile information</p>
          </div>
        </div>

        {/* Getting Started Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Getting Started</h2>
          <p className="text-gray-700 mb-6">
            This is your account dashboard. Here you can manage all your business documents and settings.
          </p>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold mt-1">✓</span>
              <span><strong>Profile:</strong> Set up your business information and preferences</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold mt-1">✓</span>
              <span><strong>Invoices:</strong> Create and manage your client invoices</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold mt-1">✓</span>
              <span><strong>Quotes:</strong> Generate and track project quotes</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
