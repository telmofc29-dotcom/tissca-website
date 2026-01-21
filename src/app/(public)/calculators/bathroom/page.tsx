'use client';
import { useState } from 'react';
import Link from 'next/link';
import CalculatorLayout, { ResultCard, InputWrapper, FormSection, ResultsGrid } from '@/components/CalculatorLayout';
import { calculateBathroom } from '@/utils/calculations';
import { pricingModeDescriptions, pricingDisclaimer, type PricingMode } from '@/config/pricing';

export default function BathroomCalculator() {
  const [floorArea, setFloorArea] = useState(4.5);
  const [wallTilingArea, setWallTilingArea] = useState(10);
  const [fixtureCount, setFixtureCount] = useState(4);
  const [pricingMode, setPricingMode] = useState<PricingMode>('standard');

  const result = calculateBathroom({floorArea, wallTilingArea, fixtureCount, pricingMode});

  return (
    <CalculatorLayout title="Bathroom Renovation Calculator" subtitle="Estimate labour for professional bathroom renovation and installation" exampleTitle="Standard 4.5 m² bathroom with tiling" exampleInputs="Floor area: 4.5 m²\nWall tiling: 10 m²\nFixtures: 4 (toilet, sink, shower, etc.)\nPricing: Standard" exampleOutputs="Estimated labour: 3.8 days\nLabour cost: £646" howToUse={['Measure bathroom floor area in m²', 'Estimate wall tiling area including splashbacks', 'Count fixtures: toilet, sink, shower, radiator, etc.', 'Select pricing mode reflecting quality expectations', 'Budget mode: standard suite, simple tiling', 'Premium mode: wet room, specialist finishes, meticulous work']} relatedGuides={[{ title: 'Bathroom Design Ideas', href: '/guides' }, { title: 'Tiling Guide', href: '/guides' }, { title: 'Plumbing & Electrics', href: '/guides' }]}>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-amber-900"><span className="font-semibold">ℹ️ Professional Benchmark:</span> {pricingDisclaimer}</p>
      </div>

      <FormSection title="Bathroom Specifications" description="Enter room size and components">
        <InputWrapper label="Floor area" hint="Length × Width">
          <div className="flex gap-2">
            <input type="number" value={floorArea} onChange={(e) => setFloorArea(parseFloat(e.target.value) || 0)} step="0.1" min="0.5" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 4.5" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m²</span>
          </div>
        </InputWrapper>

        <InputWrapper label="Wall tiling area" hint="All walls including splashbacks">
          <div className="flex gap-2">
            <input type="number" value={wallTilingArea} onChange={(e) => setWallTilingArea(parseFloat(e.target.value) || 0)} step="0.1" min="1" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 10" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m²</span>
          </div>
        </InputWrapper>

        <InputWrapper label="Fixtures to install" hint="Toilet, sink, shower, radiator, etc.">
          <input type="number" value={fixtureCount} onChange={(e) => setFixtureCount(parseFloat(e.target.value) || 0)} step="1" min="1" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 4" />
        </InputWrapper>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900 font-semibold mb-2">📏 Estimation Notes</p>
          <ul className="text-sm text-blue-900 space-y-1">
            <li>• Budget: standard suite, basic tiling, simple layouts</li>
            <li>• Standard: typical renovation, good quality, standard pace</li>
            <li>• Premium: wet room, complex tiling, bespoke work, meticulous finishes</li>
          </ul>
        </div>
      </FormSection>

      <FormSection title="Pricing Mode" description="Reflects quality, materials, and timeline">
        <div className="space-y-3">
          {(['budget', 'standard', 'premium'] as const).map((m) => (
            <button key={m} onClick={() => setPricingMode(m)} className={`w-full p-4 text-left rounded-lg border-2 transition-all ${pricingMode === m ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
              <p className="font-semibold text-slate-900 capitalize">{m === 'budget' ? '💷 Budget' : m === 'premium' ? '✨ Premium Benchmark' : '= Standard'}</p>
              <p className="text-xs text-gray-600 mt-1">{pricingModeDescriptions[m]}</p>
            </button>
          ))}
        </div>
      </FormSection>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Labour Estimate</h2>
        <ResultsGrid columns={2}>
          <ResultCard label="Estimated Days" value={`${result.estimatedDays}`} unit="days" highlighted icon="📅" />
          <ResultCard label="Labour Cost" value={`£${result.labourCost.toLocaleString()}`} highlighted icon="💷" />
        </ResultsGrid>

        <div className="mt-6">
          <Link href="/docs/quote" className="block w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold text-center mb-4">
            + Generate Quote from Results
          </Link>
        </div>

        <div className="mt-4 space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-900 font-semibold mb-2">✓ Labour Includes</p>
            <ul className="text-sm text-green-900 space-y-1">
              <li>• Removal of old suite and finishes</li>
              <li>• Wall and floor preparation</li>
              <li>• Tiling installation and grouting</li>
              <li>• Fixture installation and connections</li>
              <li>• Waterproofing and sealant application</li>
              <li>• Testing and final adjustments</li>
            </ul>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900 font-semibold mb-2">⚠️ Not Included</p>
            <ul className="text-sm text-amber-900 space-y-1">
              <li>• Major structural work or demolition</li>
              <li>• Specialist plumbing/electrical (separate quotes)</li>
              <li>• Damp treatment or waterproofing repairs</li>
              <li>• Supply of materials</li>
            </ul>
          </div>
        </div>
      </div>
    </CalculatorLayout>
  );
}
