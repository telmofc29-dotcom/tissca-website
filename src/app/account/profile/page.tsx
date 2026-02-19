'use client';

export default function ProfilePage() {
  return (
    <div className="p-8 md:p-12">
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Profile
          </h1>
          <p className="text-gray-600">
            Manage your business information and preferences.
          </p>
        </div>

        {/* Empty State */}
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <span className="text-3xl">👤</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Profile Setup Coming Soon
          </h2>
          <p className="text-gray-600 mb-6">
            Profile management and customization features are being prepared.
          </p>
          <div className="inline-flex flex-col gap-2 text-sm text-gray-600">
            <p>✓ Business information</p>
            <p>✓ Contact details</p>
            <p>✓ Account preferences</p>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-bold text-slate-900 mb-2">Business Information</h3>
            <p className="text-gray-700 text-sm">
              Add your business name, address, phone number, and email for use in documents.
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-bold text-slate-900 mb-2">Preferences</h3>
            <p className="text-gray-700 text-sm">
              Set your default settings for currency, units, VAT rates, and document numbering.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
