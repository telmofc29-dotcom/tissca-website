'use client';
import { useState } from 'react';
import CalculatorLayout, { ResultCard, InputWrapper, FormSection, ResultsGrid } from '@/components/CalculatorLayout';
import { calculatePlastering } from '@/utils/calculations';
export default function PlasteringCalculator() {
  const [area, setArea] = useState(100);
  const [thickness, setThickness] = useState(2);
  const [productYield, setProductYield] = useState(10);
  const [wastage, setWastage] = useState(10);
  const [includeBonding, setIncludeBonding] = useState(false);
  const [bondingThickness, setBondingThickness] = useState(10);
  const [bondingYield, setBondingYield] = useState(2.5);
  const [waterPerBag, setWaterPerBag] = useState(11.5);
  const result = calculatePlastering({ area, thickness, productYield, wastage, includeBonding, bondingThickness, bondingYield, waterPerBag });
  return (
    <CalculatorLayout title="Plastering Calculator" subtitle="Calculate plaster bags and water needed for skim coating and bonding coats" exampleTitle="100 m² skim coat project" exampleInputs="Area: 100 m²\nThickness: 2mm (skim)\nProduct yield: 10 m² per bag\nWastage: 10%" exampleOutputs="Bags required: 11\nWater needed: 126.5 litres" howToUse={['Measure total area to be plastered', 'Set thickness: 2mm for skim, 10-15mm for bonding', 'Enter product yield from bag label', 'Account for 10% wastage (over-mixing, equipment loss)', 'Enable bonding coat toggle if needed', 'Calculate water volume for mixing']} relatedGuides={[{ title: 'Plastering Techniques', href: '/guides' }, { title: 'Drying Times', href: '/guides' }, { title: 'Finish Types', href: '/guides' }]}>
      <FormSection title="Skim Coat Specification" description="Enter area and thickness">
        <InputWrapper label="Area to plaster" hint="Total wall/ceiling area">
          <div className="flex gap-2">
            <input type="number" value={area} onChange={(e) => setArea(parseFloat(e.target.value) || 0)} step="1" min="0.1" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 100" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m²</span>
          </div>
        </InputWrapper>
        <InputWrapper label="Skim coat thickness" hint="Typically 2mm">
          <div className="flex gap-2">
            <input type="number" value={thickness} onChange={(e) => setThickness(parseFloat(e.target.value) || 0)} step="0.5" min="1" max="10" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 2" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">mm</span>
          </div>
        </InputWrapper>
        <InputWrapper label="Product yield" hint="From bag label - typically 10 m² per 25kg at 2mm">
          <div className="flex gap-2">
            <input type="number" value={productYield} onChange={(e) => setProductYield(parseFloat(e.target.value) || 0)} step="0.5" min="0.5" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 10" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m²/bag</span>
          </div>
        </InputWrapper>
        <InputWrapper label="Wastage" hint="Mix losses and equipment - typically 10%">
          <div className="flex gap-2">
            <input type="number" value={wastage} onChange={(e) => setWastage(parseFloat(e.target.value) || 0)} step="1" min="0" max="30" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 10" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">%</span>
          </div>
        </InputWrapper>
        <InputWrapper label="Water per bag" hint="Check product - typically 11-12 litres per 25kg">
          <div className="flex gap-2">
            <input type="number" value={waterPerBag} onChange={(e) => setWaterPerBag(parseFloat(e.target.value) || 0)} step="0.1" min="1" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 11.5" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">L/bag</span>
          </div>
        </InputWrapper>
      </FormSection>
      <FormSection title="Bonding Coat (Optional)">
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <input type="checkbox" id="bonding" checked={includeBonding} onChange={(e) => setIncludeBonding(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
          <label htmlFor="bonding" className="text-sm font-medium text-slate-900">Calculate bonding coat (for damaged or uneven surfaces)</label>
        </div>
        {includeBonding && (
          <>
            <InputWrapper label="Bonding thickness" hint="Typically 10-15mm">
              <div className="flex gap-2">
                <input type="number" value={bondingThickness} onChange={(e) => setBondingThickness(parseFloat(e.target.value) || 0)} step="1" min="5" max="30" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 10" />
                <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">mm</span>
              </div>
            </InputWrapper>
            <InputWrapper label="Bonding yield" hint="Typically 2.5 m² per 25kg at 10mm">
              <div className="flex gap-2">
                <input type="number" value={bondingYield} onChange={(e) => setBondingYield(parseFloat(e.target.value) || 0)} step="0.5" min="0.5" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 2.5" />
                <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m²/bag</span>
              </div>
            </InputWrapper>
          </>
        )}
      </FormSection>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Results</h2>
        <ResultsGrid columns={2}>
          <ResultCard label="Adjusted Area" value={`${result.adjustedArea}`} unit="m²" />
          <ResultCard label="Bags Required" value={`${result.bagsRequired}`} highlighted icon="📦" />
          <ResultCard label="Water Needed" value={`${result.waterLitres}`} unit="litres" />
          {includeBonding && (<ResultCard label="Bonding Bags" value={`${result.bondingBags}`} highlighted icon="📦" />)}
        </ResultsGrid>
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900"><span className="font-semibold">💧 Water Note:</span> Use clean water at room temperature. Mix thoroughly to correct consistency. Better to use slightly more water and have loose mix than too stiff.</p>
        </div>
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-900"><span className="font-semibold">⏱️ Drying Tip:</span> Skim coats typically dry in 24-48 hours depending on temperature and humidity. Don't paint or sand until fully dry.</p>
        </div>
      </div>
    </CalculatorLayout>
  );
}
