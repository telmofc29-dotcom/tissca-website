'use client';
import { useState } from 'react';
import Link from 'next/link';
import CalculatorLayout, { ResultCard, InputWrapper, FormSection, ResultsGrid } from '@/components/CalculatorLayout';
import { calculateWardrobe } from '@/utils/calculations';
import { pricingModeDescriptions, pricingDisclaimer, type PricingMode } from '@/config/pricing';

export default function WardrobeCalculator() {
  const [linearMetres, setLinearMetres] = useState(4);
  const [doorCount, setDoorCount] = useState(4);
  const [drawerCount, setDrawerCount] = useState(4);
  const [hasLighting, setHasLighting] = useState(false);
  const [pricingMode, setPricingMode] = useState<PricingMode>('standard');

  const result = calculateWardrobe({linearMetres, doorCount, drawerCount, hasLighting, pricingMode});

  return (
    <CalculatorLayout title="Wardrobe Installation Calculator" subtitle="Estimate labour for built-in wardrobe and joinery installation" exampleTitle="4m wardrobe with 4 doors and 4 drawers" exampleInputs="Linear metres: 4\nDoors: 4\nDrawers: 4\nLighting: No\nPricing: Standard" exampleOutputs="Estimated labour: 2.4 days\nLabour cost: £372" howToUse={['Measure total linear metres of wardrobe run', 'Count door and drawer units', 'Select if lighting will be installed', 'Choose pricing mode (Budget/Standard/Premium)', 'Budget mode: straight walls, standard fittings', 'Premium mode: angles, sloped ceilings, bespoke doors']} relatedGuides={[{ title: 'Built-in Wardrobe Design', href: '/guides' }, { title: 'Door Options & Hinges', href: '/guides' }, { title: 'Internal Storage Solutions', href: '/guides' }]}>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-amber-900"><span className="font-semibold">ℹ️ Professional Benchmark:</span> {pricingDisclaimer}</p>
      </div>

      <FormSection title="Wardrobe Specifications" description="Enter dimensions and components">
        <InputWrapper label="Linear metres" hint="Total run length along wall">
          <div className="flex gap-2">
            <input type="number" value={linearMetres} onChange={(e) => setLinearMetres(parseFloat(e.target.value) || 0)} step="0.1" min="0.5" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 4" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m</span>
          </div>
        </InputWrapper>

        <InputWrapper label="Door units" hint="Number of doors to hang">
          <input type="number" value={doorCount} onChange={(e) => setDoorCount(parseFloat(e.target.value) || 0)} step="1" min="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 4" />
        </InputWrapper>

        <InputWrapper label="Drawers" hint="Number of drawer units">
          <input type="number" value={drawerCount} onChange={(e) => setDrawerCount(parseFloat(e.target.value) || 0)} step="1" min="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 4" />
        </InputWrapper>

        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <input type="checkbox" id="lighting" checked={hasLighting} onChange={(e) => setHasLighting(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
          <label htmlFor="lighting" className="text-sm font-medium text-slate-900">LED lighting installation (internal shelves)</label>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900 font-semibold mb-2">📏 Estimation Notes</p>
          <ul className="text-sm text-blue-900 space-y-1">
            <li>• Budget: straight walls, standard hinges, basic shelving</li>
            <li>• Standard: typical room layout, quality fittings</li>
            <li>• Premium: angles, sloped ceilings, bespoke doors, soft-close</li>
          </ul>
        </div>
      </FormSection>

      <FormSection title="Pricing Mode" description="Reflects quality, fittings, and complexity">
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
              <li>• Frame assembly and levelling</li>
              <li>• Door hanging and adjustment</li>
              <li>• Drawer installation and testing</li>
              <li>• Interior shelving installation</li>
              <li>• Hardware fitting (handles, hinges, etc.)</li>
              <li>• Lighting installation (if selected)</li>
              <li>• Final adjustments and finishes</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 font-semibold mb-2">ℹ️ Not Included</p>
            <ul className="text-sm text-blue-900 space-y-1">
              <li>• Wall preparation or decoration</li>
              <li>• Bespoke door manufacturing</li>
              <li>• Supply of materials and fixtures</li>
              <li>• Specialist electrical work (lighting circuits)</li>
            </ul>
          </div>
        </div>
      </div>
    </CalculatorLayout>
  );
}
