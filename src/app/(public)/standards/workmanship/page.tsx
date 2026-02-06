import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Professional Workmanship Standards | TISSCA',
  description: 'What professional workmanship looks like. Quality standards by tier. How to inspect finished work and identify poor workmanship.',
  keywords: 'workmanship standards, professional work, quality standards, construction quality',
};

export default function WorkmanshipPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="max-w-4xl mx-auto px-6 py-4">
        <Link href="/standards" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Back to Standards & Quality
        </Link>
      </section>

      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-3">Professional Workmanship Standards</h1>
          <p className="text-lg text-slate-200">
            How to recognize quality work and understand what professionals should deliver at each pricing tier.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-bold mb-4">What Is Professional Workmanship?</h2>
          <p className="text-slate-700 mb-6">
            Professional workmanship means the work is done correctly according to industry standards, completed safely, and finishes to an agreed quality level. It's not just about the trade skill—it's also preparation, attention to detail, site management, and finishing touches.
          </p>

          <h2 className="text-2xl font-bold mb-4 mt-8">Budget Tier Workmanship</h2>
          <div className="bg-amber-50 border-l-4 border-amber-400 p-6 mb-6">
            <p className="font-semibold text-slate-900 mb-2">Price range: £80-130/day (trades vary)</p>
            <p className="text-slate-700">What to expect:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 mt-3">
              <li>Work is done to code-minimum standards</li>
              <li>Minimal preparation (some surfaces may not be fully prepped)</li>
              <li>Functional, not aesthetic—may have minor imperfections</li>
              <li>Basic cleanup; may need additional tidying by you</li>
              <li>Limited warranty or guarantee</li>
              <li>Uses budget-tier materials (specified or equivalent)</li>
              <li>Single coat or single finish in many cases</li>
            </ul>
          </div>

          <h3 className="text-xl font-bold mb-3 mt-6">Budget Workmanship Examples</h3>
          <p className="text-slate-700 mb-4">
            <strong>Painting:</strong> Single coat on walls, limited prep, visible roller marks under certain angles, paint edges not sharp or crisp.
          </p>
          <p className="text-slate-700 mb-4">
            <strong>Tiling:</strong> Grout lines slightly uneven (±2mm variation acceptable), occasional lippage (tile edges not perfectly aligned), grout not perfectly finished.
          </p>
          <p className="text-slate-700 mb-4">
            <strong>Plastering:</strong> Surface level and smooth but may have minor blemishes, seams visible under direct light, finish not perfectly smooth.
          </p>

          <h2 className="text-2xl font-bold mb-4 mt-8">Standard Tier Workmanship</h2>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-6">
            <p className="font-semibold text-slate-900 mb-2">Price range: £150-220/day (trades vary)</p>
            <p className="text-slate-700">What to expect:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 mt-3">
              <li>Proper preparation (surfaces cleaned, undercoated, primed where needed)</li>
              <li>Correct multiple coats (2 coats minimum, 3 for quality paint finishes)</li>
              <li>Neat, professional finish with sharp edges and clean lines</li>
              <li>Attention to detail but some minor imperfections acceptable</li>
              <li>Good site cleanliness during and after work</li>
              <li>Standard warranty/guarantee (12 months typical)</li>
              <li>Uses quality materials, proper undercoats and primers</li>
            </ul>
          </div>

          <h3 className="text-xl font-bold mb-3 mt-6">Standard Workmanship Examples</h3>
          <p className="text-slate-700 mb-4">
            <strong>Painting:</strong> Properly prepped walls, two coats applied professionally, clean sharp edges at walls/ceilings, consistent finish.
          </p>
          <p className="text-slate-700 mb-4">
            <strong>Tiling:</strong> Grout lines consistent (±1mm variation), tiles perfectly aligned with no lippage, grout finish smooth and consistent, sealed properly.
          </p>
          <p className="text-slate-700 mb-4">
            <strong>Plastering:</strong> Surface perfectly smooth and level, takes paint finish without imperfections, seams invisible under normal light.
          </p>

          <h2 className="text-2xl font-bold mb-4 mt-8">Premium Tier Workmanship</h2>
          <div className="bg-emerald-50 border-l-4 border-emerald-400 p-6 mb-6">
            <p className="font-semibold text-slate-900 mb-2">Price range: £240-350+/day (trades vary)</p>
            <p className="text-slate-700">What to expect:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-700 mt-3">
              <li>Meticulous preparation (every surface prepped and sealed)</li>
              <li>Multiple coats (3+ coats standard, 4+ for specialty finishes)</li>
              <li>Flawless finish with perfectly sharp edges and clean lines</li>
              <li>No visible imperfections under close inspection</li>
              <li>Immaculate site management; surfaces protected, cleanup after each day</li>
              <li>Premium warranty (2-5 years typical)</li>
              <li>Uses premium materials and specialist techniques</li>
              <li>Decorator-quality finishes, trade-specific craft skills</li>
            </ul>
          </div>

          <h3 className="text-xl font-bold mb-3 mt-6">Premium Workmanship Examples</h3>
          <p className="text-slate-700 mb-4">
            <strong>Painting:</strong> Walls completely prepped and filled, primer and undercoat applied, three coats of paint, edges razor-sharp, finish ready for photography.
          </p>
          <p className="text-slate-700 mb-4">
            <strong>Tiling:</strong> Complex pattern layouts, perfectly cut edges, consistent grout lines (zero lippage), grout sealed, waterproofing verified.
          </p>
          <p className="text-slate-700 mb-4">
            <strong>Plastering:</strong> Decorator-quality finish, perfectly smooth, ready to receive wallpaper, surface invisible in high-end interior finishes.
          </p>

          <h2 className="text-2xl font-bold mb-4 mt-8">How to Inspect Workmanship</h2>
          <div className="bg-slate-100 rounded-lg p-6 mb-6">
            <h3 className="font-bold mb-3">During Work (Weekly Inspections)</h3>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>Check that preparation is happening (priming, undercoating, etc.)</li>
              <li>Verify safety standards are being maintained</li>
              <li>Ensure site cleanliness during work</li>
              <li>Confirm materials match specification</li>
              <li>Check that agreed method is being followed</li>
            </ul>
          </div>

          <div className="bg-slate-100 rounded-lg p-6 mb-6">
            <h3 className="font-bold mb-3">Upon Completion (Before Final Payment)</h3>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li><strong>Surface finish:</strong> Smooth, no bumps, consistent texture (run hands over surface)</li>
              <li><strong>Edges:</strong> Sharp lines at walls, ceilings, adjacent materials (look from shallow angles)</li>
              <li><strong>Paint/coatings:</strong> Consistent colour, no drips, even coverage (check under different lighting)</li>
              <li><strong>Joints:</strong> Caulking smooth and consistent, no gaps</li>
              <li><strong>Alignment:</strong> Tiles/boards aligned, no lippage, consistent spacing</li>
              <li><strong>Cleanliness:</strong> Dust removed, protective surfaces cleaned, no marks left</li>
              <li><strong>Detail work:</strong> Around outlets, switches, baseboards, done properly</li>
              <li><strong>Gaps/cracks:</strong> None visible, or patched professionally</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Red Flags for Poor Workmanship</h2>
          <div className="bg-red-50 border-l-4 border-red-400 p-6 mb-6">
            <p className="text-slate-700 mb-3">Stop payment and call a third party to inspect if you see:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>Work completed before proper preparation (paint over dirty surfaces)</li>
              <li>Visible shortcuts (single coat when double agreed, no primer)</li>
              <li>Unsafe work practices (no scaffolding where needed, improper electrics)</li>
              <li>Poor cleaning (plaster dust over finishes, paint on adjacent areas)</li>
              <li>Materials differ from spec (cheaper substitution)</li>
              <li>Work doesn't match industry standards for the agreed tier</li>
              <li>Incomplete work (gaps, seams visible when should be invisible)</li>
              <li>Damage to other parts of the house during work</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Common Workmanship Issues by Trade</h2>
          
          <div className="space-y-6 my-8">
            <div>
              <h3 className="font-bold text-lg mb-2">Painting</h3>
              <p className="text-slate-700">Poor prep → poor finish. Look for runs, drips, patchy coverage, visible roller marks, uneven colours, and rough edges at walls/ceilings.</p>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-2">Tiling</h3>
              <p className="text-slate-700">Lippage (uneven tiles), grout colour inconsistency, hollow spots (test for adhesion), poor grout finish, unsealed grout in wet areas.</p>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-2">Plastering</h3>
              <p className="text-slate-700">Visible seams, bumpy surfaces, patchy finish, cracks appearing within weeks, inconsistent smoothness, paint finish reveals imperfections.</p>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-2">Electrical</h3>
              <p className="text-slate-700">Wiring not properly buried, outlets not level, cables visible, poor finishing around boxes, safety standards not met (requires qualified inspector).</p>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-2">Plumbing</h3>
              <p className="text-slate-700">Visible plumbing (should be in walls where possible), leaks, poor connections, pipes not properly secured, radiators not level, water pressure low.</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Workmanship Guarantees</h2>
          <p className="text-slate-700 mb-4">
            Your contract should specify what warranty the contractor provides for workmanship:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Budget tier:</strong> 12 months typical (or none)</li>
            <li><strong>Standard tier:</strong> 12 months standard</li>
            <li><strong>Premium tier:</strong> 2-5 years should be offered</li>
          </ul>

          <div className="bg-amber-50 border-l-4 border-amber-400 p-6 my-8">
            <p className="font-semibold text-slate-900 mb-2">Always insist on written warranty including:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>Duration (months/years)</li>
              <li>What is covered (workmanship vs materials)</li>
              <li>How to claim (notice period, contact details)</li>
              <li>What constitutes defect</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Setting Expectations</h2>
          <p className="text-slate-700 mb-6">
            The best way to ensure good workmanship is clear communication before work starts:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li>Specify exactly which tier (Budget/Standard/Premium) you're hiring</li>
            <li>Reference professional standards (e.g., "painter should follow professional painting standards")</li>
            <li>Include a detailed specification of finishes, colours, materials</li>
            <li>Agree on quality inspection points during the job</li>
            <li>Take photos of comparable high-quality work before contract signing</li>
            <li>Arrange final walkthrough with punch-list for any corrections needed</li>
          </ul>

          <div className="bg-slate-100 rounded-lg p-6 my-8">
            <p className="text-slate-700">
              Professional workmanship is worth paying for. Budget work done quickly is cheap but often leads to regret. Standard work is the sweet spot for most homeowners—good quality at reasonable cost. Premium work is for visible, long-term, high-wear areas where quality matters most.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-8 mt-12">
          <h3 className="text-xl font-bold mb-4">Related Standards & Quality Pages</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/standards/material-quality" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Material Quality Standards
            </Link>
            <Link href="/standards/finishing-quality" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Finishing Quality Standards
            </Link>
            <Link href="/standards/safety-requirements" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Safety Requirements
            </Link>
            <Link href="/standards/building-regulations" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Building Regulations
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
