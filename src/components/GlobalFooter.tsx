import Link from 'next/link';
import { brandConfig } from '@/config/brand';

export function GlobalFooter() {
  return (
    <footer className="bg-primary text-white mt-16 md:mt-24" role="contentinfo">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-12 md:py-16">
        {/* Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div>
            <h3 className="font-bold text-lg mb-4">{brandConfig.displayName}</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              {brandConfig.tagline}
            </p>
            <p className="text-gray-400 text-xs mt-4">{brandConfig.year} © {brandConfig.companyName}</p>
          </div>

          {/* Main Links */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide">Platform</h4>
            <nav className="space-y-2">
              {brandConfig.navigation.footer.main.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-gray-300 hover:text-white text-sm transition-colors block"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide">Resources</h4>
            <nav className="space-y-2">
              {brandConfig.navigation.footer.resources.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-gray-300 hover:text-white text-sm transition-colors block"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wide">Contact</h4>
            {brandConfig.contact.email && (
              <a
                href={`mailto:${brandConfig.contact.email}`}
                className="text-gray-300 hover:text-white text-sm transition-colors block mb-2"
              >
                {brandConfig.contact.email}
              </a>
            )}
            <p className="text-gray-400 text-xs">Got a question? We're here to help.</p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 pt-8">
          <p className="text-gray-400 text-xs text-center">
            {brandConfig.description}
          </p>
        </div>
      </div>
    </footer>
  );
}
