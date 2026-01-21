'use client';
import { useState } from 'react';
import CalculatorLayout, { ResultCard, InputWrapper, FormSection, ResultsGrid } from '@/components/CalculatorLayout';
import { calculateBrickBlock } from '@/utils/calculations';
export default function BrickBlockCalculator() {
  const [length, setLength] = useState(10);
  const [height, setHeight] = useState(3);
  const [openingsArea, setOpeningsArea] = useState(2);
  const [unitType, setUnitType] = useState<'brick' | 'block'>('brick');
  const [unitsPerSqm, setUnitsPerSqm] = useState(60);
  const [mortarLitresPerSqm, setMortarLitresPerSqm] = useState(12);
  const [waste, setWaste] = useState(10);
  const result = calculateBrickBlock({length, height, openingsArea, unitType, unitsPerSqm, mortarLitresPerSqm, waste});
  const handleUnitTypeChange = (type: 'brick' | 'block') => {
    setUnitType(type);
    if (type === 'brick') { setUnitsPerSqm(60); setMortarLitresPerSqm(12); }
    else { setUnitsPerSqm(10); setMortarLitresPerSqm(7); }
  };
  return (
    <CalculatorLayout title="Brick & Block Calculator" subtitle="Calculate bricks, blocks, and mortar needed for walls and structures" exampleTitle="10m × 3m brick wall with 2 m² openings" exampleInputs="Wall: 10m × 3m (30 m² net after openings)\nUnit type: Brick\nWaste: 10%" exampleOutputs="Bricks: 1980\nMortar: 336 litres" howToUse={['Select brick or block as your masonry unit', 'Enter wall length and height in meters', 'Subtract door and window opening areas', 'Set units per m² and mortar coverage', 'Account for 10-15% waste (breakage, cutting)', 'Calculate total material requirements']} relatedGuides={[{ title: 'Brick Bonding Patterns', href: '/guides' }, { title: 'Mortar Mix Ratios', href: '/guides' }, { title: 'Pointing Techniques', href: '/guides' }]}>
      <FormSection title="Unit Type" description="Select brick or block">
        <div className="flex gap-3 mb-6">
          {(['brick', 'block'] as const).map((type) => (
            <button key={type} onClick={() => handleUnitTypeChange(type)} className={`px-6 py-3 rounded-lg font-semibold transition-all ${unitType === type ? 'bg-blue-600 text-white' : 'bg-gray-200 text-slate-900 hover:bg-gray-300'}`}>
              {type === 'brick' ? '🧱 Bricks' : '⬚ Blocks'}
            </button>
          ))}
        </div>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900"><span className="font-semibold">Standard dimensions:</span></p>
          <p className="text-sm text-blue-900 mt-1">{unitType === 'brick' ? 'Brick: 215 × 102.5 × 65mm (~60 per m²)' : 'Block: 440 × 215 × 100mm (~10 per m²)'}</p>
        </div>
      </FormSection>
      <FormSection title="Wall Dimensions" description="Enter wall size and openings">
        <InputWrapper label="Wall length" hint="In meters">
          <div className="flex gap-2">
            <input type="number" value={length} onChange={(e) => setLength(parseFloat(e.target.value) || 0)} step="0.1" min="1" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 10" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m</span>
          </div>
        </InputWrapper>
        <InputWrapper label="Wall height" hint="In meters">
          <div className="flex gap-2">
            <input type="number" value={height} onChange={(e) => setHeight(parseFloat(e.target.value) || 0)} step="0.1" min="1" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 3" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m</span>
          </div>
        </InputWrapper>
        <InputWrapper label="Total opening area" required={false} hint="Doors, windows, vents combined">
          <div className="flex gap-2">
            <input type="number" value={openingsArea} onChange={(e) => setOpeningsArea(parseFloat(e.target.value) || 0)} step="0.1" min="0" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 2" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m²</span>
          </div>
        </InputWrapper>
      </FormSection>
      <FormSection title="Material Specifications" description="Units per m² and mortar coverage">
        <InputWrapper label="Units per m²" hint="Bricks: 60, Blocks: 10">
          <div className="flex gap-2">
            <input type="number" value={unitsPerSqm} onChange={(e) => setUnitsPerSqm(parseFloat(e.target.value) || 1)} step="1" min="1" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 60" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">units/m²</span>
          </div>
        </InputWrapper>
        <InputWrapper label="Mortar coverage" hint="Bricks: 12L/m², Blocks: 7L/m²">
          <div className="flex gap-2">
            <input type="number" value={mortarLitresPerSqm} onChange={(e) => setMortarLitresPerSqm(parseFloat(e.target.value) || 1)} step="0.5" min="1" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 12" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">L/m²</span>
          </div>
        </InputWrapper>
        <InputWrapper label="Waste allowance" hint="10-15% typical for breakage and cutting">
          <div className="flex gap-2">
            <input type="number" value={waste} onChange={(e) => setWaste(parseFloat(e.target.value) || 0)} step="1" min="0" max="30" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 10" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">%</span>
          </div>
        </InputWrapper>
      </FormSection>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Results</h2>
        <ResultsGrid columns={2}>
          <ResultCard label="Net Wall Area" value={`${result.netArea}`} unit="m²" />
          <ResultCard label={unitType === 'brick' ? 'Bricks Needed' : 'Blocks Needed'} value={`${result.unitsNeeded}`} highlighted icon={unitType === 'brick' ? '🧱' : '⬚'} />
          <ResultCard label="Mortar Required" value={`${result.mortarLitres}`} unit="litres" highlighted icon="🏗️" />
        </ResultsGrid>
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-semibold text-green-900 mb-2">🧪 Mortar Mix</p>
          <p className="text-sm text-green-900">Standard mortar mix is 1:3 (cement:sand). For each litre of mortar, use approximately 300ml cement to 900ml sand.</p>
        </div>
      </div>
    </CalculatorLayout>
  );
}
