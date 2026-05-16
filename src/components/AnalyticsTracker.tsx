'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackEvent } from '@/utils/analytics';

/**
 * AnalyticsTracker — automatic page view tracking.
 * Mount once in a layout. Fires `page_view` on every route change.
 */
export default function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    // Deduplicate — don't fire twice for the same path
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;

    // Detect locale from <html lang> or localStorage
    const locale =
      (typeof document !== 'undefined' && document.documentElement.lang) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('tissca_lang')) ||
      undefined;

    trackEvent('page_view', pathname, {
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      metadata: locale ? { locale } : undefined,
    });
  }, [pathname]);

  return null;
}
