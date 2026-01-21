import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found',
};

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
        <p className="text-secondary mb-8">
          The page you're looking for doesn't exist. Let's get you back on track.
        </p>
        <div className="flex flex-col gap-4">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-accent hover:bg-blue-600 text-white font-semibold rounded transition-colors"
          >
            Go to Home
          </Link>
          <Link
            href="/calculators"
            className="inline-block px-6 py-3 border border-accent text-accent hover:bg-light rounded transition-colors"
          >
            Browse Calculators
          </Link>
        </div>
      </div>
    </div>
  );
}
