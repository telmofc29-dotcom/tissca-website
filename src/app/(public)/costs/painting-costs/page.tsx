import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Painting Costs UK - Labour Rates & Material Expenses | BUILDR',
  description: 'Understand UK painting costs. Labour rates (£80-180/day), material expenses, and budget vs premium pricing explained.',
  keywords: 'painting costs, UK painting rates, interior painting, painting labour',
};

export default function PaintingCostsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="max-w-4xl mx-auto px-6 py-4">
        <Link href="/costs" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Back to Construction Costs
        </Link>
      </section>

      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-3">Painting Costs</h1>
          <p className="text-lg text-slate-200">
            Understanding UK painting labour rates, material costs, and what affects total pricing.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none mb-12">
          <h2 className="text-2xl font-bold mb-4">UK Painting Labour Rates</h2>
          
          <div className="space-y-4 mb-8">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="font-bold mb-2">Budget: £80-£120/day</p>
              <p className="text-sm text-slate-700">Apprentices or very junior painters. Basic coverage without meticulous prep.</p>
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <p className="font-bold mb-2">Standard: £150-£200/day</p>
              <p className="text-sm text-slate-700">Experienced painters. Proper prep work, professional finish, good coverage.</p>
            </div>
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <p className="font-bold mb-2">Premium: £220-£280+/day</p>
              <p className="text-sm text-slate-700">Specialist painters. Meticulous prep, premium techniques, exceptional finish quality.</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Material Costs</h2>
          <div className="space-y-2 text-slate-700 mb-6">
            <p><strong>Budget paint (per 5L):</strong> £30-50 (coverage: ~50m²)</p>
            <p><strong>Standard paint (per 5L):</strong> £60-100 (coverage: ~50m²)</p>
            <p><strong>Premium paint (per 5L):</strong> £120-200 (coverage: ~45m²)</p>
            <p><strong>Primer (per 5L):</strong> £25-60</p>
            <p><strong>Prep materials (sandpaper, filler, masking):</strong> £20-50 per room</p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Real Example: 50m² Living Room</h2>
          
          <div className="space-y-6 mb-8">
            <div className="bg-yellow-50 p-4 rounded border-l-4 border-yellow-400">
              <h3 className="font-bold mb-3">Budget Option</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Paint (2 × 5L):</span><span>£80</span></div>
                <div className="flex justify-between"><span>Labour (3 days):</span><span>£300</span></div>
                <div className="flex justify-between"><span>Prep materials:</span><span>£30</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£410</span></div>
              </div>
              <p className="text-xs text-slate-600 mt-3">Quick coverage, minimal prep, basic finish</p>
            </div>

            <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-400">
              <h3 className="font-bold mb-3">Standard Option</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Quality paint (2 × 5L):</span><span>£160</span></div>
                <div className="flex justify-between"><span>Primer (1 × 5L):</span><span>£40</span></div>
                <div className="flex justify-between"><span>Labour (3 days):</span><span>£450</span></div>
                <div className="flex justify-between"><span>Prep materials:</span><span>£40</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£690</span></div>
              </div>
              <p className="text-xs text-slate-600 mt-3">Proper prep, good coverage, professional finish lasting 10+ years</p>
            </div>

            <div className="bg-green-50 p-4 rounded border-l-4 border-green-400">
              <h3 className="font-bold mb-3">Premium Option</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Premium paint (2 × 5L):</span><span>£320</span></div>
                <div className="flex justify-between"><span>Premium primer (1 × 5L):</span><span>£60</span></div>
                <div className="flex justify-between"><span>Labour (3 days):</span><span>£600</span></div>
                <div className="flex justify-between"><span>Specialist prep materials:</span><span>£60</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£1,040</span></div>
              </div>
              <p className="text-xs text-slate-600 mt-3">Meticulous prep, premium finish, exceptional durability 15+ years</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">What Affects Cost?</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Prep work:</strong> Poor condition surfaces require more prep (sanding, filling, repairs)</li>
            <li><strong>Number of coats:</strong> Most work 2 coats. Stained walls may need primer + 2 coats</li>
            <li><strong>Ceiling height:</strong> Higher ceilings = scaffolding needed (adds cost/time)</li>
            <li><strong>Colour choice:</strong> Some colours need more coats for coverage</li>
            <li><strong>Specialist finishes:</strong> Textured, eggshell, gloss more expensive than matte emulsion</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Common Misunderstandings</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>"Paint is just paint":</strong> Quality varies hugely. Premium paint lasts longer with better coverage</li>
            <li><strong>"Faster is better":</strong> Rushing prep leads to poor finish. Professional painters spend 40% of time prepping</li>
            <li><strong>"One coat will do":</strong> Quality painting needs at least 2 coats for proper coverage</li>
            <li><strong>"Very cheap painters are great deals":</strong> Usually rushing or skipping prep = poor lasting finish</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Red Flags</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li>Quote doesn't specify paint brand/grade</li>
            <li>Quote doesn't mention prep work</li>
            <li>Suspiciously quick timeline (quality painters need proper time)</li>
            <li>No warranty on finish</li>
          </ul>
        </div>

        <div className="bg-slate-50 rounded-lg p-8 mt-12">
          <h3 className="text-xl font-bold mb-4">Related</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/costs/labour-costs" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Labour Costs Guide
            </Link>
            <Link href="/costs" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Back to All Costs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
