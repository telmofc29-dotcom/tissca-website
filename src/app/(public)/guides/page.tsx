import { Metadata } from 'next';
import { ContentPageLayout } from '@/components/ContentPageLayout';

export const metadata: Metadata = {
  title: 'How To Do It Properly',
  description: 'Step-by-step guides with videos, tools lists, and professional tips for every renovation task.',
};

export default function GuidesPage() {
  return (
    <ContentPageLayout
      title="How To Do It Properly"
      description="Step-by-step instructions, videos, tools lists, common mistakes, safety notes, and professional tips for every renovation task."
      slug="guides"
    >
      <div className="space-y-8">
        <section>
          <h2>Construction & Renovation Guides</h2>
          <p>
            Every guide in this section includes written instructions, images, embedded videos,
            tools and materials lists, common mistakes to avoid, safety considerations, and
            linked calculators for material estimates.
          </p>
        </section>

        <section>
          <h3>Guide Categories</h3>
          <ul className="list-disc list-inside space-y-2 text-secondary">
            <li>Tiling (walls, floors, bathrooms)</li>
            <li>Painting (interior, exterior, prep)</li>
            <li>Plastering and drywall</li>
            <li>Flooring installation</li>
            <li>Concrete work</li>
            <li>Brick and block laying</li>
            <li>Plumbing basics</li>
            <li>Electrical fundamentals</li>
            <li>Roofing</li>
            <li>Insulation and weatherproofing</li>
          </ul>
        </section>

        <section>
          <h3>Each Guide Includes</h3>
          <ul className="list-disc list-inside space-y-2 text-secondary">
            <li>Detailed step-by-step instructions</li>
            <li>Photo and diagram sections</li>
            <li>Embedded video tutorials</li>
            <li>Tools and materials checklist</li>
            <li>Common mistakes and how to avoid them</li>
            <li>Safety warnings and PPE requirements</li>
            <li>Material calculators and cost estimates</li>
            <li>Professional tips and expert advice</li>
          </ul>
        </section>
      </div>
    </ContentPageLayout>
  );
}
