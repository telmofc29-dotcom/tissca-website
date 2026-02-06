/**
 * privacy/page.tsx v1.1.0 (Real Privacy Policy + Versioned Legal)
 * ================================================================
 * ✅ NOTES (LOCKED):
 * - Use ContentPageLayout (site-standard legal/content wrapper).
 * - Keep this page self-contained and brand-driven where appropriate.
 * - Add “Last updated” + “Version” (policy stability + change tracking).
 * - British English wording.
 *
 * WHY v1.1.0:
 * - Replace placeholder with a real, publishable privacy policy suitable for launch.
 * - Include clear contact + deletion request wording (matches app/store expectations).
 * - Keep policy readable (plain English) and legally safer than a placeholder.
 *
 * VERSION HISTORY:
 * - v1.0.0: Placeholder policy page (as provided)
 * - v1.1.0 (2026-02-04): Real policy content + versioning + support contact
 */

import { Metadata } from 'next';
import { ContentPageLayout } from '@/components/ContentPageLayout';
import { brandConfig } from '@/config/brand';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `${brandConfig.displayName} Privacy Policy.`,
};

export default function PrivacyPage() {
  const lastUpdated = '4 February 2026';
  const policyVersion = '1.1';

  return (
    <ContentPageLayout
      title="Privacy Policy"
      description="How we handle your data and privacy."
      slug="privacy"
    >
      <div className="space-y-10">
        {/* Policy header meta */}
        <section className="space-y-2">
          <p className="text-sm text-secondary">
            <span className="font-semibold text-primary">Last updated:</span> {lastUpdated}
            <span className="mx-2">•</span>
            <span className="font-semibold text-primary">Version:</span> {policyVersion}
          </p>
          <p className="text-secondary">
            This Privacy Policy explains how {brandConfig.companyName} (“we”, “us”, “our”)
            collects, uses, shares, and protects your personal data when you use our website and
            services (the “Services”).
          </p>
        </section>

        {/* Who we are */}
        <section className="space-y-3">
          <h2>1. Who we are</h2>
          <p className="text-secondary">
            For the purposes of data protection laws, {brandConfig.companyName} is the “data
            controller” of the personal data described in this policy.
          </p>
          <p className="text-secondary">
            If you have any questions, contact us at{' '}
            <a
              className="text-primary underline underline-offset-4"
              href={`mailto:${brandConfig.contact.supportEmail || brandConfig.contact.email}`}
            >
              {brandConfig.contact.supportEmail || brandConfig.contact.email}
            </a>
            .
          </p>
        </section>

        {/* What we collect */}
        <section className="space-y-3">
          <h2>2. What information we collect</h2>
          <p className="text-secondary">We may collect the following categories of personal data:</p>
          <ul className="list-disc list-inside space-y-2 text-secondary">
            <li>
              <span className="font-semibold text-primary">Account information:</span> email
              address, name (if provided), and account identifiers.
            </li>
            <li>
              <span className="font-semibold text-primary">Usage information:</span> pages viewed,
              features used, device/browser information, approximate location (derived from IP), and
              diagnostics.
            </li>
            <li>
              <span className="font-semibold text-primary">Support communications:</span> messages
              you send to us and any information you choose to include.
            </li>
            <li>
              <span className="font-semibold text-primary">Billing information (if applicable):</span>{' '}
              subscription status and payment-related references handled by our payment provider
              (we do not store full card details).
            </li>
          </ul>
          <p className="text-secondary">
            We do not intentionally collect special category data (such as health, religion, or
            political opinions). Please do not provide it to us.
          </p>
        </section>

        {/* How we use it */}
        <section className="space-y-3">
          <h2>3. How we use your information</h2>
          <p className="text-secondary">We use your information to:</p>
          <ul className="list-disc list-inside space-y-2 text-secondary">
            <li>Provide and operate the Services (including authentication and account access).</li>
            <li>Maintain security, prevent fraud, and protect users and our platform.</li>
            <li>Improve features, performance, and user experience.</li>
            <li>Respond to support requests and communicate important service updates.</li>
            <li>Process subscriptions (where enabled) and manage access tiers.</li>
            <li>Comply with legal obligations and enforce our Terms.</li>
          </ul>
        </section>

        {/* Lawful basis */}
        <section className="space-y-3">
          <h2>4. Lawful bases for processing (UK GDPR / GDPR)</h2>
          <p className="text-secondary">
            Where UK GDPR / GDPR applies, we process personal data on the following lawful bases:
          </p>
          <ul className="list-disc list-inside space-y-2 text-secondary">
            <li>
              <span className="font-semibold text-primary">Contract:</span> to provide the Services
              you request.
            </li>
            <li>
              <span className="font-semibold text-primary">Legitimate interests:</span> to operate,
              secure, and improve our Services (balanced against your rights).
            </li>
            <li>
              <span className="font-semibold text-primary">Legal obligation:</span> to meet legal
              requirements.
            </li>
            <li>
              <span className="font-semibold text-primary">Consent:</span> where we ask (for example
              certain cookies/marketing, if used).
            </li>
          </ul>
        </section>

        {/* Sharing */}
        <section className="space-y-3">
          <h2>5. Sharing your information</h2>
          <p className="text-secondary">
            We may share information with trusted service providers who help us operate the
            Services, for example:
          </p>
          <ul className="list-disc list-inside space-y-2 text-secondary">
            <li>Authentication and database providers (to store accounts and app data).</li>
            <li>Hosting and analytics providers (to run and measure the website).</li>
            <li>Payment processors (to handle subscriptions and payments).</li>
            <li>Customer support tools (to manage support requests).</li>
          </ul>
          <p className="text-secondary">
            We do not sell your personal data. We may disclose information if required by law, to
            protect rights and safety, or in connection with a business transfer (e.g. merger or
            acquisition).
          </p>
        </section>

        {/* International transfers */}
        <section className="space-y-3">
          <h2>6. International transfers</h2>
          <p className="text-secondary">
            Some of our providers may process data outside the UK/EEA. Where this happens, we take
            steps designed to ensure appropriate safeguards are in place (such as contractual
            protections).
          </p>
        </section>

        {/* Retention */}
        <section className="space-y-3">
          <h2>7. Data retention</h2>
          <p className="text-secondary">
            We keep personal data only for as long as necessary to provide the Services, comply with
            legal obligations, resolve disputes, and enforce our agreements. Retention periods
            depend on the type of data and why we hold it.
          </p>
        </section>

        {/* Security */}
        <section className="space-y-3">
          <h2>8. Security</h2>
          <p className="text-secondary">
            We use reasonable administrative, technical, and organisational measures to help
            protect personal data. However, no method of transmission or storage is completely
            secure, and we cannot guarantee absolute security.
          </p>
        </section>

        {/* Cookies */}
        <section className="space-y-3">
          <h2>9. Cookies and similar technologies</h2>
          <p className="text-secondary">
            We may use cookies or similar technologies to make the site work, remember preferences,
            and understand how the Services are used. You can control cookies through your browser
            settings. Where required, we will present cookie choices.
          </p>
        </section>

        {/* Children */}
        <section className="space-y-3">
          <h2>10. Children</h2>
          <p className="text-secondary">
            Our Services are not intended for children under 16. We do not knowingly collect
            personal data from children under 16.
          </p>
        </section>

        {/* Rights */}
        <section className="space-y-3">
          <h2>11. Your rights</h2>
          <p className="text-secondary">
            Depending on your location, you may have rights including: access, correction, deletion,
            restriction, objection, and portability. You may also have the right to withdraw consent
            (where processing is based on consent).
          </p>
          <p className="text-secondary">
            To exercise your rights, contact us at{' '}
            <a
              className="text-primary underline underline-offset-4"
              href={`mailto:${brandConfig.contact.supportEmail || brandConfig.contact.email}`}
            >
              {brandConfig.contact.supportEmail || brandConfig.contact.email}
            </a>
            .
          </p>
        </section>

        {/* Account deletion */}
        <section className="space-y-3">
          <h2>12. Account deletion</h2>
          <p className="text-secondary">
            You can request account deletion by contacting{' '}
            <a
              className="text-primary underline underline-offset-4"
              href={`mailto:${brandConfig.contact.supportEmail || brandConfig.contact.email}`}
            >
              {brandConfig.contact.supportEmail || brandConfig.contact.email}
            </a>
            . We may need to verify your identity before processing the request.
          </p>
        </section>

        {/* Changes */}
        <section className="space-y-3">
          <h2>13. Changes to this policy</h2>
          <p className="text-secondary">
            We may update this policy from time to time. We will change the “Last updated” date at
            the top of this page when we do. Material changes may be communicated through the
            Services.
          </p>
          <p className="text-sm text-secondary">
            <span className="font-semibold text-primary">Version history:</span> v1.0 (placeholder)
            → v1.1 (publishable policy + support contact + deletion wording).
          </p>
        </section>
      </div>
    </ContentPageLayout>
  );
}
