import Link from 'next/link';
import { brandConfig } from '@/config/brand';
import { AuthNav } from './AuthNav';

export function GlobalHeader() {
  return (
    <header
      className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm"
      role="banner"
    >
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        {/* Logo / Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg text-primary hover:text-accent transition-colors"
          aria-label={brandConfig.displayName}
        >
          <span>{brandConfig.displayName}</span>
        </Link>

        {/* Main Navigation */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
          {brandConfig.navigation.main.slice(1, 5).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-secondary hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Auth Navigation - Right side */}
        <div className="flex items-center gap-4">
          <AuthNav />
          
          {/* Mobile Menu Toggle (placeholder) */}
          <button
            className="md:hidden text-primary hover:text-accent transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded="false"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M3 12h18M3 6h18M3 18h18" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
