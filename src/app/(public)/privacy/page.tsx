import { Metadata } from 'next';
import { ContentPageLayout } from '@/components/ContentPageLayout';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'BUILDR Privacy Policy.',
};

export default function PrivacyPage() {
  return (
    <ContentPageLayout
      title="Privacy Policy"
      description="How we handle your data and privacy."
      slug="privacy"
    >
      <div className="space-y-8">
        <section>
          <h2>Privacy Policy</h2>
          <p>
            This is a placeholder for the comprehensive privacy policy.
            It will detail how we collect, use, and protect user information in compliance
            with GDPR, CCPA, and other privacy regulations.
          </p>
        </section>

        <section>
          <h3>Key Topics</h3>
          <ul className="list-disc list-inside space-y-2 text-secondary">
            <li>Information collection and use</li>
            <li>User rights and data access</li>
            <li>Data security and protection</li>
            <li>Third-party sharing policies</li>
            <li>Cookie usage and tracking</li>
            <li>Contact and dispute resolution</li>
          </ul>
        </section>
      </div>
    </ContentPageLayout>
  );
}
