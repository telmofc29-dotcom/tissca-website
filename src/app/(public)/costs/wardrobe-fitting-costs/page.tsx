import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wardrobe Fitting Costs UK - Built-In Wardrobes & Installations | TISSCA',
  description: 'Understand UK wardrobe fitting costs. Built-in wardrobes, sliding doors, and installation labour explained.',
  keywords: 'wardrobe costs, built-in wardrobes, fitted wardrobes, wardrobe installation, wardrobe labour',
};

export default function WardrobeFittingCostsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <section className="max-w-4xl mx-auto px-6 py-4">
        <Link href="/costs" className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
          ← Back to Construction Costs
        </Link>
      </section>

      <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-3">Wardrobe Fitting Costs</h1>
          <p className="text-lg text-slate-200">
            Understanding built-in wardrobe costs. Sliding doors, shelving, installation labour, and design complexity.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none mb-12">
          <h2 className="text-2xl font-bold mb-4">Wardrobe Fitting Labour</h2>
          
          <div className="space-y-4 mb-8">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="font-bold mb-2">Budget: £100-£140/day</p>
              <p className="text-sm text-slate-700">Basic fitters. Simple installations, standard configurations.</p>
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <p className="font-bold mb-2">Standard: £160-£220/day</p>
              <p className="text-sm text-slate-700">Experienced wardrobe installers. Complex layouts, quality finishes.</p>
            </div>
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <p className="font-bold mb-2">Premium: £240-£300+/day</p>
              <p className="text-sm text-slate-700">Bespoke designers. Custom designs, built-in lighting, premium finishes.</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Wardrobe Costs by Type</h2>
          
          <div className="space-y-6 mb-8">
            <div className="border-l-4 border-blue-400 p-4 bg-blue-50">
              <h3 className="font-bold mb-2">Simple Hinged-Door Wardrobe</h3>
              <p className="text-sm text-slate-700"><strong>Per linear metre:</strong> £400-600</p>
              <p className="text-sm text-slate-700"><strong>Typical 2m wardrobe:</strong> £800-1,200 (including labour)</p>
              <p className="text-sm text-slate-600 mt-2"><em>Standard configuration, minimal shelving</em></p>
            </div>

            <div className="border-l-4 border-green-400 p-4 bg-green-50">
              <h3 className="font-bold mb-2">Sliding Door Wardrobe</h3>
              <p className="text-sm text-slate-700"><strong>Per linear metre:</strong> £600-900</p>
              <p className="text-sm text-slate-700"><strong>Typical 2.5m wardrobe:</strong> £1,500-2,250 (including labour)</p>
              <p className="text-sm text-slate-600 mt-2"><em>More expensive—sliding doors and hardware cost more</em></p>
            </div>

            <div className="border-l-4 border-yellow-400 p-4 bg-yellow-50">
              <h3 className="font-bold mb-2">Floor-to-Ceiling Fitted Wardrobe</h3>
              <p className="text-sm text-slate-700"><strong>Per linear metre:</strong> £800-1,200</p>
              <p className="text-sm text-slate-700"><strong>Typical 3m wardrobe:</strong> £2,400-3,600 (including labour)</p>
              <p className="text-sm text-slate-600 mt-2"><em>Fully utilises wall height, maximum storage</em></p>
            </div>

            <div className="border-l-4 border-purple-400 p-4 bg-purple-50">
              <h3 className="font-bold mb-2">Bespoke Custom Wardrobe</h3>
              <p className="text-sm text-slate-700"><strong>Per linear metre:</strong> £1,200-2,000+</p>
              <p className="text-sm text-slate-700"><strong>Typical 2.5m wardrobe:</strong> £3,000-5,000+ (including labour and design)</p>
              <p className="text-sm text-slate-600 mt-2"><em>Custom layout, premium materials, integrated lighting</em></p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Real Example: Master Bedroom Wardrobe</h2>
          
          <div className="space-y-6 mb-8">
            <div className="bg-yellow-50 p-4 rounded border-l-4 border-yellow-400">
              <h3 className="font-bold mb-3">Budget Option (2m Hinged)</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Basic cabinet unit:</span><span>£600</span></div>
                <div className="flex justify-between"><span>Hinged doors & hardware:</span><span>£200</span></div>
                <div className="flex justify-between"><span>Basic shelving:</span><span>£100</span></div>
                <div className="flex justify-between"><span>Labour (1 day):</span><span>£140</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£1,040</span></div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-400">
              <h3 className="font-bold mb-3">Standard Option (2.5m Sliding Doors)</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Quality cabinet units:</span><span>£1,400</span></div>
                <div className="flex justify-between"><span>Sliding door mechanism & doors:</span><span>£500</span></div>
                <div className="flex justify-between"><span>Shelving & hanging rails:</span><span>£300</span></div>
                <div className="flex justify-between"><span>Labour (1.5 days):</span><span>£280</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£2,480</span></div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded border-l-4 border-green-400">
              <h3 className="font-bold mb-3">Premium Option (3m Floor-to-Ceiling with Lighting)</h3>
              <div className="space-y-1 text-sm text-slate-700">
                <div className="flex justify-between"><span>Premium cabinet system:</span><span>£2,400</span></div>
                <div className="flex justify-between"><span>Sliding doors (premium):</span><span>£900</span></div>
                <div className="flex justify-between"><span>Internal lighting (LED):</span><span>£400</span></div>
                <div className="flex justify-between"><span>Premium shelving & organizers:</span><span>£600</span></div>
                <div className="flex justify-between"><span>Labour (2 days, careful work):</span><span>£480</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total:</span><span>£4,780</span></div>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">Customisation Options & Costs</h2>
          
          <div className="space-y-3 text-sm text-slate-700 mb-6">
            <div><strong>Shelving configuration:</strong> Basic fixed shelves included. Adjustable shelving: +£100-300</div>
            <div><strong>Hanging rails:</strong> Standard rail included. Multiple rails/levels: +£100-200</div>
            <div><strong>Internal lighting:</strong> LED strip lights: +£200-400 (material + labour)</div>
            <div><strong>Drawer units:</strong> Each drawer: +£80-200 depending on size/quality</div>
            <div><strong>Mirrors (internal):</strong> Door mirrors: +£100-300</div>
            <div><strong>Tie/belt racks:</strong> Pull-out racks: +£50-100 each</div>
            <div><strong>Soft-close mechanisms:</strong> Doors/drawers: +£200-400</div>
            <div><strong>Integrated safe/lock:</strong> Hidden safe: +£400-800</div>
          </div>

          <h2 className="text-2xl font-bold mb-4 mt-8">What Affects Cost?</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>Wall condition:</strong> Uneven walls need levelling (adds time/cost)</li>
            <li><strong>Alcoves/irregular shapes:</strong> Complex shapes increase design and labour cost</li>
            <li><strong>Ceiling height variation:</strong> Sloped ceilings in lofts need custom work (premium cost)</li>
            <li><strong>Plumbing/electrical:</strong> If pipes/wiring in the way, adds cost and complexity</li>
            <li><strong>Material choice:</strong> Veneer vs solid wood, particle board vs MDF—huge cost difference</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Common Misunderstandings</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li><strong>"Sliding doors are luxury":</strong> Not really—they're often better value for small rooms</li>
            <li><strong>"Hinged doors are standard":</strong> True, but they need floor swing space</li>
            <li><strong>"Internal lighting is unnecessary":</strong> Actually very useful and affordable</li>
            <li><strong>"All wardrobes are the same cost per metre":</strong> Varies hugely by materials and complexity</li>
          </ul>

          <h2 className="text-2xl font-bold mb-4 mt-8">Red Flags</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
            <li>Quote doesn't specify materials (particle board, MDF, solid wood)</li>
            <li>Doesn't mention door type (hinged vs sliding) or mechanism</li>
            <li>Labour time unrealistically low (fitting takes proper time)</li>
            <li>No design consultation mentioned (bespoke work needs planning)</li>
          </ul>
        </div>

        <div className="bg-slate-50 rounded-lg p-8 mt-12">
          <h3 className="text-xl font-bold mb-4">Related</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/calculators" className="text-blue-600 hover:text-blue-700 font-semibold">
              → Cost Calculators
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
