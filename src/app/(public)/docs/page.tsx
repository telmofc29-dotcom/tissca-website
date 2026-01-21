import Link from 'next/link';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">Documents & Invoicing</h1>
          <p className="text-xl text-slate-300">Generate professional quotes and invoices in seconds</p>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <Link href="/docs/quote" className="group bg-white rounded-lg border border-gray-200 p-8 hover:shadow-2xl hover:border-blue-400 transition-all">
            <div className="text-5xl mb-4">📄</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-blue-600">Generate Quote</h2>
            <p className="text-gray-600 text-sm mb-6">Create professional quotes with automatic numbering and calculations.</p>
            <div className="text-blue-600 font-semibold group-hover:text-blue-700">Get Started →</div>
          </Link>

          <Link href="/docs/invoice" className="group bg-white rounded-lg border border-gray-200 p-8 hover:shadow-2xl hover:border-green-400 transition-all">
            <div className="text-5xl mb-4">💰</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-green-600">Generate Invoice</h2>
            <p className="text-gray-600 text-sm mb-6">Send professional invoices with payment terms and due dates.</p>
            <div className="text-green-600 font-semibold group-hover:text-green-700">Get Started →</div>
          </Link>
        </div>

        {/* Resources */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <Link href="/docs/templates" className="group bg-slate-700 hover:bg-slate-600 rounded-lg p-6 transition-all border border-slate-600">
            <div className="text-3xl mb-3">🎨</div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-300">Templates</h3>
            <p className="text-slate-300 text-sm">Choose or customize document templates to match your brand.</p>
          </Link>

          <Link href="/docs/price-book" className="group bg-slate-700 hover:bg-slate-600 rounded-lg p-6 transition-all border border-slate-600">
            <div className="text-3xl mb-3">📚</div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-green-300">Price Book</h3>
            <p className="text-slate-300 text-sm">Manage your service library and pricing for quick invoice creation.</p>
          </Link>
        </div>

        {/* Features Section */}
        <div className="bg-slate-700 rounded-lg border border-slate-600 p-8 mb-16">
          <h2 className="text-2xl font-bold text-white mb-8">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-3">🔢</div>
              <h3 className="font-semibold text-white mb-2">Auto Numbering</h3>
              <p className="text-slate-300 text-sm">Sequential numbering: Q-000001, INV-000001</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="font-semibold text-white mb-2">Real-Time Calcs</h3>
              <p className="text-slate-300 text-sm">Instant subtotal, VAT, and total calculations</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">📋</div>
              <h3 className="font-semibold text-white mb-2">Line Items</h3>
              <p className="text-slate-300 text-sm">Flexible line-by-line pricing and descriptions</p>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-3">📥</div>
              <h3 className="font-semibold text-white mb-2">PDF Download</h3>
              <p className="text-slate-300 text-sm">Export and share professional documents</p>
            </div>
          </div>
        </div>

        {/* Account & Admin Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <Link href="/account/profile" className="group bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 p-6 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">👤 Your Profile</h3>
              <div className="text-slate-400 group-hover:text-white">→</div>
            </div>
            <p className="text-slate-300 text-sm">Edit business information and contact details that appear on documents.</p>
          </Link>

          <Link href="/admin/docs" className="group bg-slate-700 hover:bg-slate-600 rounded-lg border border-slate-600 p-6 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">⚙️ Admin</h3>
              <div className="text-slate-400 group-hover:text-white">→</div>
            </div>
            <p className="text-slate-300 text-sm">Manage templates, defaults, and pricing library for documents.</p>
          </Link>
        </div>

        {/* Roadmap Section */}
        <div className="bg-blue-900 border border-blue-800 rounded-lg p-8 mb-16">
          <h2 className="text-2xl font-bold text-white mb-8">🗺️ Upcoming Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-800 bg-opacity-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-100 mb-2">📧 Email & Payments</h4>
              <p className="text-blue-200 text-sm">Send quotes/invoices directly via email with payment links.</p>
            </div>
            <div className="bg-blue-800 bg-opacity-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-100 mb-2">📱 Client Portal</h4>
              <p className="text-blue-200 text-sm">Share documents with clients for viewing and approval.</p>
            </div>
            <div className="bg-blue-800 bg-opacity-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-100 mb-2">💳 Payment Processing</h4>
              <p className="text-blue-200 text-sm">Accept payments directly from invoices (Stripe integration).</p>
            </div>
            <div className="bg-blue-800 bg-opacity-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-100 mb-2">📊 Analytics</h4>
              <p className="text-blue-200 text-sm">Track quotes, invoices, revenue, and customer insights.</p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-6">Quick Links</h3>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/calculators" className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all">
              Back to Calculators
            </Link>
            <Link href="/account/settings" className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all">
              Settings
            </Link>
            <Link href="/admin/pricing" className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all">
              Pricing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
