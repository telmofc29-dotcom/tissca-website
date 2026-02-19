import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Flooring Costs UK - Labour Rates & Installation Expenses | TISSCA',
  description: 'Understand UK flooring costs. Labour rates (£60-200/day), material costs, and what affects pricing.',
  keywords: 'flooring costs, UK flooring rates, flooring labour, laminate flooring, wooden floors',
};

export default function FlooringCostsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="max-w-4xl mx-auto px-6 py-4">
        <Link href="/costs" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Back to Construction Costs
        </Link>
      </section>

      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-3">Flooring Costs</h1>
          <p className="text-lg text-slate-200">
            Understanding UK flooring labour rates, material costs, and installation factors.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none mb-12">
          <h2 className="text-2xl font-bold mb-4">UK Flooring Labour Rates (per m²)</h2>
          
          <div className="space-y-4 mb-8">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="font-bold mb-2">Budget: £8-£15/m²</p>
              <p className="text-sm text-slate-700">Laminate/vinyl. Basic installation, may lack finesse.</p>
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <p className="font-bold mb-2">Standard: £15-£30/m²</p>
              <p className="text-sm text-slate-700">Laminate/vinyl professional, or basic wooden flooring. Proper installation, clean finish.</p>
            </div>
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <p className="font-bold mb-2">Premium: £30-£60/m²+</p>
              <p className="text-sm text-slate-700">Wooden flooring, stone, specialist finishes. Expert installation and finishing.</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Material Costs by Type</h2>
          
          <div className="space-y-4 mb-8">
            <div className="border-l-4 border-blue-400 p-4 bg-blue-50">
              <h3 className="font-bold mb-2">Laminate (per m²)</h3>
              <p className="text-sm text-slate-700"><strong>Budget:</strong> £4-8 | <strong>Standard:</strong> £8-15 | <strong>Premium:</strong> £15-30</p>
            </div>

            <div className="border-l-4 border-green-400 p-4 bg-green-50">
              <h3 className="font-bold mb-2">Vinyl (per m²)</h3>
              <p className="text-sm text-slate-700"><strong>Budget:</strong> £5-10 | <strong>Standard:</strong> £10-20 | <strong>Premium:</strong> £20-40</p>
            </div>

            <div className="border-l-4 border-yellow-400 p-4 bg-yellow-50">
              <h3 className="font-bold mb-2">Wooden Flooring (per m²)</h3>
              <p className="text-sm text-slate-700"><strong>Budget:</strong> £20-40 | <strong>Standard:</strong> £40-80 | <strong>Premium:</strong> £80-200+</p>
            </div>

            <div className="border-l-4 border-purple-400 p-4 bg-purple-50">
              <h3 className="font-bold mb-2">Stone/Ceramic (per m²)</h3>
              <p className="text-sm text-slate-700"><strong>Budget:</strong> £20-40 | <strong>Standard:</strong> £40-80 | <strong>Premium:</strong> £80-300+</p>
              <p className="text-sm text-slate-600 mt-2"><em>Note: Stone requires sealing (£200-500 additional)</em></p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Real Example: 20m² Bedroom Flooring</h2>
          
          <div className="space-y-6 mb-8">
            <div className="bg-yellow-50 p-4 rounded border-l-4 border-yellow-400">
              <h3 className="font-bold mb-3">Budget Laminate</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Laminate (20m²):</span><span>£120</span></div>
                <div className="flex justify-between"><span>Labour (1 day):</span><span>£200</span></div>
                <div className="flex justify-between"><span>Removal of old floor:</span><span>£100</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£420</span></div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-400">
              <h3 className="font-bold mb-3">Standard Vinyl Click</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Vinyl flooring (20m²):</span><span>£300</span></div>
                <div className="flex justify-between"><span>Labour (1.5 days):</span><span>£300</span></div>
                <div className="flex justify-between"><span>Removal of old floor:</span><span>£150</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£750</span></div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded border-l-4 border-green-400">
              <h3 className="font-bold mb-3">Premium Wooden Flooring</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Oak flooring (20m²):</span><span>£1,200</span></div>
                <div className="flex justify-between"><span>Labour (2.5 days):</span><span>£1,000</span></div>
                <div className="flex justify-between"><span>Removal & substrate prep:</span><span>£300</span></div>
                <div className="flex justify-between"><span>Finishing/sealing:</span><span>£300</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£2,800</span></div>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">What Affects Cost?</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Old floor removal:</strong> Adds £5-15/m² and 1-2 days labour</li>
            <li><strong>Substrate prep:</strong> Uneven/damp substrate needs treatment (major cost factor)</li>
            <li><strong>Stairs:</strong> Complex areas cost 2-3x more per m² than open rooms</li>
            <li><strong>Underlay:</strong> Sometimes included, sometimes £3-8/m² extra</li>
            <li><strong>Finishing:</strong> Wooden floors need sanding/sealing (adds £500-1,500)</li>
            <li><strong>Pattern/layout:</strong> Patterns cost more labour due to complexity</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Flooring Types Compared</h2>
          
          <div className="overflow-x-auto mb-8">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-3 py-2 text-left">Type</th>
                  <th className="border border-slate-300 px-3 py-2 text-left">Durability</th>
                  <th className="border border-slate-300 px-3 py-2 text-left">Maintenance</th>
                  <th className="border border-slate-300 px-3 py-2 text-left">Cost</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 px-3 py-2"><strong>Laminate</strong></td>
                  <td className="border border-slate-300 px-3 py-2">7-10 years</td>
                  <td className="border border-slate-300 px-3 py-2">Low (sweep/mop)</td>
                  <td className="border border-slate-300 px-3 py-2">Lowest</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-300 px-3 py-2"><strong>Vinyl</strong></td>
                  <td className="border border-slate-300 px-3 py-2">10-15 years</td>
                  <td className="border border-slate-300 px-3 py-2">Low (mop)</td>
                  <td className="border border-slate-300 px-3 py-2">Low-Medium</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-3 py-2"><strong>Wood</strong></td>
                  <td className="border border-slate-300 px-3 py-2">20-40+ years</td>
                  <td className="border border-slate-300 px-3 py-2">High (reseal every 3-5 years)</td>
                  <td className="border border-slate-300 px-3 py-2">High</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-300 px-3 py-2"><strong>Stone</strong></td>
                  <td className="border border-slate-300 px-3 py-2">50+ years</td>
                  <td className="border border-slate-300 px-3 py-2">Medium (seal, avoid acids)</td>
                  <td className="border border-slate-300 px-3 py-2">Very High</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Common Misunderstandings</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>"Laminate is nearly as good as wood":</strong> Lasts half as long. Not refinishable</li>
            <li><strong>"Vinyl is cheap":</strong> Quality vinyl costs £20-40/m². Not necessarily cheaper than laminate</li>
            <li><strong>"Wooden floors just need mopping":</strong> Actually need sealing every 3-5 years</li>
            <li><strong>"All flooring costs the same to fit":</strong> Wood fitting is 2-3x more expensive than vinyl</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Red Flags</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li>Quote doesn't mention old floor removal</li>
            <li>No substrate assessment mentioned</li>
            <li>Doesn't specify underlay or finishing</li>
            <li>Labour rate seems extremely cheap (under £10/m² is suspicious)</li>
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
