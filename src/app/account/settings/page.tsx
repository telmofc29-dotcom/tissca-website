export default function SettingsPage() {
  return (
    <div className="p-8 md:p-12">
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Settings
          </h1>
          <p className="text-gray-600">
            Manage your account preferences and settings.
          </p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-8">
          {/* General Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6">General Settings</h2>
            
            <div className="space-y-6">
              {/* Email Setting */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded text-gray-600"
                  placeholder="your.email@example.com"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Your email address is used for account authentication and cannot be changed here.
                </p>
              </div>

              {/* Full Name Setting */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your full name"
                />
              </div>

              {/* Company Name Setting */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your company name"
                />
              </div>
            </div>

            <button className="mt-6 px-4 py-2 bg-primary text-white rounded font-medium hover:bg-accent transition-colors">
              Save Changes
            </button>
          </div>

          {/* Billing & Subscription */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6">Billing & Subscription</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-4 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">Current Plan</p>
                  <p className="text-sm text-gray-500">Free tier - Limited features</p>
                </div>
                <button className="px-4 py-2 border border-gray-200 rounded font-medium hover:bg-gray-50 transition-colors">
                  Upgrade
                </button>
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium text-gray-900">Billing Email</p>
                  <p className="text-sm text-gray-500">Invoices will be sent to this address</p>
                </div>
                <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                  Edit
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-lg border border-red-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-red-600 mb-6">Danger Zone</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-4 border-b border-red-100">
                <div>
                  <p className="font-medium text-gray-900">Delete Account</p>
                  <p className="text-sm text-gray-500">Permanently delete your account and all associated data</p>
                </div>
                <button className="px-4 py-2 border border-red-300 text-red-600 rounded font-medium hover:bg-red-50 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
