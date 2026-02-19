/**
 * terms/page.tsx v1.1.0 (Real Terms + Versioned Legal)
 * =====================================================
 * ✅ NOTES (LOCKED):
 * - Use ContentPageLayout (site-standard legal/content wrapper).
 * - Keep changes minimal: replace placeholder with publishable terms.
 * - Add “Last updated” + “Version” + short version history.
 * - British English wording.
 *
 * WHY v1.1.0:
 * - Replace placeholder with real terms suitable for launch.
 * - Provide clear disclaimers (information-only), account rules, acceptable use.
 * - Include account deletion wording (request-based for now, feature later).
 * - Governing law clause is included but kept light (Step 6 can refine later).
 *
 * VERSION HISTORY:
 * - v1.0.0: Placeholder terms page (as provided)
 * - v1.1.0 (2026-02-04): Real terms content + versioning + support contact + deletion wording
 */

import { Metadata } from 'next';
import { ContentPageLayout } from '@/components/ContentPageLayout';
import { brandConfig } from '@/config/brand';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `${brandConfig.displayName} Terms of Service.`,
};

export default function TermsPage() {
  const lastUpdated = '4 February 2026';
  const termsVersion = '1.1';

  return (
    <ContentPageLayout
      title="Terms of Service"
      description="Our terms and conditions for using TISSCA."
      slug="terms"
    >
      <div className="space-y-10">
        {/* Terms header meta */}
        <section className="space-y-2">
          <p className="text-sm text-secondary">
            <span className="font-semibold text-primary">Last updated:</span> {lastUpdated}
            <span className="mx-2">•</span>
            <span className="font-semibold text-primary">Version:</span> {termsVersion}
          </p>
          <p className="text-secondary">
            These Terms of Service (“Terms”) govern your access to and use of the {brandConfig.displayName}{' '}
            website, mobile applications, and related services (together, the “Services”). By using the
            Services, you agree to these Terms.
          </p>
        </section>

        {/* About the service */}
        <section className="space-y-3">
          <h2>1. About {brandConfig.displayName}</h2>
          <p className="text-secondary">
            {brandConfig.displayName} provides educational content, guidance, calculators, and tools intended
            to help users make more informed decisions related to construction, renovation, and workmanship
            standards. The Services are provided on an “as is” and “as available” basis.
          </p>
        </section>

        {/* Eligibility */}
        <section className="space-y-3">
          <h2>2. Eligibility</h2>
          <p className="text-secondary">
            You must be at least 16 years old to use the Services. If you are using the Services on behalf
            of a company or organisation, you confirm that you have authority to bind that entity to these
            Terms.
          </p>
        </section>

        {/* Accounts */}
        <section className="space-y-3">
          <h2>3. Accounts and security</h2>
          <ul className="list-disc list-inside space-y-2 text-secondary">
            <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
            <li>You agree to provide accurate information and keep it up to date.</li>
            <li>You must notify us promptly if you believe your account has been compromised.</li>
          </ul>
        </section>

        {/* Acceptable use */}
        <section className="space-y-3">
          <h2>4. Acceptable use</h2>
          <p className="text-secondary">You agree not to:</p>
          <ul className="list-disc list-inside space-y-2 text-secondary">
            <li>Use the Services for unlawful, harmful, or fraudulent purposes.</li>
            <li>Attempt to gain unauthorised access to systems, accounts, or data.</li>
            <li>Interfere with or disrupt the Services, including via automated abuse.</li>
            <li>Upload malware or content designed to compromise security.</li>
            <li>Misrepresent your identity or affiliation.</li>
          </ul>
        </section>

        {/* Content / IP */}
        <section className="space-y-3">
          <h2>5. Content and intellectual property</h2>
          <p className="text-secondary">
            The Services and all associated content (including text, designs, branding, and software) are
            owned by {brandConfig.companyName} or its licensors and are protected by intellectual property
            laws. You may use the Services for your personal or internal business use, but you may not copy,
            reproduce, distribute, or create derivative works from the Services without permission, except
            where permitted by law.
          </p>
        </section>

        {/* User content */}
        <section className="space-y-3">
          <h2>6. User content</h2>
          <p className="text-secondary">
            If you submit content to the Services (for example, feedback, notes, or uploaded information),
            you grant us a non-exclusive licence to use it to operate and improve the Services. You confirm
            you have the rights to submit that content and that it does not violate any law or third-party
            rights.
          </p>
        </section>

        {/* Subscriptions */}
        <section className="space-y-3">
          <h2>7. Subscriptions and payments</h2>
          <p className="text-secondary">
            Some features may require a paid subscription. Pricing and included features may be described on
            our pricing pages and may change over time. Payment processing is handled by third-party payment
            providers. We do not store your full payment card details.
          </p>
        </section>

        {/* Disclaimers */}
        <section className="space-y-3">
          <h2>8. Disclaimers</h2>
          <ul className="list-disc list-inside space-y-2 text-secondary">
            <li>
              The Services provide general information and tools and do not constitute professional advice.
              You should seek appropriate professional advice for your specific situation.
            </li>
            <li>
              Calculations and estimates are indicative only and may vary based on location, materials,
              labour rates, project scope, and other factors.
            </li>
            <li>
              We do not guarantee that the Services will be error-free, uninterrupted, or always available.
            </li>
          </ul>
        </section>

        {/* Limitation of liability */}
        <section className="space-y-3">
          <h2>9. Limitation of liability</h2>
          <p className="text-secondary">
            To the maximum extent permitted by law, {brandConfig.companyName} will not be liable for any
            indirect, incidental, special, consequential, or punitive damages, or any loss of profits,
            revenue, data, or goodwill, arising out of or related to your use of the Services.
          </p>
          <p className="text-secondary">
            Nothing in these Terms limits any liability that cannot be excluded or limited by law.
          </p>
        </section>

        {/* Termination */}
        <section className="space-y-3">
          <h2>10. Suspension and termination</h2>
          <p className="text-secondary">
            We may suspend or terminate access to the Services if you violate these Terms or if required to
            protect the Services, users, or comply with law. You may stop using the Services at any time.
          </p>
        </section>

        {/* Account deletion */}
        <section className="space-y-3">
          <h2>11. Account deletion</h2>
          <p className="text-secondary">
            You can request deletion of your account by contacting{' '}
            <a
              className="text-primary underline underline-offset-4"
              href={`mailto:${brandConfig.contact.supportEmail || brandConfig.contact.email}`}
            >
              {brandConfig.contact.supportEmail || brandConfig.contact.email}
            </a>
            . We may need to verify your identity before processing the request.
          </p>
        </section>

        {/* Governing law */}
        <section className="space-y-3">
          <h2>12. Governing law</h2>
          <p className="text-secondary">
            These Terms are governed by the laws of England and Wales. If you are a consumer, you may also
            benefit from mandatory protections under the laws of your country of residence.
          </p>
        </section>

        {/* Changes */}
        <section className="space-y-3">
          <h2>13. Changes to these Terms</h2>
          <p className="text-secondary">
            We may update these Terms from time to time. We will update the “Last updated” date at the top
            of this page when we do. Material changes may be communicated through the Services.
          </p>
          <p className="text-sm text-secondary">
            <span className="font-semibold text-primary">Version history:</span> v1.0 (placeholder) → v1.1
            (publishable terms + support contact + deletion wording).
          </p>
        </section>

        {/* Contact */}
        <section className="space-y-3">
          <h2>14. Contact</h2>
          <p className="text-secondary">
            Questions about these Terms can be sent to{' '}
            <a
              className="text-primary underline underline-offset-4"
              href={`mailto:${brandConfig.contact.supportEmail || brandConfig.contact.email}`}
            >
              {brandConfig.contact.supportEmail || brandConfig.contact.email}
            </a>
            .
          </p>
        </section>
      </div>
    </ContentPageLayout>
  );
}
