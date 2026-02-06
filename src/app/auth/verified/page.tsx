import { Metadata } from 'next';
import Link from 'next/link';
import { brandConfig } from '@/config/brand';

export const metadata: Metadata = {
  title: `Verified | ${brandConfig.displayName}`,
  description: 'You are verified. You can return to the app or sign in on the web.',
};

export default function VerifiedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">You’re verified</h1>
        <p className="text-gray-600 mb-6">
          You can return to the app or sign in to {brandConfig.displayName} on the web.
        </p>
        <Link
          href="/login"
          className="inline-block rounded bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
