'use client';
import { useState } from 'react';
import CalculatorLayout, { ResultCard, InputWrapper, FormSection, ResultsGrid } from '@/components/CalculatorLayout';
import { calculateFlooring } from '@/utils/calculations';
export default function FlooringCalculator() {
  const [length, setLength] = useState(5);
  const [width, setWidth] = useState(4);
  const [waste, setWaste] = useState(10);
  const [packCoverage, setPackCoverage] = useState(1.8);
  const [underlayPackCoverage, setUnderlayPackCoverage] = useState(15);
  const result = calculateFlooring({ length, width, waste, packCoverage, underlayPackCoverage });
  return (
    <CalculatorLayout title="Flooring Calculator" subtitle="Calculate flooring packs, underlay, and trims needed for your project" exampleTitle="20 m² living room with laminate" exampleInputs="Room: 5m × 4m\nPack coverage: 1.8 m² per pack\nWaste: 10%\nUnderlay coverage: 15 m² per pack" exampleOutputs="Flooring packs: 13\nUnderlay packs: 1\nPerimeter for trims: 18m" howToUse={['Measure room length and width in meters', 'Enter pack coverage from flooring product label', 'Account for 10% waste (cutting, fitting, edge pieces)', 'Include underlay packs for comfort and noise reduction', 'Note perimeter for calculating trim requirements', 'Add expansion gap (typically 10-15mm) around walls']} relatedGuides={[{ title: 'Flooring Installation Guide', href: '/guides' }, { title: 'Subfloor Preparation', href: '/guides' }, { title: 'Expansion Gaps & Movement', href: '/guides' }]}>
      <FormSection title="Room Dimensions" description="Enter length and width">
        <InputWrapper label="Room length" hint="In meters">
          <div className="flex gap-2">
            <input type="number" value={length} onChange={(e) => setLength(parseFloat(e.target.value) || 0)} step="0.1" min="0.5" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 5" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m</span>
          </div>
        </InputWrapper>
        <InputWrapper label="Room width" hint="In meters">
          <div className="flex gap-2">
            <input type="number" value={width} onChange={(e) => setWidth(parseFloat(e.target.value) || 0)} step="0.1" min="0.5" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 4" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m</span>
          </div>
        </InputWrapper>
      </FormSection>
      <FormSection title="Material Specifications" description="Product coverage rates">
        <InputWrapper label="Flooring pack coverage" hint="From product label - typically 1.5-2.5 m²">
          <div className="flex gap-2">
            <input type="number" value={packCoverage} onChange={(e) => setPackCoverage(parseFloat(e.target.value) || 0)} step="0.1" min="0.5" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 1.8" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m²/pack</span>
          </div>
        </InputWrapper>
        <InputWrapper label="Underlay pack coverage" hint="Typically 10-20 m² per pack">
          <div className="flex gap-2">
            <input type="number" value={underlayPackCoverage} onChange={(e) => setUnderlayPackCoverage(parseFloat(e.target.value) || 0)} step="1" min="5" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 15" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m²/pack</span>
          </div>
        </InputWrapper>
        <InputWrapper label="Waste allowance" hint="10-15% for straight layout, 20%+ for irregular">
          <div className="flex gap-2">
            <input type="number" value={waste} onChange={(e) => setWaste(parseFloat(e.target.value) || 0)} step="1" min="0" max="30" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 10" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">%</span>
          </div>
        </InputWrapper>
      </FormSection>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Results</h2>
        <ResultsGrid columns={2}>
          <ResultCard label="Room Area" value={`${result.roomArea}`} unit="m²" />
          <ResultCard label="Area (incl. waste)" value={`${result.areaIncWaste}`} unit="m²" />
          <ResultCard label="Flooring Packs" value={`${result.packsRequired}`} highlighted icon="📦" />
          <ResultCard label="Underlay Packs" value={`${result.underlayPacksRequired}`} highlighted icon="📦" />
          <ResultCard label="Perimeter" value={`${result.perimeter}`} unit="m" icon="📏" />
        </ResultsGrid>
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900 font-semibold mb-2">📏 Expansion Gap</p>
          <p className="text-sm text-blue-900">Leave 10-15mm expansion gap around all perimeter walls. This accounts for natural expansion and contraction due to temperature and humidity changes. Never install flooring without this gap - it can cause buckling.</p>
        </div>
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-900"><span className="font-semibold">✓ Underlay Benefits:</span> Improves comfort, reduces noise, provides moisture barrier, and extends flooring life. Always use appropriate underlay for your specific flooring type.</p>
        </div>
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-900"><span className="font-semibold">💡 Pro Tip:</span> Perimeter length helps you order trim/skirting boards. Allow extra for joinery corners and transitions.</p>
        </div>
      </div>
    </CalculatorLayout>
  );
}
