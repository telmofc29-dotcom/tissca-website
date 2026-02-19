import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Plastering Costs UK - Labour Rates & Material Costs | TISSCA',
  description: 'Understand UK plastering costs. Labour rates (£90-180/day), material expenses, and what affects pricing.',
  keywords: 'plastering costs, UK plastering rates, plaster labour, wall plastering',
};

export default function PlasteringCostsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="max-w-4xl mx-auto px-6 py-4">
        <Link href="/costs" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Back to Construction Costs
        </Link>
      </section>

      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-3">Plastering Costs</h1>
          <p className="text-lg text-slate-200">
            Understanding UK plastering labour rates, material costs, and complexity factors.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none mb-12">
          <h2 className="text-2xl font-bold mb-4">UK Plastering Labour Rates</h2>
          
          <div className="space-y-4 mb-8">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="font-bold mb-2">Budget: £80-£120/day</p>
              <p className="text-sm text-slate-700">Inexperienced plasterers. Basic finishes, visible imperfections acceptable.</p>
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <p className="font-bold mb-2">Standard: £130-£180/day</p>
              <p className="text-sm text-slate-700">Experienced plasterers. Good finish, smooth surfaces, professional standard.</p>
            </div>
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <p className="font-bold mb-2">Premium: £190-£250+/day</p>
              <p className="text-sm text-slate-700">Specialist plasterers. Perfect finishes, decorative work, superior skill.</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Material Costs</h2>
          <div className="space-y-2 text-slate-700 mb-6">
            <p><strong>Standard plaster (bag):</strong> £4-8</p>
            <p><strong>Bonding plaster:</strong> £5-10</p>
            <p><strong>Finishing plaster:</strong> £6-12</p>
            <p><strong>Plasterboard (per sheet):</strong> £6-15</p>
            <p><strong>Joint compound/filler:</strong> £10-20 per project</p>
            <p><strong>Typical project waste:</strong> 10-15% material wastage</p>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Types of Plastering Work</h2>
          
          <div className="space-y-4 mb-8">
            <div className="border-l-4 border-blue-400 p-4 bg-blue-50">
              <h3 className="font-bold mb-2">Simple Re-plastering (existing walls)</h3>
              <p className="text-sm text-slate-700">Replastering damaged wall in existing room. Standard rate applies.</p>
            </div>
            
            <div className="border-l-4 border-green-400 p-4 bg-green-50">
              <h3 className="font-bold mb-2">Dot & Dab (plasterboard fixing)</h3>
              <p className="text-sm text-slate-700">Faster than traditional plastering. £100-150/day labour. Simpler, cheaper option.</p>
            </div>

            <div className="border-l-4 border-yellow-400 p-4 bg-yellow-50">
              <h3 className="font-bold mb-2">Skim Finishing</h3>
              <p className="text-sm text-slate-700">Thin plaster finish on plasterboard. Standard rate, quick work. Usually £25-40/m²</p>
            </div>

            <div className="border-l-4 border-purple-400 p-4 bg-purple-50">
              <h3 className="font-bold mb-2">Artex/Textured Finishes</h3>
              <p className="text-sm text-slate-700">Decorative finishes. Premium rates, requires specialist skill. £40-60/m²</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Real Example: Room Replastering (50m²)</h2>
          
          <div className="space-y-6 mb-8">
            <div className="bg-yellow-50 p-4 rounded border-l-4 border-yellow-400">
              <h3 className="font-bold mb-3">Budget Option</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Plaster & materials:</span><span>£60</span></div>
                <div className="flex justify-between"><span>Labour (3 days):</span><span>£300</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£360</span></div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-400">
              <h3 className="font-bold mb-3">Standard Option</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Quality plaster & materials:</span><span>£80</span></div>
                <div className="flex justify-between"><span>Labour (3 days):</span><span>£420</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£500</span></div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded border-l-4 border-green-400">
              <h3 className="font-bold mb-3">Premium Option (Perfect Finish)</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Premium plaster & materials:</span><span>£120</span></div>
                <div className="flex justify-between"><span>Labour (4 days, careful work):</span><span>£800</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£920</span></div>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">What Affects Cost?</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Wall condition:</strong> Badly damaged walls need more base coats (higher cost)</li>
            <li><strong>Substrate type:</strong> Brick/block vs old plaster—different techniques cost differently</li>
            <li><strong>Height/access:</strong> High ceilings need scaffolding (adds cost)</li>
            <li><strong>Straight vs curved:</strong> Curved walls need more skill (premium rates)</li>
            <li><strong>Decorative finishes:</strong> Trowel patterns or artex: 50%+ cost increase</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Common Misunderstandings</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>"All plaster is the same":</strong> Budget vs premium finishes very different</li>
            <li><strong>"Plaster dries quickly":</strong> Actually 2-3 weeks for full cure. Recoating timeline matters</li>
            <li><strong>"Plasterboard is cheaper than plaster":</strong> It is—dot & dab costs £40-60/m² vs plaster £30-40</li>
            <li><strong>"Imperfections sand out":</strong> Major imperfections are hard to fix</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Red Flags</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li>Quote doesn't specify plaster type (bonding vs finish vs multi-coat)</li>
            <li>Very fast timescales (plaster needs drying time between coats)</li>
            <li>No mention of base coat needed for damaged walls</li>
            <li>Labour rate under £80/day seems suspiciously cheap</li>
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
