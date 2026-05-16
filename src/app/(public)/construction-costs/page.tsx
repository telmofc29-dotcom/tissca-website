import { Metadata } from 'next';
import { ContentPageLayout } from '@/components/ContentPageLayout';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Cost Breakdown — TISSCA',
  description:
    'Transparent construction cost breakdowns for labour, materials, and regional pricing — the data that powers TISSCA estimates.',
};

export default function ConstructionCostsPage() {
  return (
    <ContentPageLayout
      title="Understanding Construction Costs"
      description="Transparent cost breakdowns covering labour, materials, and regional pricing — the data that powers every TISSCA estimate."
      slug="construction-costs"
    >
      <div className="space-y-8">
        <section>
          <h2>What Goes Into a Price</h2>
          <p>
            One of the biggest challenges in construction is fair pricing. This section
            breaks down every cost component — the same data TISSCA uses to generate
            accurate estimates and professional quotes.
          </p>
        </section>

        <section>
          <h3>Cost Structure</h3>
          <p>Every project breaks down into key cost categories:</p>
          <ul className="list-disc list-inside space-y-2">
            <li>Materials and supplies (including waste factors)</li>
            <li>Labour costs (wages, experience, certifications)</li>
            <li>Equipment and tool hire</li>
            <li>Site setup and cleanup</li>
            <li>Permits, inspections, and compliance</li>
            <li>Contingency for unknowns</li>
            <li>Project overhead and management</li>
          </ul>
        </section>

        <section>
          <h3>By Trade</h3>
          <p>
            Detailed cost breakdowns for tiling, painting, plastering, flooring, electrical,
            plumbing, roofing, and more.
          </p>
          <p className="mt-3">
            <Link href="/costs" className="text-[#cbb26b] hover:text-[#b89b4a] font-semibold">
              View full cost guides →
            </Link>
          </p>
        </section>

        <section>
          <h3>Regional Factors</h3>
          <p>
            Construction costs vary by location. TISSCA's estimating engine accounts for
            regional differences so your quotes are accurate wherever you work.
          </p>
        </section>
      </div>
    </ContentPageLayout>
  );
}
