import { Metadata } from 'next';
import { ContentPageLayout } from '@/components/ContentPageLayout';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'BUILDR Terms of Service.',
};

export default function TermsPage() {
  return (
    <ContentPageLayout
      title="Terms of Service"
      description="Our terms and conditions for using BUILDR."
      slug="terms"
    >
      <div className="space-y-8">
        <section>
          <h2>Terms of Service</h2>
          <p>
            This is a placeholder for the comprehensive terms of service.
            It will detail the rules for using BUILDR, user responsibilities, disclaimers,
            and limitation of liability.
          </p>
        </section>

        <section>
          <h3>Key Topics</h3>
          <ul className="list-disc list-inside space-y-2 text-secondary">
            <li>User responsibilities and conduct</li>
            <li>Content licensing and attribution</li>
            <li>Disclaimer of warranties</li>
            <li>Limitation of liability</li>
            <li>Termination of service</li>
            <li>Dispute resolution</li>
          </ul>
        </section>
      </div>
    </ContentPageLayout>
  );
}
