'use client';

import Link from 'next/link';
import { brandConfig } from '@/config/brand';
import { useLanguage } from '@/i18n';

export function GlobalFooter() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-white/[0.06] bg-[#070b0f] text-white" role="contentinfo">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-12 md:py-16">
        {/* Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-[#cbb26b]">{brandConfig.displayName}</h3>
            <p className="text-white/40 text-sm leading-relaxed">
              {brandConfig.tagline}
            </p>
            <p className="text-white/25 text-xs mt-4">{brandConfig.year} © {brandConfig.companyName}</p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide text-white/60">{t.footer.product}</h4>
            <nav className="space-y-2">
              {brandConfig.navigation.footer.product.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-white/40 hover:text-white text-sm transition-colors block no-underline hover:no-underline"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/sign-in"
                className="text-white/40 hover:text-white text-sm transition-colors block no-underline hover:no-underline"
              >
                {t.footer.login}
              </Link>
              <Link
                href="/app/overview"
                className="text-white/40 hover:text-white text-sm transition-colors block no-underline hover:no-underline"
              >
                {t.footer.openApp}
              </Link>
            </nav>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide text-white/60">{t.footer.resources}</h4>
            <nav className="space-y-2">
              {brandConfig.navigation.footer.resources.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-white/40 hover:text-white text-sm transition-colors block no-underline hover:no-underline"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide text-white/60">{t.footer.company}</h4>
            <nav className="space-y-2">
              {brandConfig.navigation.footer.main.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-white/40 hover:text-white text-sm transition-colors block no-underline hover:no-underline"
                >
                  {item.label}
                </Link>
              ))}
              {brandConfig.contact.email && (
                <a
                  href={`mailto:${brandConfig.contact.email}`}
                  className="text-white/40 hover:text-white text-sm transition-colors block no-underline hover:no-underline"
                >
                  {brandConfig.contact.email}
                </a>
              )}
            </nav>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/[0.06] pt-8">
          <p className="text-white/25 text-xs text-center">
            {brandConfig.description}
          </p>
        </div>
      </div>
    </footer>
  );
}
