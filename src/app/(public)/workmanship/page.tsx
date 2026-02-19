import { Metadata } from 'next';
import { ContentPageLayout } from '@/components/ContentPageLayout';

export const metadata: Metadata = {
  title: 'Is This Done Properly?',
  description: 'Learn to identify construction defects and evaluate workmanship quality.',
};

export default function WorkmanshipPage() {
  return (
    <ContentPageLayout
      title="Is This Done Properly?"
      description="Identify defects, compare good vs bad workmanship, understand failure causes, and know what fixes cost."
      slug="workmanship"
    >
      <div className="space-y-8">
        <section>
          <h2>Construction Quality Assessment</h2>
          <p>
            Understanding the difference between proper workmanship and shortcuts can save you thousands
            in repairs and ensure your home or building lasts decades, not years.
          </p>
          <p>
            This section covers how to identify defects, evaluate craftsmanship, and understand what
            professional standards actually look like.
          </p>
        </section>

        <section>
          <h3>What's Covered Here</h3>
          <ul className="list-disc list-inside space-y-2 text-secondary">
            <li>Common construction defects and how to spot them</li>
            <li>Good vs bad workmanship in every trade</li>
            <li>Hidden problems that appear years later</li>
            <li>Cost to fix common mistakes</li>
            <li>Professional standards and building codes</li>
            <li>Quality assurance throughout renovation</li>
          </ul>
        </section>

        <section>
          <h3>Coming Soon</h3>
          <p className="text-secondary">
            Detailed guides on brickwork, tiling, painting, plumbing, electrical, plastering,
            flooring, roofing, and every other trade.
          </p>
        </section>
      </div>
    </ContentPageLayout>
  );
}
