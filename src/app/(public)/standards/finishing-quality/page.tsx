import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Finishing Quality Standards | BUILDR',
  description: 'Quality expectations for finishes by tier. What good, acceptable, and poor finishes look like. How to inspect finish quality.',
  keywords: 'finishing quality, finish standards, interior finishes, quality expectations',
};

export default function FinishingQualityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="max-w-4xl mx-auto px-6 py-4">
        <Link href="/standards" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Back to Standards & Quality
        </Link>
      </section>

      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-3">Finishing Quality Standards</h1>
          <p className="text-lg text-slate-200">
            What constitutes acceptable finishes by pricing tier. How to inspect finish quality and spot poor workmanship.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-bold mb-4">Understanding Finish Quality Tiers</h2>
          <p className="text-slate-700 mb-6">
            Finish quality directly correlates to price. Understanding what each tier delivers helps you get the quality you're paying for—and avoid overpaying for budget finishes or underestimating premium finish costs.
          </p>

          <h2 className="text-2xl font-bold mb-4 mt-8">Budget Tier Finishing</h2>
          <div className="bg-amber-50 border-l-4 border-amber-400 p-6 mb-6">
            <p className="font-semibold text-slate-900 mb-3">Characteristics:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>Acceptable for function, not for aesthetics</li>
              <li>Meets minimum standards</li>
              <li>Some imperfections are acceptable and expected</li>
              <li>Not suitable for high-visibility areas</li>
              <li>May require touch-ups over time</li>
              <li>Limited colour/pattern choices (stock items only)</li>
            </ul>
          </div>

          <h3 className="text-xl font-bold mb-3 mt-6">Budget Paint Finishes</h3>
          <div className="bg-slate-50 p-6 rounded mb-4">
            <p className="text-slate-700 mb-3">
              <strong>What to expect:</strong> Flat finish with visible roller texture under angle light. Possibly some brush marks, minor variation in coverage, uneven edges at ceiling/walls.
            </p>
            <p className="text-slate-700 mb-3">
              <strong>Acceptable defects:</strong> Visible stippling (orange peel texture), minor drips in obscure areas, slight colour variation, textured surface feeling.
            </p>
            <p className="text-slate-700">
              <strong>Use for:</strong> Storage areas, workshops, ceilings, utility rooms, first coat under tiling.
            </p>
          </div>

          <h3 className="text-xl font-bold mb-3 mt-6">Budget Floor Finishing</h3>
          <div className="bg-slate-50 p-6 rounded mb-4">
            <p className="text-slate-700 mb-3">
              <strong>What to expect:</strong> Tiles may have visible grout colour variation, slight lippage (uneven edges), inconsistent grout line width, basic installation without sealing.
            </p>
            <p className="text-slate-700 mb-3">
              <strong>Laminate:</strong> May show visible seams, joints not perfectly aligned, susceptible to water damage at joints, surface may show marks easily.
            </p>
            <p className="text-slate-700">
              <strong>Use for:</strong> Utility areas, basements, garages, low-traffic spaces.
            </p>
          </div>

          <h3 className="text-xl font-bold mb-3 mt-6">Budget Tiling Finishing</h3>
          <div className="bg-slate-50 p-6 rounded mb-4">
            <p className="text-slate-700 mb-3">
              <strong>What to expect:</strong> Grout lines may be ±2mm uneven, some tile lippage visible, grout finish not perfectly smooth, possibly some hollow spots (adhesion issues) when tapped.
            </p>
            <p className="text-slate-700">
              <strong>Acceptable:</strong> Slight gaps, minor chips at edges, grout colour inconsistency, ungrout-sealed tiles (will stain).
            </p>
            <p className="text-slate-700">
              <strong>Use for:</strong> Utility areas, storage shelves, garden sheds.
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Standard Tier Finishing</h2>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-6">
            <p className="font-semibold text-slate-900 mb-3">Characteristics:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>Good quality for normal viewing distance</li>
              <li>Professional appearance when viewed from 2 metres or more</li>
              <li>Minor imperfections acceptable up close, invisible from normal distance</li>
              <li>Suitable for living spaces</li>
              <li>Should perform well for 10-15 years</li>
              <li>Wider material/colour choices available</li>
            </ul>
          </div>

          <h3 className="text-xl font-bold mb-3 mt-6">Standard Paint Finishes</h3>
          <div className="bg-slate-50 p-6 rounded mb-4">
            <p className="text-slate-700 mb-3">
              <strong>What to expect:</strong> Smooth, consistent finish with no visible roller texture. Sharp edges at walls and ceiling. Consistent colour throughout. Two-coat coverage minimum.
            </p>
            <p className="text-slate-700 mb-3">
              <strong>Minor imperfections acceptable:</strong> Under magnification or very close inspection, may see minimal texture. From 2m distance, finish appears perfect.
            </p>
            <p className="text-slate-700 mb-3">
              <strong>Edge quality:</strong> Tape lines clean and sharp (±1mm acceptable).
            </p>
            <p className="text-slate-700">
              <strong>Use for:</strong> Living rooms, bedrooms, hallways, kitchens, bathrooms.
            </p>
          </div>

          <h3 className="text-xl font-bold mb-3 mt-6">Standard Floor Finishing</h3>
          <div className="bg-slate-50 p-6 rounded mb-4">
            <p className="text-slate-700 mb-3">
              <strong>Tiles:</strong> Grout lines consistent (±1mm variation), no visible lippage, grout finish smooth and clean, sealed properly (especially in wet areas).
            </p>
            <p className="text-slate-700 mb-3">
              <strong>Laminate:</strong> Seams virtually invisible, no gaps, joints perfectly aligned, surface protected and unmarked.
            </p>
            <p className="text-slate-700">
              <strong>Use for:</strong> Living spaces, kitchens, bedrooms, main traffic areas.
            </p>
          </div>

          <h3 className="text-xl font-bold mb-3 mt-6">Standard Tiling Finishing</h3>
          <div className="bg-slate-50 p-6 rounded mb-4">
            <p className="text-slate-700 mb-3">
              <strong>What to expect:</strong> Perfectly straight grout lines (0 lippage), smooth grout finish, consistent grout colour, tiles perfectly aligned, no visible hollow spots, sealed as appropriate.
            </p>
            <p className="text-slate-700 mb-3">
              <strong>Edge finishing:</strong> Cut edges smoothly finished, no sharp edges, end tiles properly finished.
            </p>
            <p className="text-slate-700">
              <strong>Use for:</strong> Bathrooms, kitchens, living spaces, anywhere quality matters.
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Premium Tier Finishing</h2>
          <div className="bg-emerald-50 border-l-4 border-emerald-400 p-6 mb-6">
            <p className="font-semibold text-slate-900 mb-3">Characteristics:</p>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>Flawless from normal and close inspection</li>
              <li>Ready for photography or magazine features</li>
              <li>Visible attention to detail and craft</li>
              <li>Suitable for feature walls and high-visibility areas</li>
              <li>Should perform excellently for 20+ years</li>
              <li>Full range of finishes, colours, patterns, customization available</li>
            </ul>
          </div>

          <h3 className="text-xl font-bold mb-3 mt-6">Premium Paint Finishes</h3>
          <div className="bg-slate-50 p-6 rounded mb-4">
            <p className="text-slate-700 mb-3">
              <strong>What to expect:</strong> Decorator-quality finish. Surface completely smooth with satin or eggshell sheen. No visible texture. Perfect edge lines (sharp, clean, no paint bleed). Three coats minimum for coverage.
            </p>
            <p className="text-slate-700 mb-3">
              <strong>Premium finishes:</strong> Available finishes: high-gloss, metallic, textured, specialist paints (chalkboard, magnetic, antibacterial).
            </p>
            <p className="text-slate-700 mb-3">
              <strong>Quality indicators:</strong> Paint ready to receive wallpaper or any finish without imperfections showing through. Colour perfectly consistent throughout. No drips, marks, or roller lines visible even under direct light.
            </p>
            <p className="text-slate-700">
              <strong>Use for:</strong> Feature walls, high-end interiors, period properties, visible surfaces, showpiece rooms.
            </p>
          </div>

          <h3 className="text-xl font-bold mb-3 mt-6">Premium Floor Finishing</h3>
          <div className="'s-50 p-6 rounded mb-4">
            <p className="text-slate-700 mb-3">
              <strong>Natural wood (solid hardwood):</strong> Perfect finish with flawless sanding and sealing. Professional staining if colour applied. Multiple coats of sealant for durability and appearance.
            </p>
            <p className="text-slate-700 mb-3">
              <strong>Tiles:</strong> Perfect layout with complex patterns or mosaics if chosen. Grout invisible (zero lippage). Grout colour matches specification perfectly. All edges sealed, surface treated for maximum durability.
            </p>
            <p className="text-slate-700">
              <strong>Use for:</strong> Luxury finishes, investment-grade installations, showpiece rooms.
            </p>
          </div>

          <h3 className="text-xl font-bold mb-3 mt-6">Premium Tiling Finishing</h3>
          <div className="bg-slate-50 p-6 rounded mb-4">
            <p className="text-slate-700 mb-3">
              <strong>What to expect:</strong> Perfection. Complex patterns aligned flawlessly. Grout perfectly consistent, sealed appropriately. Cut edges perfectly finished. Waterproofing verified and certified (especially bathrooms).
            </p>
            <p className="text-slate-700 mb-3">
              <strong>Specialty work:</strong> Mosaic patterns, feature walls, artistic designs, custom cuts all executed flawlessly.
            </p>
            <p className="text-slate-700">
              <strong>Documentation:</strong> Waterproofing certified, grout type specified, maintenance instructions provided.
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Inspecting Finish Quality</h2>
          
          <div className="bg-slate-100 rounded-lg p-6 mb-6">
            <h3 className="font-bold mb-3">What to Check During Work</h3>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>Surface is being properly prepped (cleaned, undercoated, primed)</li>
              <li>Coats are being applied as agreed (single vs double vs triple)</li>
              <li>Materials being used match specification</li>
              <li>Coverage is even and consistent</li>
              <li>Edges are clean and properly finished</li>
              <li>Drips or runs are cleaned up immediately</li>
            </ul>
          </div>

          <div className="bg-slate-100 rounded-lg p-6 mb-6">
            <h3 className="font-bold mb-3">What to Check Upon Completion</h3>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li><strong>Surface uniformity:</strong> Check from multiple angles and lighting conditions</li>
              <li><strong>Edges:</strong> Sharp and clean at walls, ceilings, adjacent materials</li>
              <li><strong>Coverage:</strong> Consistent colour throughout, no patchy areas, no primer showing through</li>
              <li><strong>Finish:</strong> Matches agreed sheen level (flat, satin, gloss)</li>
              <li><strong>Cleanliness:</strong> No dust, drips, or marks left behind</li>
              <li><strong>Alignment (tiles):</strong> Straight grout lines, no lippage, consistent spacing</li>
              <li><strong>Joints:</strong> Caulking smooth and consistent where appropriate</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Common Finishing Defects</h2>
          
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded">
              <p className="font-bold text-slate-900 mb-2">Roller marks</p>
              <p className="text-slate-700">Visible ridge pattern from roller. Indicates insufficient coats or poor application technique. Budget-tier only.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded">
              <p className="font-bold text-slate-900 mb-2">Drips and runs</p>
              <p className="text-slate-700">Paint pooled at edges or dripping down. Should be cleaned up immediately. Not acceptable at any tier.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded">
              <p className="font-bold text-slate-900 mb-2">Brush marks</p>
              <p className="text-slate-700">Visible bristle lines in paint. Indicates poor quality brush or technique. Not acceptable in Standard or Premium.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded">
              <p className="font-bold text-slate-900 mb-2">Lippage (tiles)</p>
              <p className="text-slate-700">Uneven tile edges. Indicates poor spacer use or substrate issues. Not acceptable in Standard or Premium.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded">
              <p className="font-bold text-slate-900 mb-2">Grout colour variation</p>
              <p className="text-slate-700">Inconsistent grout colour between areas. Indicates poor grout mixing or inconsistent application. Not acceptable in Standard or Premium.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded">
              <p className="font-bold text-slate-900 mb-2">Hollow sounding tiles</p>
              <p className="text-slate-700">Tap tiles—hollow spots indicate inadequate adhesive. Will fail over time. Not acceptable at any tier.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded">
              <p className="font-bold text-slate-900 mb-2">Uneven grout lines</p>
              <p className="text-slate-700">Grout widths vary. Indicates poor workmanship. Not acceptable in Standard or Premium.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded">
              <p className="font-bold text-slate-900 mb-2">Bleed-through at edges</p>
              <p className="text-slate-700">Primer or old paint showing through new finish. Indicates insufficient coats or improper prep. Not acceptable in Standard or Premium.</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Premium Finishing Techniques</h2>
          <p className="text-slate-700 mb-4">
            Premium finishes often include techniques that elevate appearance:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Specialist primer:</strong> Specific to surface type (damp-resistant, bonding agent, stain-blocker)</li>
            <li><strong>Multiple undercoats:</strong> Three or more coats for depth and durability</li>
            <li><strong>Specialty finishes:</strong> Metallic, textured, limewash, polished plaster effects</li>
            <li><strong>Precision edging:</strong> Cutting-in at walls and ceilings with perfect lines</li>
            <li><strong>Pattern work:</strong> Complex tiling patterns, feature finishes, custom designs</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Finish Quality by Area</h2>
          
          <div className="space-y-4">
            <div>
              <p className="font-bold text-slate-900">Bathrooms</p>
              <p className="text-slate-700">Premium tier recommended. Water exposure requires excellent surface quality, proper waterproofing, sealed grout, and flawless finish to prevent water penetration.</p>
            </div>

            <div>
              <p className="font-bold text-slate-900">Kitchens</p>
              <p className="text-slate-700">Standard to Premium recommended. High visibility and heavy use (spatters, steam, wear) benefit from quality finishes that are easy to maintain.</p>
            </div>

            <div>
              <p className="font-bold text-slate-900">Living Rooms & Bedrooms</p>
              <p className="text-slate-700">Standard tier adequate. Visible but not heavy-use areas. Good balance of quality and cost.</p>
            </div>

            <div>
              <p className="font-bold text-slate-900">Hallways & Stairs</p>
              <p className="text-slate-700">Standard tier recommended. High-traffic areas benefit from durable finishes. Marks and wear show quickly with budget finishes.</p>
            </div>

            <div>
              <p className="font-bold text-slate-900">Storage & Utility Areas</p>
              <p className="text-slate-700">Budget tier acceptable. Function over appearance. No one spends time admiring the utility room.</p>
            </div>
          </div>

          <div className="bg-slate-100 rounded-lg p-6 mt-8">
            <p className="text-slate-700">
              <strong>Finish quality is the last thing people see, but the first thing they notice.</strong> While budget finishes are cheaper upfront, standard finishes hold up better and look professional longer. Premium finishes are an investment in visual impact and durability for high-visibility, high-use areas.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-8 mt-12">
          <h3 className="text-xl font-bold mb-4">Related Standards & Quality Pages</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/standards/workmanship" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Workmanship Standards
            </Link>
            <Link href="/standards/material-quality" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Material Quality
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
