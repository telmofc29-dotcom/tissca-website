import { Metadata } from 'next';
import { ContentPageLayout } from '@/components/ContentPageLayout';

export const metadata: Metadata = {
  title: 'Construction Education',
  description: 'Learn renovation sequences, materials, best practices, and professional standards.',
};

export default function EducationPage() {
  return (
    <ContentPageLayout
      title="Construction Education"
      description="Learn renovation sequences, understand materials, master best practices, and follow professional standards that guarantee quality work."
      slug="education"
    >
      <div className="space-y-8">
        <section>
          <h2>Building Knowledge</h2>
          <p>
            Understanding the principles and standards behind construction ensures better decisions,
            fewer mistakes, and buildings that last. This section covers the fundamentals every
            homeowner and tradesperson should know.
          </p>
        </section>

        <section>
          <h3>Learning Topics</h3>
          <ul className="list-disc list-inside space-y-2 text-secondary">
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
            Learn why certain tasks must be done in sequence and what happens when they're not.
          </p>
        </section>

        <section>
          <h3>Material Selection</h3>
          <p>
            Choosing the right materials for the job, understanding durability vs cost,
            and knowing what to expect in performance and lifespan.
          </p>
        </section>
      </div>
    </ContentPageLayout>
  );
}
