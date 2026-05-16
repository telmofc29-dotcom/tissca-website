/**
 * TisscaAuthHeader — Branded header for all auth pages
 * =====================================================
 *
 * PURPOSE:
 *   Provides a consistent TISSCA-branded visual anchor at the top of
 *   every authentication page (sign-in, sign-up, forgot-password, reset).
 *   Contains the TISSCA shield icon + wordmark + subtitle.
 *
 * BUSINESS RULE:
 *   Every auth touchpoint must reinforce the TISSCA brand. Users coming
 *   from emails, deep links, or direct navigation should immediately
 *   recognise they are on an official TISSCA page.
 *
 * WHY:
 *   The auth pages previously had no logo/shield, making them look
 *   generic. This component adds a premium TISSCA identity block that
 *   is consistent across all auth routes.
 *
 * DO NOT:
 *   - Add external image dependencies (the shield is an inline SVG)
 *   - Change the visual hierarchy (shield → wordmark → subtitle)
 *   - Import brand.ts here — keep it zero-dependency for fast load
 */

interface TisscaAuthHeaderProps {
  /** Page title shown below the wordmark, e.g. "Sign in" */
  title: string;
  /** Optional subtitle shown below the title */
  subtitle?: string;
}

export function TisscaAuthHeader({ title, subtitle }: TisscaAuthHeaderProps) {
  return (
    <div className="text-center mb-8">
      {/* Wordmark */}
      <p className="text-[11px] font-bold tracking-[3.5px] uppercase text-primary/40 mb-3">
        TISSCA
      </p>

      {/* Page title */}
      <h1 className="text-3xl font-bold text-primary mb-2">{title}</h1>

      {/* Subtitle */}
      {subtitle && <p className="text-secondary">{subtitle}</p>}
    </div>
  );
}
