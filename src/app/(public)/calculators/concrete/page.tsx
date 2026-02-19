'use client';
import { useState } from 'react';
import CalculatorLayout, { ResultCard, InputWrapper, FormSection, ResultsGrid } from '@/components/CalculatorLayout';
import { calculateConcrete } from '@/utils/calculations';
export default function ConcreteCalculator() {
  const [shape, setShape] = useState<'slab' | 'footing' | 'post-holes'>('slab');
  const [length, setLength] = useState(5);
  const [width, setWidth] = useState(4);
  const [depth, setDepth] = useState(100);
  const [numHoles, setNumHoles] = useState(4);
  const [holeDiameter, setHoleDiameter] = useState(200);
  const [waste, setWaste] = useState(10);
  const [bagYield] = useState(0.012);
  const [mixOnSite, setMixOnSite] = useState(false);
  const result = calculateConcrete({shape, length: shape !== 'post-holes' ? length : undefined, width: shape !== 'post-holes' ? width : undefined, depth, numHoles: shape === 'post-holes' ? numHoles : undefined, holeDiameter: shape === 'post-holes' ? holeDiameter : undefined, waste, bagYield});
  return (
    <CalculatorLayout title="Concrete Calculator" subtitle="Calculate concrete volume and bags needed for slabs, footings, and post holes" exampleTitle="5m × 4m concrete slab at 100mm depth" exampleInputs="Shape: Slab\nDimensions: 5m × 4m × 100mm\nWaste: 10%" exampleOutputs="Volume: 2.2 m³\nBags (25kg): 184\nMix (1:2:4): Cement 570kg, Sand 3.08 m³, Aggregate 6.16 m³" howToUse={['Select shape: slab, footing, or post holes', 'Enter dimensions in meters or millimeters as shown', 'Specify concrete depth/diameter', 'Account for waste (10-15% typical)', 'Choose between pre-mix bags or mix on-site', 'Review material requirements']} relatedGuides={[{ title: 'Concrete Finishing', href: '/guides' }, { title: 'Curing & Drying Times', href: '/guides' }, { title: 'Concrete Mix Ratios', href: '/guides' }]}>
      <FormSection title="Shape Selection">
        <div className="flex gap-3 mb-6">
          {(['slab', 'footing', 'post-holes'] as const).map((s) => (
            <button key={s} onClick={() => setShape(s)} className={`px-4 py-2 rounded-lg font-medium transition-all ${shape === s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-slate-900 hover:bg-gray-300'}`}>
              {s === 'slab' && '📐 Slab'} {s === 'footing' && '🏗️ Footing'} {s === 'post-holes' && '⚫ Post Holes'}
            </button>
          ))}
        </div>
      </FormSection>
      <FormSection title="Dimensions" description="Enter concrete area and depth">
        {shape !== 'post-holes' && (
          <>
            <InputWrapper label="Length" hint="In meters">
              <div className="flex gap-2">
                <input type="number" value={length} onChange={(e) => setLength(parseFloat(e.target.value) || 0)} step="0.1" min="0.1" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 5" />
                <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m</span>
              </div>
            </InputWrapper>
            <InputWrapper label="Width" hint="In meters">
              <div className="flex gap-2">
                <input type="number" value={width} onChange={(e) => setWidth(parseFloat(e.target.value) || 0)} step="0.1" min="0.1" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 4" />
                <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m</span>
              </div>
            </InputWrapper>
            <InputWrapper label="Depth" hint="In millimeters">
              <div className="flex gap-2">
                <input type="number" value={depth} onChange={(e) => setDepth(parseFloat(e.target.value) || 0)} step="10" min="50" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 100" />
                <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">mm</span>
              </div>
            </InputWrapper>
          </>
        )}
        {shape === 'post-holes' && (
          <>
            <InputWrapper label="Number of post holes">
              <div className="flex gap-2">
                <input type="number" value={numHoles} onChange={(e) => setNumHoles(parseFloat(e.target.value) || 0)} step="1" min="1" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 4" />
                <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">holes</span>
              </div>
            </InputWrapper>
            <InputWrapper label="Post hole diameter" hint="In millimeters">
              <div className="flex gap-2">
                <input type="number" value={holeDiameter} onChange={(e) => setHoleDiameter(parseFloat(e.target.value) || 0)} step="10" min="50" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 200" />
                <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">mm</span>
              </div>
            </InputWrapper>
            <InputWrapper label="Hole depth" hint="In millimeters">
              <div className="flex gap-2">
                <input type="number" value={depth} onChange={(e) => setDepth(parseFloat(e.target.value) || 0)} step="10" min="100" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 600" />
                <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">mm</span>
              </div>
            </InputWrapper>
          </>
        )}
      </FormSection>
      <FormSection title="Mix Options">
        <InputWrapper label="Waste allowance" hint="10-15% typical">
          <div className="flex gap-2">
            <input type="number" value={waste} onChange={(e) => setWaste(parseFloat(e.target.value) || 0)} step="1" min="0" max="30" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 10" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">%</span>
          </div>
        </InputWrapper>
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <input type="checkbox" id="mixonsite" checked={mixOnSite} onChange={(e) => setMixOnSite(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
          <label htmlFor="mixonsite" className="text-sm font-medium text-slate-900">Show mix on-site breakdown</label>
        </div>
      </FormSection>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Results</h2>
        <ResultsGrid columns={2}>
          <ResultCard label="Volume" value={`${result.volumeM3}`} unit="m³" />
          <ResultCard label="Volume (incl. waste)" value={`${result.volumeIncWaste}`} unit="m³" />
          <ResultCard label="Bags Required" value={`${result.bagsRequired}`} highlighted icon="📦" />
        </ResultsGrid>
        {mixOnSite && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-slate-900 mb-3">Mix On-Site Breakdown (1:2:4 Ratio)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-white rounded border border-green-200">
                <p className="text-xs text-gray-600 mb-1">Cement</p>
                <p className="text-lg font-bold text-slate-900">{result.mixOnSite.cementKg} kg</p>
              </div>
              <div className="p-3 bg-white rounded border border-green-200">
                <p className="text-xs text-gray-600 mb-1">Sand</p>
                <p className="text-lg font-bold text-slate-900">{result.mixOnSite.sandM3} m³</p>
              </div>
              <div className="p-3 bg-white rounded border border-green-200">
                <p className="text-xs text-gray-600 mb-1">Aggregate</p>
                <p className="text-lg font-bold text-slate-900">{result.mixOnSite.aggregateM3} m³</p>
              </div>
            </div>
          </div>
        )}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-900"><span className="font-semibold">⏱️ Curing Tip:</span> Concrete takes 28 days to fully cure. Protect from weather and foot traffic for at least 48 hours.</p>
        </div>
      </div>
    </CalculatorLayout>
  );
}
