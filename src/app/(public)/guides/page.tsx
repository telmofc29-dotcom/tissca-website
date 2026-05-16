import { Metadata } from 'next';
import { ContentPageLayout } from '@/components/ContentPageLayout';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Professional Guides — TISSCA',
  description:
    'Step-by-step construction guides with tools lists, best practices, and professional tips — built into the TISSCA platform.',
};

export default function GuidesPage() {
  return (
    <ContentPageLayout
      title="Professional Guides"
      description="Step-by-step instructions, tools lists, common mistakes, and professional tips — the knowledge built into every TISSCA tool."
      slug="guides"
    >
      <div className="space-y-8">
        <section>
          <h2>Built for Tradespeople</h2>
          <p>
            Every guide is written for professionals and backed by real trade experience.
            Use them as quick references on-site, share with apprentices, or review before
            quoting a new type of job.
          </p>
        </section>

        <section>
          <h3>Guide Categories</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Tiling — walls, floors, bathrooms, wet rooms</li>
            <li>Painting — interior, exterior, preparation</li>
            <li>Plastering — skim, bonding, drywall</li>
            <li>Flooring — laminate, vinyl, hardwood</li>
            <li>Concrete — foundations, slabs, footings</li>
            <li>Brick & block — walls, piers, extensions</li>
            <li>Plumbing — first & second fix, waste</li>
            <li>Electrical — circuits, boards, testing</li>
            <li>Roofing — tiles, felt, flat roofs</li>
            <li>Insulation — loft, cavity, external</li>
          </ul>
        </section>

        <section>
          <h3>What Every Guide Covers</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Detailed step-by-step instructions</li>
            <li>Tools and materials checklist</li>
            <li>Common mistakes and how to avoid them</li>
            <li>Safety considerations and PPE requirements</li>
            <li>Material calculators and cost estimates</li>
            <li>Professional tips from experienced tradespeople</li>
          </ul>
        </section>

        <section>
          <h3>Use Guides Inside the App</h3>
          <p>
            TISSCA Pro users can access every guide directly inside the mobile app — on-site,
            offline, and linked to the relevant calculator for instant material estimates.
          </p>
          <p className="mt-3">
            <Link href="/#plans" className="text-[#cbb26b] hover:text-[#b89b4a] font-semibold">
              View plans →
            </Link>
          </p>
        </section>
      </div>
    </ContentPageLayout>
  );
}
