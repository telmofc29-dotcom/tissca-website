'use client';
import { useState } from 'react';
import Link from 'next/link';
import CalculatorLayout, { ResultCard, InputWrapper, FormSection, ResultsGrid } from '@/components/CalculatorLayout';
import { calculateLabour } from '@/utils/calculations';
import { tradeConfigs, pricingModeDescriptions, pricingDisclaimer, type PricingMode } from '@/config/pricing';

export default function LabourEstimatorAdvanced() {
  const [mode, setMode] = useState<'area' | 'kitchen' | 'bathroom' | 'wardrobe'>('area');
  const [trade, setTrade] = useState<'painting' | 'tiling' | 'plastering' | 'flooring'>('painting');
  const [area, setArea] = useState(100);
  const [difficulty, setDifficulty] = useState<'easy' | 'standard' | 'hard'>('standard');
  const [pricingMode, setPricingMode] = useState<PricingMode>('standard');
  const [ratePerDay] = useState(120);
  const [region, setRegion] = useState<string>('');

  // Kitchen specific
  const [kitchenCabinets, setKitchenCabinets] = useState(15);
  const [kitchenWorktopLength, setKitchenWorktopLength] = useState(3);
  const [kitchenAppliances, setKitchenAppliances] = useState(3);

  // Bathroom specific
  const [bathroomFloorArea, setBathroomFloorArea] = useState(4);
  const [bathroomWallTiling, setBathroomWallTiling] = useState(8);
  const [bathroomFixtures, setBathroomFixtures] = useState(4);

  // Wardrobe specific
  const [wardrobeLinearM, setWardrobeLinearM] = useState(4);
  const [wardrobeDoors, setWardrobeDoors] = useState(4);
  const [wardrobeDrawers, setWardrobeDrawers] = useState(4);
  const [wardrobeLighting, setWardrobeLighting] = useState(false);

  const baseDaily = tradeConfigs[trade]?.dailyRate?.[pricingMode] || ratePerDay;
  let estimatedDays = 0;
  let labourCost = 0;

  if (mode === 'area') {
    const result = calculateLabour({trade: trade as any, area, difficulty, ratePerDay: baseDaily});
    estimatedDays = result.estimatedDays;
    labourCost = result.labourCost;
  } else if (mode === 'kitchen') {
    const baseKitchenDays = kitchenCabinets * 0.5 + kitchenWorktopLength * 0.4 + kitchenAppliances * 0.15;
    const modeMultiplier = {budget: 1.33, standard: 1.0, premium: 0.67}[pricingMode];
    estimatedDays = baseKitchenDays * modeMultiplier * (difficulty === 'easy' ? 0.85 : difficulty === 'hard' ? 1.4 : 1.0);
    const regionMult = region ? {london: 1.35, 'south-east': 1.2, midlands: 1.0, north: 0.95, scotland: 0.98}[region] || 1.0 : 1.0;
    labourCost = estimatedDays * baseDaily * regionMult;
  } else if (mode === 'bathroom') {
    const baseBathroomDays = 2.5 + bathroomFloorArea * 0.12 + bathroomWallTiling * 0.15;
    const modeMultiplier = {budget: 1.33, standard: 1.0, premium: 0.67}[pricingMode];
    estimatedDays = baseBathroomDays * modeMultiplier * (difficulty === 'easy' ? 0.85 : difficulty === 'hard' ? 1.5 : 1.0);
    const regionMult = region ? {london: 1.35, 'south-east': 1.2, midlands: 1.0, north: 0.95, scotland: 0.98}[region] || 1.0 : 1.0;
    labourCost = estimatedDays * baseDaily * regionMult;
  } else if (mode === 'wardrobe') {
    const baseWardrobeDays = wardrobeLinearM * 0.5 + wardrobeDoors * 0.15 + wardrobeDrawers * 0.08 + (wardrobeLighting ? 0.5 : 0);
    const modeMultiplier = {budget: 1.33, standard: 1.0, premium: 0.67}[pricingMode];
    estimatedDays = baseWardrobeDays * modeMultiplier * (difficulty === 'easy' ? 0.85 : difficulty === 'hard' ? 1.4 : 1.0);
    const regionMult = region ? {london: 1.35, 'south-east': 1.2, midlands: 1.0, north: 0.95, scotland: 0.98}[region] || 1.0 : 1.0;
    labourCost = estimatedDays * baseDaily * regionMult;
  }

  return (
    <CalculatorLayout title="Labour Estimator (Advanced)" subtitle="Estimate labour days and costs for construction and specialist work" exampleTitle="Standard kitchen fitting" exampleInputs="Mode: Kitchen\nCabinets: 15, Worktop: 3m, Appliances: 3\nDifficulty: Standard, Pricing: Standard" exampleOutputs="Estimated days: 2.5\nLabour cost: £400" howToUse={['Select calculation mode: area-based or specific job', 'Choose your trade type', 'Enter measurements or job parameters', 'Set difficulty level and pricing mode', 'Select region for cost adjustment', 'Review estimated labour days and costs']} relatedGuides={[{ title: 'Hiring Specialists', href: '/guides' }, { title: 'Project Timeline Planning', href: '/guides' }, { title: 'Quality Standards', href: '/guides' }]}>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-amber-900"><span className="font-semibold">ℹ️ Professional Benchmarks:</span> {pricingDisclaimer}</p>
      </div>

      <FormSection title="Calculation Mode" description="Choose how to estimate labour">
        <div className="grid grid-cols-2 gap-3 mb-6">
          {(['area', 'kitchen', 'bathroom', 'wardrobe'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`px-4 py-3 rounded-lg font-medium transition-all text-sm ${mode === m ? 'bg-blue-600 text-white' : 'bg-gray-200 text-slate-900 hover:bg-gray-300'}`}>
              {m === 'area' && '📐 Area-Based'} {m === 'kitchen' && '🍳 Kitchen'} {m === 'bathroom' && '🚿 Bathroom'} {m === 'wardrobe' && '🚪 Wardrobe'}
            </button>
          ))}
        </div>
      </FormSection>

      {mode === 'area' && (
        <>
          <FormSection title="Trade Selection">
            <div className="grid grid-cols-2 gap-3 mb-6">
              {(['painting', 'tiling', 'plastering', 'flooring'] as const).map((t) => (
                <button key={t} onClick={() => setTrade(t)} className={`px-4 py-3 rounded-lg font-medium transition-all text-sm ${trade === t ? 'bg-blue-600 text-white' : 'bg-gray-200 text-slate-900 hover:bg-gray-300'}`}>
                  {t === 'painting' && '🎨 Painting'} {t === 'tiling' && '🔲 Tiling'} {t === 'plastering' && '🪜 Plastering'} {t === 'flooring' && '🏠 Flooring'}
                </button>
              ))}
            </div>
          </FormSection>
          <FormSection title="Project Scope">
            <InputWrapper label="Area to cover">
              <div className="flex gap-2">
                <input type="number" value={area} onChange={(e) => setArea(parseFloat(e.target.value) || 0)} step="1" min="1" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 100" />
                <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m²</span>
              </div>
            </InputWrapper>
          </FormSection>
        </>
      )}

      {mode === 'kitchen' && (
        <FormSection title="Kitchen Specifications">
          <InputWrapper label="Cabinet units">
            <input type="number" value={kitchenCabinets} onChange={(e) => setKitchenCabinets(parseFloat(e.target.value) || 0)} step="1" min="1" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </InputWrapper>
          <InputWrapper label="Worktop length (linear metres)">
            <input type="number" value={kitchenWorktopLength} onChange={(e) => setKitchenWorktopLength(parseFloat(e.target.value) || 0)} step="0.1" min="0.5" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </InputWrapper>
          <InputWrapper label="Appliances to install">
            <input type="number" value={kitchenAppliances} onChange={(e) => setKitchenAppliances(parseFloat(e.target.value) || 0)} step="1" min="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </InputWrapper>
        </FormSection>
      )}

      {mode === 'bathroom' && (
        <FormSection title="Bathroom Specifications">
          <InputWrapper label="Floor area (m²)">
            <input type="number" value={bathroomFloorArea} onChange={(e) => setBathroomFloorArea(parseFloat(e.target.value) || 0)} step="0.1" min="0.5" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </InputWrapper>
          <InputWrapper label="Wall tiling area (m²)">
            <input type="number" value={bathroomWallTiling} onChange={(e) => setBathroomWallTiling(parseFloat(e.target.value) || 0)} step="0.1" min="0.5" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </InputWrapper>
          <InputWrapper label="Fixtures count">
            <input type="number" value={bathroomFixtures} onChange={(e) => setBathroomFixtures(parseFloat(e.target.value) || 0)} step="1" min="1" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </InputWrapper>
        </FormSection>
      )}

      {mode === 'wardrobe' && (
        <FormSection title="Wardrobe Specifications">
          <InputWrapper label="Linear metres">
            <input type="number" value={wardrobeLinearM} onChange={(e) => setWardrobeLinearM(parseFloat(e.target.value) || 0)} step="0.1" min="0.5" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </InputWrapper>
          <InputWrapper label="Door units">
            <input type="number" value={wardrobeDoors} onChange={(e) => setWardrobeDoors(parseFloat(e.target.value) || 0)} step="1" min="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </InputWrapper>
          <InputWrapper label="Drawers">
            <input type="number" value={wardrobeDrawers} onChange={(e) => setWardrobeDrawers(parseFloat(e.target.value) || 0)} step="1" min="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </InputWrapper>
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <input type="checkbox" id="lighting" checked={wardrobeLighting} onChange={(e) => setWardrobeLighting(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
            <label htmlFor="lighting" className="text-sm font-medium text-slate-900">Include lighting installation</label>
          </div>
        </FormSection>
      )}

      <FormSection title="Complexity & Pricing">
        <InputWrapper label="Difficulty level">
          <div className="flex gap-3 flex-wrap">
            {(['easy', 'standard', 'hard'] as const).map((d) => (
              <button key={d} onClick={() => setDifficulty(d)} className={`px-4 py-2 rounded-lg font-medium transition-all ${difficulty === d ? 'bg-blue-600 text-white' : 'bg-gray-200 text-slate-900 hover:bg-gray-300'}`}>
                {d === 'easy' && '✓ Easy'} {d === 'standard' && '= Standard'} {d === 'hard' && '⬆ Hard'}
              </button>
            ))}
          </div>
        </InputWrapper>

        <InputWrapper label="Pricing mode">
          <div className="space-y-2">
            {(['budget', 'standard', 'premium'] as const).map((p) => (
              <button key={p} onClick={() => setPricingMode(p)} className={`w-full p-3 text-left rounded-lg border-2 transition-all ${pricingMode === p ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
                <p className="font-semibold text-slate-900 text-sm capitalize">{p}</p>
                <p className="text-xs text-gray-600 mt-1">{pricingModeDescriptions[p]}</p>
              </button>
            ))}
          </div>
        </InputWrapper>

        <InputWrapper label="Region" hint="Optional">
          <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">No region (baseline)</option>
            <option value="london">London (+35%)</option>
            <option value="south-east">South East (+20%)</option>
            <option value="midlands">Midlands (baseline)</option>
            <option value="north">North (-5%)</option>
            <option value="scotland">Scotland (-2%)</option>
          </select>
        </InputWrapper>
      </FormSection>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Labour Estimate</h2>
        <ResultsGrid columns={2}>
          <ResultCard label="Estimated Days" value={`${Math.round(estimatedDays * 10) / 10}`} unit="days" highlighted icon="📅" />
          <ResultCard label="Labour Cost" value={`£${Math.round(labourCost).toLocaleString()}`} highlighted icon="💷" />
        </ResultsGrid>
        <div className="mt-6">
          <Link href="/docs/quote" className="block w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold text-center mb-4">
            + Generate Quote from Results
          </Link>
        </div>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900 font-semibold mb-2">📋 Basis</p>
          <ul className="text-sm text-blue-900 space-y-1">
            <li>• Pricing mode affects rate and timeline</li>
            <li>• Region adjusts final cost</li>
            <li>• Difficulty multiplier reflects complexity</li>
            <li>• Includes setup and cleanup</li>
          </ul>
        </div>
      </div>
    </CalculatorLayout>
  );
}
