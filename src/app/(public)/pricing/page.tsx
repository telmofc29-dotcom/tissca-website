'use client';
import { useAuth } from '@/context/auth-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const features = {
  free: [
    'Access to all guides & calculators',
    'Save calculator results',
    'Generate up to 5 quotes/month',
    'Generate up to 5 invoices/month',
    'Save client details',
    'TISSCA watermark on documents',
    'Ads enabled',
  ],
  pro: [
    'Everything in Free, plus:',
    'Unlimited quotes & invoices',
    'Remove TISSCA watermark',
    'No ads anywhere',
    'Upload business logo',
    'Professional branded documents',
    'Full mobile app access',
    'Priority email support',
  ],
};

export default function PricingPage() {
  const { isLoggedIn, tier } = useAuth();
  const router = useRouter();

  function handleUpgrade() {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    // TODO: Redirect to Stripe checkout
    router.push('/account/billing');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-20">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-300">Choose the plan that fits your needs</p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {/* Free Tier */}
          <div className={`rounded-xl overflow-hidden transition-all ${
            tier === 'free' ? 'ring-2 ring-blue-500 scale-105' : ''
          }`}>
            <div className="bg-white p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Free</h2>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold text-slate-900">£0</span>
                  <span className="text-gray-600">/month</span>
                </div>
                {tier === 'free' && (
                  <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                    Your Current Plan
                  </span>
                )}
              </div>

              <button
                disabled={tier === 'free'}
                className={`w-full py-3 rounded-lg font-semibold mb-8 transition-all ${
                  tier === 'free'
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {tier === 'free' ? 'Current Plan' : 'Downgrade to Free'}
              </button>

              <div className="space-y-4">
                <p className="font-semibold text-slate-900 mb-4">Includes:</p>
                {features.free.map((feature, idx) => (
                  <div key={idx} className="flex gap-3">
                    <span className="text-green-600 font-bold">✓</span>
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pro Tier */}
          <div className={`rounded-xl overflow-hidden transition-all ${
            tier === 'pro' ? 'ring-2 ring-purple-500 scale-105' : ''
          }`}>
            <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-1">
              <div className="bg-white p-8 relative">
                {/* Pro Badge */}
                <div className="absolute top-0 right-0 bg-purple-600 text-white px-4 py-2 rounded-bl-lg font-semibold">
                  Popular
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Pro</h2>
                  <div className="flex gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Monthly</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-slate-900">£3</span>
                        <span className="text-gray-600">/month</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Annual</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-slate-900">£20</span>
                        <span className="text-gray-600">/year</span>
                      </div>
                      <p className="text-xs text-green-600 font-semibold mt-1">Save 33%</p>
                    </div>
                  </div>
                  {tier === 'pro' && (
                    <span className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                      Your Current Plan
                    </span>
                  )}
                </div>

                <button
                  onClick={handleUpgrade}
                  disabled={tier === 'pro'}
                  className={`w-full py-3 rounded-lg font-semibold mb-8 transition-all ${
                    tier === 'pro'
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {tier === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
                </button>

                <div className="space-y-4">
                  <p className="font-semibold text-slate-900 mb-4">Includes:</p>
                  {features.pro.map((feature, idx) => (
                    <div key={idx} className="flex gap-3">
                      <span className="text-purple-600 font-bold">✓</span>
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto mt-20">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">Frequently Asked Questions</h2>

          <div className="space-y-6">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-20">
              <h3 className="text-lg font-semibold text-white mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-300">Yes, you can cancel your Pro subscription at any time. No questions asked.</p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-20">
              <h3 className="text-lg font-semibold text-white mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-300">We accept all major credit cards (Visa, Mastercard, American Express) via Stripe.</p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-20">
              <h3 className="text-lg font-semibold text-white mb-2">Is there a free trial?</h3>
              <p className="text-gray-300">The free tier gives you everything you need to get started. Upgrade anytime when you're ready for more.</p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 border border-white border-opacity-20">
              <h3 className="text-lg font-semibold text-white mb-2">Can I switch between monthly and annual?</h3>
              <p className="text-gray-300">Yes, you can change your plan in your billing settings at any time.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-20">
          {!isLoggedIn ? (
            <p className="text-gray-300 mb-6">Ready to get started?</p>
          ) : (
            <p className="text-gray-300 mb-6">Already have an account?</p>
          )}
          <Link
            href={isLoggedIn ? '/account' : '/register'}
            className="inline-block px-8 py-3 bg-white text-slate-900 rounded-lg font-semibold hover:bg-gray-100 transition-all"
          >
            {isLoggedIn ? 'Go to Dashboard' : 'Sign Up Free'}
          </Link>
        </div>
      </div>
    </div>
  );
}
