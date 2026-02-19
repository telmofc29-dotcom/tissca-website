'use client';
import { useState } from 'react';
import CalculatorLayout, { ResultCard, InputWrapper, FormSection, ResultsGrid } from '@/components/CalculatorLayout';
import { calculateWaste } from '@/utils/calculations';
export default function WasteCalculator() {
  const [material, setMaterial] = useState<'tiles' | 'paint' | 'plaster' | 'flooring'>('tiles');
  const [baseQuantity, setBaseQuantity] = useState(100);
  const [complexity, setComplexity] = useState<'straight' | 'moderate' | 'complex'>('moderate');
  const complexityWaste: Record<string, number> = {straight: 10, moderate: 15, complex: 20};
  const wastePercentage = complexityWaste[complexity];
  const result = calculateWaste({baseQuantity, waste: wastePercentage});
  const unitLabels: Record<string, string> = {tiles: 'tiles', paint: 'litres', plaster: 'bags', flooring: 'packs'};
  return (
    <CalculatorLayout title="Material Waste Estimator" subtitle="Account for waste in your material calculations based on layout complexity" exampleTitle="100 tiles with moderate complexity layout" exampleInputs="Material: Tiles\nBase quantity: 100\nLayout: Moderate complexity (15% waste)" exampleOutputs="Waste: 15 tiles\nTotal with waste: 115 tiles" howToUse={['Select your material type', 'Enter the base quantity needed', 'Choose layout complexity level', 'Waste percentage auto-calculates', 'Review total quantity including waste', 'Order the total quantity to ensure enough']} relatedGuides={[{ title: 'Planning Material Quantities', href: '/guides' }, { title: 'Reducing Waste', href: '/guides' }, { title: 'Material Storage', href: '/guides' }]}>
      <FormSection title="Material Type" description="Select what you're calculating for">
        <div className="grid grid-cols-2 gap-3 mb-6">
          {(['tiles', 'paint', 'plaster', 'flooring'] as const).map((m) => (
            <button key={m} onClick={() => setMaterial(m)} className={`px-4 py-3 rounded-lg font-medium transition-all text-sm ${material === m ? 'bg-blue-600 text-white' : 'bg-gray-200 text-slate-900 hover:bg-gray-300'}`}>
              {m === 'tiles' && '🔲 Tiles'} {m === 'paint' && '🎨 Paint'} {m === 'plaster' && '🪜 Plaster'} {m === 'flooring' && '🏠 Flooring'}
            </button>
          ))}
        </div>
      </FormSection>
      <FormSection title="Quantity" description="Base requirement before waste">
        <InputWrapper label="Base quantity" hint={`In ${unitLabels[material]}`}>
          <div className="flex gap-2">
            <input type="number" value={baseQuantity} onChange={(e) => setBaseQuantity(parseFloat(e.target.value) || 0)} step="1" min="1" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 100" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">{unitLabels[material]}</span>
          </div>
        </InputWrapper>
      </FormSection>
      <FormSection title="Layout Complexity" description="Determines waste percentage">
        <div className="space-y-4">
          {(['straight', 'moderate', 'complex'] as const).map((c) => (
            <button key={c} onClick={() => setComplexity(c)} className={`w-full p-4 rounded-lg border-2 transition-all text-left ${complexity === c ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
              <p className="font-semibold text-slate-900 mb-1">
                {c === 'straight' && '✓ Straight Layout (10% waste)'} {c === 'moderate' && '= Moderate Layout (15% waste)'} {c === 'complex' && '⬆ Complex Layout (20% waste)'}
              </p>
              <p className="text-sm text-gray-600">
                {c === 'straight' && 'Simple grid pattern, few cuts, minimal fitting'} {c === 'moderate' && 'Standard room with some obstacles, average cutting'} {c === 'complex' && 'Intricate patterns, many cuts, difficult fitting'}
              </p>
            </button>
          ))}
        </div>
      </FormSection>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Results</h2>
        <ResultsGrid columns={3}>
          <ResultCard label="Base Quantity" value={`${baseQuantity}`} unit={unitLabels[material]} />
          <ResultCard label="Waste Quantity" value={`${result.wasteQuantity}`} unit={unitLabels[material]} icon="⚠️" />
          <ResultCard label="Total to Order" value={`${result.totalQuantity}`} unit={unitLabels[material]} highlighted icon="✓" />
        </ResultsGrid>
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-900 font-semibold mb-2">✓ How to Minimize Waste</p>
          <ul className="text-sm text-green-900 space-y-1">
            <li>• Plan layout carefully before starting</li>
            <li>• Measure twice, cut once</li>
            <li>• Use offcuts from one piece for another</li>
            <li>• Batch similar cuts together</li>
            <li>• Store spare materials for future use</li>
          </ul>
        </div>
      </div>
    </CalculatorLayout>
  );
}
