import { Metadata } from 'next';
import { ContentPageLayout } from '@/components/ContentPageLayout';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Quality & Workmanship — TISSCA',
  description:
    'Professional workmanship standards, defect identification, and quality assessment — the knowledge behind TISSCA quality tools.',
};

export default function WorkmanshipPage() {
  return (
    <ContentPageLayout
      title="Quality & Workmanship"
      description="Professional workmanship standards, defect identification, and quality benchmarks — the knowledge built into TISSCA's quality tools."
      slug="workmanship"
    >
      <div className="space-y-8">
        <section>
          <h2>Professional Quality Standards</h2>
          <p>
            Understanding the difference between proper workmanship and shortcuts is essential for
            any professional tradesperson. Delivering consistent quality builds your reputation,
            reduces callbacks, and justifies premium pricing.
          </p>
        </section>

        <section>
          <h3>What's Covered</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Common construction defects and how to prevent them</li>
            <li>Good vs poor workmanship in every trade</li>
            <li>Hidden problems that surface years later</li>
            <li>Cost implications of rework and callbacks</li>
            <li>Professional standards and building codes</li>
            <li>Quality assurance checklists</li>
          </ul>
        </section>

        <section>
          <h3>Quality Inside the Platform</h3>
          <p>
            TISSCA's guides and standards reference library helps you maintain consistent quality
            across every job — and gives you the language to explain quality tiers to clients.
          </p>
          <p className="mt-3">
            <Link href="/standards" className="text-[#cbb26b] hover:text-[#b89b4a] font-semibold">
              View quality standards →
            </Link>
          </p>
        </section>
      </div>
    </ContentPageLayout>
  );
}
