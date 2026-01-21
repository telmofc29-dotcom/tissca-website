import { Metadata } from 'next';
import { ContentPageLayout } from '@/components/ContentPageLayout';

export const metadata: Metadata = {
  title: 'Construction Costs',
  description: 'Honest construction cost breakdowns for labour, materials, and regional pricing.',
};

export default function ConstructionCostsPage() {
  return (
    <ContentPageLayout
      title="How Much Should This Really Cost?"
      description="Honest construction cost breakdowns covering labour, materials, regional pricing, and professional vs budget comparisons."
      slug="construction-costs"
    >
      <div className="space-y-8">
        <section>
          <h2>Construction Cost Breakdown</h2>
          <p>
            One of the biggest challenges in construction is understanding fair pricing. This section
            breaks down costs honestly, explaining what goes into every quote and why prices vary
            by region, season, and complexity.
          </p>
        </section>

        <section>
          <h3>Cost Structure</h3>
          <p>Every construction project breaks down into key cost categories:</p>
          <ul className="list-disc list-inside space-y-2 text-secondary">
            <li>Materials and supplies (delivered and wasted)</li>
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
        </section>

        <section>
          <h3>Regional Factors</h3>
          <p>
            Why construction costs differ by location, how to account for your area,
            and how to compare quotes fairly.
          </p>
        </section>
      </div>
    </ContentPageLayout>
  );
}
