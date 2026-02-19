'use client';
import { useState } from 'react';
import CalculatorLayout, { ResultCard, InputWrapper, FormSection, ResultsGrid } from '@/components/CalculatorLayout';
import { calculateInsulation } from '@/utils/calculations';
export default function InsulationCalculator() {
  const [area, setArea] = useState(100);
  const [packCoverage, setPackCoverage] = useState(5.5);
  const [waste, setWaste] = useState(5);
  const [thickness, setThickness] = useState(100);
  const result = calculateInsulation({area, packCoverage, waste});
  return (
    <CalculatorLayout title="Insulation Calculator" subtitle="Calculate insulation packs needed for walls, roofs, and floors" exampleTitle="100 m² wall insulation at 100mm thickness" exampleInputs="Area: 100 m²\nThickness: 100mm\nPack coverage: 5.5 m² per pack\nWaste: 5%" exampleOutputs="Packs required: 20" howToUse={['Measure total area to be insulated', 'Select insulation thickness (50-150mm typical)', 'Enter pack coverage from product label', 'Account for 5% waste (cutting, edge pieces)', 'Ensure proper ventilation gaps are left', 'Check local building regulations for min. R-value']} relatedGuides={[{ title: 'Insulation Types & Benefits', href: '/guides' }, { title: 'Vapour Barriers', href: '/guides' }, { title: 'Condensation Prevention', href: '/guides' }]}>
      <FormSection title="Project Specifications" description="Enter area and thickness">
        <InputWrapper label="Area to insulate" hint="Total wall/roof/floor area">
          <div className="flex gap-2">
            <input type="number" value={area} onChange={(e) => setArea(parseFloat(e.target.value) || 0)} step="1" min="1" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 100" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m²</span>
          </div>
        </InputWrapper>
        <InputWrapper label="Insulation thickness" hint="Common: 50mm, 75mm, 100mm, 150mm">
          <div className="flex gap-3 flex-wrap">
            {[50, 75, 100, 150].map((t) => (
              <button key={t} onClick={() => setThickness(t)} className={`px-3 py-2 rounded-lg font-medium transition-all ${thickness === t ? 'bg-blue-600 text-white' : 'bg-gray-200 text-slate-900 hover:bg-gray-300'}`}>
                {t}mm
              </button>
            ))}
          </div>
        </InputWrapper>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mt-4">
          <p className="text-sm text-blue-900"><span className="font-semibold">R-Value Guide:</span></p>
          <ul className="text-sm text-blue-900 mt-2 space-y-1">
            <li>• 50mm ≈ R-1.5 to R-2</li>
            <li>• 100mm ≈ R-3 to R-4</li>
            <li>• 150mm ≈ R-4.5 to R-6</li>
          </ul>
        </div>
      </FormSection>
      <FormSection title="Product Coverage" description="From insulation pack label">
        <InputWrapper label="Pack coverage" hint="Typically 5-6 m² per pack at standard thickness">
          <div className="flex gap-2">
            <input type="number" value={packCoverage} onChange={(e) => setPackCoverage(parseFloat(e.target.value) || 0)} step="0.5" min="1" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 5.5" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m²/pack</span>
          </div>
        </InputWrapper>
        <InputWrapper label="Waste allowance" hint="5-10% for cutting and fitting">
          <div className="flex gap-2">
            <input type="number" value={waste} onChange={(e) => setWaste(parseFloat(e.target.value) || 0)} step="1" min="0" max="20" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 5" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">%</span>
          </div>
        </InputWrapper>
      </FormSection>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Results</h2>
        <ResultsGrid columns={2}>
          <ResultCard label="Area (incl. waste)" value={`${result.areaIncWaste}`} unit="m²" />
          <ResultCard label="Packs Required" value={`${result.packsRequired}`} highlighted icon="📦" />
        </ResultsGrid>
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 mb-2">💨 Ventilation</p>
            <p className="text-sm text-blue-900">Always leave appropriate ventilation gaps behind insulation. Check product instructions for specific requirements.</p>
          </div>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-semibold text-green-900 mb-2">✓ Vapour Barrier</p>
            <p className="text-sm text-green-900">Most insulation requires a vapour barrier. Check if your product includes one or if you need to add separate membrane.</p>
          </div>
        </div>
      </div>
    </CalculatorLayout>
  );
}
