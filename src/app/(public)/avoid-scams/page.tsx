import { Metadata } from 'next';
import { ContentPageLayout } from '@/components/ContentPageLayout';

export const metadata: Metadata = {
  title: 'Avoid Scams & Mistakes',
  description: 'Builder red flags, contract tricks, fake guarantees, and protection strategies.',
};

export default function AvoidScamsPage() {
  return (
    <ContentPageLayout
      title="Avoid Scams & Costly Mistakes"
      description="Recognize red flags, understand contract tricks, spot fake guarantees, and protect yourself from common homeowner traps."
      slug="avoid-scams"
    >
      <div className="space-y-8">
        <section>
          <h2>Protecting Yourself</h2>
          <p>
            Construction fraud and poor practices cost homeowners billions every year. This section
            teaches you the warning signs, contract traps, and strategies to protect yourself from
            unscrupulous builders and costly mistakes.
          </p>
        </section>

        <section>
          <h3>Common Scams & Tricks</h3>
          <ul className="list-disc list-inside space-y-2 text-secondary">
            <li>Unrealistic low quotes that lead to hidden costs</li>
            <li>Paying 100% upfront (red flag)</li>
            <li>No written contracts or vague terms</li>
            <li>Fake or worthless warranties</li>
            <li>Uninsured and unlicensed workers</li>
            <li>Using cheap materials when premium was quoted</li>
            <li>Rushing through critical steps</li>
            <li>Disappearing mid-project</li>
          </ul>
        </section>

        <section>
          <h3>Builder Red Flags</h3>
          <p>
            What to look for when choosing a builder, tradesperson, or contractor. How to verify
            credentials, insurance, and track record.
          </p>
        </section>

        <section>
          <h3>Contract Essentials</h3>
          <p>
            What must be in a construction contract, payment schedules, dispute resolution,
            and protection clauses that matter.
          </p>
        </section>

        <section>
          <h3>Warranties & Guarantees</h3>
          <p>
            Understanding real guarantees vs marketing language, what's actually covered,
            and how to enforce them.
          </p>
        </section>
      </div>
    </ContentPageLayout>
  );
}
