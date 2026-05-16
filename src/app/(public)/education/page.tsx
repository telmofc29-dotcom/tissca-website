import { Metadata } from 'next';
import { ContentPageLayout } from '@/components/ContentPageLayout';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Construction Knowledge — TISSCA',
  description:
    'Renovation sequences, material selection, building codes, and professional standards — the knowledge that powers TISSCA tools.',
};

export default function EducationPage() {
  return (
    <ContentPageLayout
      title="Construction Knowledge"
      description="The professional know-how behind every TISSCA feature — renovation sequences, material science, building codes, and trade standards."
      slug="education"
    >
      <div className="space-y-8">
        <section>
          <h2>Knowledge That Powers the Platform</h2>
          <p>
            TISSCA's calculators, guides, and quality tools are backed by deep construction
            knowledge. This section covers the fundamentals that every professional should
            know — and that power every estimate the platform generates.
          </p>
        </section>

        <section>
          <h3>Topics Covered</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Renovation sequencing and dependencies</li>
            <li>Material properties and selection</li>
            <li>Building codes and compliance</li>
            <li>Professional standards for every trade</li>
            <li>Quality assurance and inspection</li>
            <li>Safety and site management</li>
            <li>Project planning and scheduling</li>
            <li>Sustainability and modern standards</li>
          </ul>
        </section>

        <section>
          <h3>Renovation Sequences</h3>
          <p>
            Understanding the correct order of work saves time, money, and prevents rework.
            TISSCA's project planner uses these sequences to help you schedule jobs correctly.
          </p>
        </section>

        <section>
          <h3>Material Selection</h3>
          <p>
            Choosing the right materials for the job, understanding durability vs cost,
            and knowing what to expect in performance and lifespan. Every TISSCA calculator
            factors in material grade and waste.
          </p>
          <p className="mt-3">
            <Link href="/calculators" className="text-[#cbb26b] hover:text-[#b89b4a] font-semibold">
              View calculators →
            </Link>
          </p>
        </section>
      </div>
    </ContentPageLayout>
  );
}
