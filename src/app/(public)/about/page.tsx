import { Metadata } from 'next';
import { ContentPageLayout } from '@/components/ContentPageLayout';

export const metadata: Metadata = {
  title: 'About',
  description: 'About TISSCA - the construction authority platform.',
};

export default function AboutPage() {
  return (
    <ContentPageLayout
      title="About TISSCA"
      description="Our mission to educate and empower the construction industry."
      slug="about"
    >
      <div className="space-y-8">
        <section>
          <h2>Our Mission</h2>
          <p>
            TISSCA is dedicated to becoming the global reference for construction authority.
            We believe that quality construction education, honest standards, and truthful information
            can transform the industry and protect homeowners from costly mistakes.
          </p>
        </section>

        <section>
          <h3>Our Philosophy</h3>
          <ul className="list-disc list-inside space-y-2 text-secondary">
            <li>Education first - teach rather than sell</li>
            <li>Truth and standards over shortcuts</li>
            <li>Accessible to all skill levels</li>
            <li>Professional, calm authority</li>
            <li>Built to scale for decades</li>
          </ul>
        </section>

        <section>
          <h3>Who We're For</h3>
          <p>
            Homeowners planning renovations, people checking workmanship, those verifying costs,
            tradespeople, apprentices, and construction students. Anyone who wants to understand
            construction properly.
          </p>
        </section>
      </div>
    </ContentPageLayout>
  );
}
