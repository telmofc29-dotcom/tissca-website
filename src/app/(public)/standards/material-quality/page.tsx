import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Material Quality Standards | BUILDR',
  description: 'Understanding material grades, quality tiers, durability, and lifecycle costs. What materials last and why quality matters.',
  keywords: 'material quality, material grades, durability, construction materials, material standards',
};

export default function MaterialQualityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="max-w-4xl mx-auto px-6 py-4">
        <Link href="/standards" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Back to Standards & Quality
        </Link>
      </section>

      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-3">Material Quality Standards</h1>
          <p className="text-lg text-slate-200">
            Understanding material grades, durability expectations, and how to choose quality materials that last.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none">
          <h2 className="text-2xl font-bold mb-4">Why Material Quality Matters</h2>
          <p className="text-slate-700 mb-6">
            Material choice affects not just initial cost but ongoing performance, durability, and maintenance. A cheap material that fails in 5 years costs far more than a quality material lasting 25 years when you factor in replacement labour and inconvenience.
          </p>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-6">
            <p className="font-semibold text-slate-900 mb-2">The Real Cost of Cheap Materials</p>
            <p className="text-slate-700">
              Budget paint that fails in 2 years requires repainting (labour £500-1,000). Quality paint lasts 8-10 years. Over 20 years, premium paint is cheaper despite higher initial cost.
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Paint Quality Grades</h2>
          
          <div className="bg-amber-50 border-l-4 border-amber-400 p-6 mb-6">
            <p className="font-semibold text-slate-900 mb-3">Budget Grade Paint</p>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>Cost: £6-15 per litre</li>
              <li>Coverage: 8-10 m² per litre (poor coverage)</li>
              <li>Durability: 2-3 years before chalking/flaking</li>
              <li>Finish: Flat, no sheen, shows marks easily</li>
              <li>When to use: Ceilings, storage areas, temporary spaces</li>
            </ul>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-6">
            <p className="font-semibold text-slate-900 mb-3">Standard Grade Paint</p>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>Cost: £20-45 per litre</li>
              <li>Coverage: 12-14 m² per litre (proper coverage)</li>
              <li>Durability: 6-10 years of good appearance</li>
              <li>Finish: Matt or satin, washable, subtle sheen</li>
              <li>When to use: Living rooms, bedrooms, walls that get normal wear</li>
            </ul>
          </div>

          <div className="bg-emerald-50 border-l-4 border-emerald-400 p-6 mb-6">
            <p className="font-semibold text-slate-900 mb-3">Premium Grade Paint</p>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>Cost: £50-150+ per litre</li>
              <li>Coverage: 14-16 m² per litre (excellent coverage)</li>
              <li>Durability: 10-15 years, maintains appearance</li>
              <li>Finish: High sheen, stain-resistant, scrubbable</li>
              <li>When to use: Kitchens, bathrooms, high-traffic areas, feature walls</li>
              <li>Brands: Farrow & Ball, Little Greene, Dulux Diamond</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Floor Material Quality</h2>
          
          <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded">
              <h3 className="font-bold text-lg mb-2">Laminate Flooring</h3>
              <div className="space-y-3 text-slate-700">
                <p><strong>Budget (AC1-2):</strong> £4-8/m², 3-5 year lifespan, good for low-traffic areas</p>
                <p><strong>Standard (AC3):</strong> £12-20/m², 10-15 year lifespan, suitable for living areas</p>
                <p><strong>Premium (AC4+):</strong> £25-40/m², 20+ year lifespan, commercial-grade durability</p>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded">
              <h3 className="font-bold text-lg mb-2">Vinyl Flooring</h3>
              <div className="space-y-3 text-slate-700">
                <p><strong>Budget (thin):</strong> £5-10/m², 3-5 year lifespan, visible wear quickly</p>
                <p><strong>Standard (5-10mm):</strong> £15-30/m², 10-15 year lifespan, comfortable, water-resistant</p>
                <p><strong>Premium (luxury vinyl):</strong> £35-80/m², 20+ year lifespan, realistic wood/stone look, very durable</p>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded">
              <h3 className="font-bold text-lg mb-2">Wood Flooring</h3>
              <div className="space-y-3 text-slate-700">
                <p><strong>Budget (engineered, thin veneer):</strong> £20-40/m², 10-15 year lifespan, can't be sanded</p>
                <p><strong>Standard (engineered, 3mm veneer):</strong> £50-100/m², 20+ year lifespan, one refinish possible</p>
                <p><strong>Premium (solid hardwood):</strong> £80-250+/m², 50+ year lifespan, multiple refinishes, investment grade</p>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded">
              <h3 className="font-bold text-lg mb-2">Tile Flooring</h3>
              <div className="space-y-3 text-slate-700">
                <p><strong>Budget ceramic:</strong> £15-25/m², suitable for 10+ years in bathrooms, check frost rating</p>
                <p><strong>Standard porcelain:</strong> £30-60/m², 20+ year lifespan, stain-resistant, durable</p>
                <p><strong>Premium natural stone:</strong> £80-200+/m², 30+ year lifespan (needs sealing), luxury appearance</p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Tile Quality Standards</h2>
          <p className="text-slate-700 mb-4">Tiles are rated by:</p>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Water absorption:</strong> Porcelain (0.5%) vs Ceramic (3-10%). Lower = more durable</li>
            <li><strong>Frost rating:</strong> F = frost-resistant (essential for outdoor/unheated areas)</li>
            <li><strong>Slip rating:</strong> R11 (dry use) vs R13 (wet areas like bathrooms)</li>
            <li><strong>Grade:</strong> Grade 1 (few natural variations) vs Grade 3 (significant colour/pattern variation)</li>
            <li><strong>PEI rating:</strong> 1-5 for wear rating. 3+ for floors, 2+ for walls</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Insulation & Thermal Standards</h2>
          <p className="text-slate-700 mb-6">
            Building Regulations require minimum insulation values (U-values). Materials are rated:
          </p>
          <div className="bg-slate-100 rounded-lg p-6 mb-6">
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li><strong>Fiberglass batts:</strong> Budget insulation, R3.5-4.2 per 100mm (industry standard)</li>
              <li><strong>Mineral wool:</strong> Standard, R3.6-4.8 per 100mm, better fire rating</li>
              <li><strong>Rigid foam:</strong> Premium, R5-6 per 100mm, superior performance, more expensive</li>
              <li><strong>Spray foam:</strong> Premium, R3.6-6.5 per 100mm depending on type, seals gaps completely</li>
            </ul>
            <p className="text-sm text-slate-600 mt-4">
              <em>Note: Modern Building Regulations (2023+) require higher insulation values. Check current standards for your project.</em>
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Window & Door Quality</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-lg mb-2">Windows</h3>
              <p className="text-slate-700 mb-2"><strong>Budget (single-hung PVC):</strong> £200-400/window, standard double-glazing, adequate insulation</p>
              <p className="text-slate-700"><strong>Premium (dual-pane with foam core):</strong> £600-1,200/window, triple-glazing, exceptional sound reduction, lifespan 40+ years</p>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-2">Doors</h3>
              <p className="text-slate-700 mb-2"><strong>Budget (hollow core):</strong> £80-200, hollow construction, poor insulation, 5-10 year lifespan</p>
              <p className="text-slate-700"><strong>Premium (solid wood or composite):</strong> £300-800, solid construction, excellent insulation, 20+ year lifespan, genuine finish</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Roofing Material Durability</h2>
          <div className="bg-slate-100 rounded-lg p-6 mb-6">
            <div className="space-y-4">
              <div>
                <p className="font-bold text-slate-900">Asphalt Shingles</p>
                <p className="text-slate-700">Lifespan: 15-20 years. Budget material. Requires maintenance. UV damage common.</p>
              </div>
              <div>
                <p className="font-bold text-slate-900">Concrete/Clay Tiles</p>
                <p className="text-slate-700">Lifespan: 30-40 years. Quality material. Heavy, requires strong roof structure. Excellent weather resistance.</p>
              </div>
              <div>
                <p className="font-bold text-slate-900">Slate Tiles</p>
                <p className="text-slate-700">Lifespan: 50-100+ years. Premium investment. Requires skilled installation. Maintains appearance over decades.</p>
              </div>
              <div>
                <p className="font-bold text-slate-900">Metal Roofing</p>
                <p className="text-slate-700">Lifespan: 40-70 years. Modern premium option. Lightweight, durable, recyclable, good for solar integration.</p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">How to Verify Material Quality</h2>
          <p className="text-slate-700 mb-4">Before purchasing, confirm specifications:</p>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Grade/certification:</strong> Ask for product data sheets and certifications</li>
            <li><strong>Warranty:</strong> Quality materials come with 10-25 year warranties</li>
            <li><strong>Brand reputation:</strong> Established brands have better quality control</li>
            <li><strong>Testing standards:</strong> Look for CE marking (EU) or equivalent standards</li>
            <li><strong>Reviews:</strong> Check independent reviews for long-term durability feedback</li>
          </ul>

          <div className="bg-amber-50 border-l-4 border-amber-400 p-6 my-8">
            <p className="font-semibold text-slate-900 mb-3">Red Flags for Poor Quality Materials</p>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>No warranty offered</li>
              <li>Significantly cheaper than comparable products</li>
              <li>No product certification or data available</li>
              <li>Contractor substitutes materials without approval</li>
              <li>Material arrives with visible defects (splits, discolouration)</li>
              <li>Manufacturer unknown or no online presence</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Material Quality by Project Area</h2>
          <div className="space-y-4 text-slate-700">
            <p>
              <strong>Bathrooms:</strong> Use premium materials here—water exposure is relentless. Budget materials fail within 5 years. Waterproofing, ventilation, and mould-resistant products essential.
            </p>
            <p>
              <strong>Kitchens:</strong> Heavy use area. Standard to premium materials recommended. Quality countertops last 20+ years vs budget 5-7 years.
            </p>
            <p>
              <strong>Living areas:</strong> Standard materials adequate for most homes. Paint quality matters more than other choices due to visibility.
            </p>
            <p>
              <strong>Hidden areas (attics, basements):</strong> Budget materials acceptable—functionality over aesthetics. Focus on durability and moisture resistance.
            </p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Sustainability & Material Choice</h2>
          <p className="text-slate-700 mb-6">
            Quality materials often have better environmental profiles. A paint lasting 15 years has half the environmental impact of paint needing replacement every 3 years.
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li>Sustainable forestry certified timber costs more but lasts longer</li>
            <li>Recycled content materials available for many products</li>
            <li>Low-VOC paints cost slightly more but better for health</li>
            <li>Quality materials support repair vs replacement culture</li>
          </ul>

          <div className="bg-slate-100 rounded-lg p-6 my-8">
            <p className="text-slate-700">
              <strong>Material quality is an investment in your home's future.</strong> Budget materials are tempting upfront but cost more over time in replacements, repairs, and repainting. Standard to premium materials in visible, high-use areas pay for themselves through durability and reduced maintenance.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-8 mt-12">
          <h3 className="text-xl font-bold mb-4">Related Standards & Quality Pages</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/standards/workmanship" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Workmanship Standards
            </Link>
            <Link href="/standards/finishing-quality" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Finishing Quality
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
