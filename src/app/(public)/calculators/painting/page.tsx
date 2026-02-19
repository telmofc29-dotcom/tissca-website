'use client';
import { useState } from 'react';
import CalculatorLayout, { ResultCard, InputWrapper, FormSection, ResultsGrid } from '@/components/CalculatorLayout';
import { calculatePainting } from '@/utils/calculations';
export default function PaintingCalculator() {
  const [wallArea, setWallArea] = useState(80);
  const [ceilingArea, setCeilingArea] = useState(40);
  const [coats, setCoats] = useState(2);
  const [paintCoverage, setPaintCoverage] = useState(10);
  const [includePrimer, setIncludePrimer] = useState(true);
  const [primerCoverage, setPrimerCoverage] = useState(12);
  const [wastage, setWastage] = useState(10);
  const result = calculatePainting({ wallArea, ceilingArea, coats, paintCoverage, includePrimer, primerCoverage, wastage });
  return (
    <CalculatorLayout title="Painting Calculator" subtitle="Calculate paint and primer quantities for interior and exterior projects" exampleTitle="60 m² room with 2 coats" exampleInputs="Wall area: 80 m²\nCeiling: 30 m²\nCoats: 2\nCoverage: 10 m²/L\nPrimer: Yes" exampleOutputs="Paint: 22 litres\nPrimer: 9 litres\nSuggested tins: 1x5L + 3x5L" howToUse={['Measure all wall areas in square meters', 'Include ceiling area if painting it', 'Specify number of coats (usually 2)', 'Check paint coverage on tin (typically 8-12 m²/L)', 'Enable primer for new surfaces or dark colors', 'Results account for 10% wastage by default']} relatedGuides={[{ title: 'Interior Painting Guide', href: '/guides' }, { title: 'Surface Preparation', href: '/guides' }, { title: 'Paint Selection Tips', href: '/guides' }]}>
      <FormSection title="Room Dimensions" description="Enter wall and ceiling areas">
        <InputWrapper label="Total wall area" hint="Height × width of all walls combined">
          <div className="flex gap-2">
            <input type="number" value={wallArea} onChange={(e) => setWallArea(parseFloat(e.target.value) || 0)} step="1" min="0" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 80" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m²</span>
          </div>
        </InputWrapper>
        <InputWrapper label="Ceiling area" required={false} hint="Leave at 0 if not painting ceiling">
          <div className="flex gap-2">
            <input type="number" value={ceilingArea} onChange={(e) => setCeilingArea(parseFloat(e.target.value) || 0)} step="1" min="0" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 40" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m²</span>
          </div>
        </InputWrapper>
      </FormSection>
      <FormSection title="Paint Specification" description="Specify coats and coverage">
        <InputWrapper label="Number of coats" hint="1-3 typical">
          <div className="flex gap-2">
            <input type="number" value={coats} onChange={(e) => setCoats(parseFloat(e.target.value) || 1)} step="1" min="1" max="5" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 2" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">coats</span>
          </div>
        </InputWrapper>
        <InputWrapper label="Paint coverage" hint="Check can - typically 8-12 m²/L">
          <div className="flex gap-2">
            <input type="number" value={paintCoverage} onChange={(e) => setPaintCoverage(parseFloat(e.target.value) || 1)} step="0.5" min="1" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 10" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m²/L</span>
          </div>
        </InputWrapper>
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <input type="checkbox" id="primer" checked={includePrimer} onChange={(e) => setIncludePrimer(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
          <label htmlFor="primer" className="text-sm font-medium text-slate-900">Include primer (recommended for new surfaces or major color changes)</label>
        </div>
        {includePrimer && (
          <InputWrapper label="Primer coverage" hint="Typically 10-15 m²/L">
            <div className="flex gap-2">
              <input type="number" value={primerCoverage} onChange={(e) => setPrimerCoverage(parseFloat(e.target.value) || 1)} step="0.5" min="1" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 12" />
              <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m²/L</span>
            </div>
          </InputWrapper>
        )}
        <InputWrapper label="Wastage" hint="Overspray and spillage - typically 10%">
          <div className="flex gap-2">
            <input type="number" value={wastage} onChange={(e) => setWastage(parseFloat(e.target.value) || 0)} step="1" min="0" max="30" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 10" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">%</span>
          </div>
        </InputWrapper>
      </FormSection>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Results</h2>
        <ResultsGrid columns={2}>
          <ResultCard label="Total Area" value={`${result.totalArea}`} unit="m²" />
          <ResultCard label="Paint Required" value={`${result.paintLitres}`} unit="L" highlighted icon="🎨" />
          {includePrimer && (<ResultCard label="Primer Required" value={`${result.primerLitres}`} unit="L" highlighted icon="🪣" />)}
        </ResultsGrid>
        <div className="mt-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Suggested Paint Tins</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-semibold text-slate-900 mb-2">Paint Tins</p>
              <ul className="space-y-1 text-sm">
                {result.paintTins.map((tin, i) => (
                  <li key={i} className="text-slate-700">{tin.count} × {tin.size}L tin{tin.count > 1 ? 's' : ''}</li>
                ))}
              </ul>
            </div>
            {includePrimer && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-semibold text-slate-900 mb-2">Primer Tins</p>
                <ul className="space-y-1 text-sm">
                  {result.primerTins.map((tin, i) => (
                    <li key={i} className="text-slate-700">{tin.count} × {tin.size}L tin{tin.count > 1 ? 's' : ''}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-900"><span className="font-semibold">💡 Pro Tip:</span> Coverage varies based on surface texture and paint quality. Textured surfaces need more paint. Always test coverage on your specific surface before buying full quantities.</p>
        </div>
      </div>
    </CalculatorLayout>
  );
}
