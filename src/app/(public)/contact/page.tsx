import { Metadata } from 'next';
import { ContentPageLayout } from '@/components/ContentPageLayout';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with TISSCA.',
};

export default function ContactPage() {
  return (
    <ContentPageLayout
      title="Contact Us"
      description="Have a question or suggestion? We'd like to hear from you."
      slug="contact"
    >
      <div className="space-y-8">
        <section>
          <h2>Get In Touch</h2>
          <p>
            Have a question about construction, a topic you'd like us to cover,
            or feedback about TISSCA? We'd like to hear from you.
          </p>
        </section>

        <section>
          <h3>Email</h3>
          <p>
            <a href="mailto:hello@tissca.com" className="text-accent hover:text-blue-700 font-semibold">
              hello@tissca.com
            </a>
          </p>
        </section>

        <section>
          <h3>Contact Form</h3>
          <p className="text-secondary">
            Contact form coming soon. You can reach us via email in the meantime.
          </p>
        </section>

        <section>
          <h3>What We're Looking For</h3>
          <ul className="list-disc list-inside space-y-2 text-secondary">
            <li>Topic suggestions for new guides</li>
            <li>Questions about construction and standards</li>
            <li>Errors or improvements to existing content</li>
            <li>Professional expertise and contributions</li>
            <li>General feedback and ideas</li>
          </ul>
        </section>
      </div>
    </ContentPageLayout>
  );
}
