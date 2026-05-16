import { Metadata } from 'next';
import { ContentPageLayout } from '@/components/ContentPageLayout';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Industry Best Practices — TISSCA',
  description:
    'Red flags, contract essentials, and professional standards that separate reliable tradespeople from the rest.',
};

export default function AvoidScamsPage() {
  return (
    <ContentPageLayout
      title="Industry Best Practices"
      description="Red flags, contract essentials, and professional standards that separate reliable tradespeople from cowboys — know the difference."
      slug="avoid-scams"
    >
      <div className="space-y-8">
        <section>
          <h2>Professionalism Matters</h2>
          <p>
            Poor practices cost the construction industry billions every year and damage the
            reputation of legitimate professionals. TISSCA helps tradespeople stand out by
            providing the tools to quote, document, and deliver work professionally.
          </p>
        </section>

        <section>
          <h3>Common Red Flags</h3>
          <ul className="list-disc list-inside space-y-2">
            <li>Unrealistic low quotes hiding future extras</li>
            <li>Requesting 100% payment upfront</li>
            <li>No written contracts or vague terms</li>
            <li>Fake or worthless warranties</li>
            <li>No insurance or trade membership</li>
            <li>Material substitution without disclosure</li>
            <li>Rushing through preparation and critical steps</li>
          </ul>
        </section>

        <section>
          <h3>Professional Quoting</h3>
          <p>
            Transparent, detailed quotes build trust with clients. TISSCA's quoting engine
            breaks down materials, labour, and overhead — so every line is clear.
          </p>
        </section>

        <section>
          <h3>Contract Essentials</h3>
          <p>
            What should be in every construction contract: scope, payment schedule,
            timelines, dispute resolution, and warranty terms.
          </p>
        </section>

        <section>
          <h3>Stand Out as a Professional</h3>
          <p>
            Branded documents, transparent pricing, and proper record keeping — TISSCA gives
            you the tools to run a professional operation from day one.
          </p>
          <p className="mt-3">
            <Link href="/#features" className="text-[#cbb26b] hover:text-[#b89b4a] font-semibold">
              See what TISSCA offers →
            </Link>
          </p>
        </section>
      </div>
    </ContentPageLayout>
  );
}
