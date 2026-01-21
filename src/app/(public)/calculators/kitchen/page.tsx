'use client';
import { useState } from 'react';
import Link from 'next/link';
import CalculatorLayout, { ResultCard, InputWrapper, FormSection, ResultsGrid } from '@/components/CalculatorLayout';
import { calculateKitchen } from '@/utils/calculations';
import { pricingModeDescriptions, pricingDisclaimer, type PricingMode } from '@/config/pricing';

export default function KitchenCalculator() {
  const [cabinetCount, setCabinetCount] = useState(12);
  const [worktopLength, setWorktopLength] = useState(3);
  const [appliances, setAppliances] = useState(3);
  const [pricingMode, setPricingMode] = useState<PricingMode>('standard');

  const result = calculateKitchen({cabinetCount, worktopLength, appliances, pricingMode});

  return (
    <CalculatorLayout title="Kitchen Installation Calculator" subtitle="Estimate labour for professional kitchen fitting and installation" exampleTitle="Standard 12-unit kitchen with 3m worktop" exampleInputs="Cabinets: 12 units\nWorktop: 3 linear metres\nAppliances: 3 (oven, hob, dishwasher)\nPricing: Standard" exampleOutputs="Estimated labour: 3.2 days\nLabour cost: £512" howToUse={['Count base and wall units separately', 'Measure worktop length in linear metres', 'Enter number of appliances to install', 'Select pricing mode (Budget/Standard/Premium)', 'Review estimated labour days and cost', 'Budget mode assumes basic fitting, Premium includes bespoke adjustments']} relatedGuides={[{ title: 'Kitchen Design Principles', href: '/guides' }, { title: 'Cabinet Installation Guide', href: '/guides' }, { title: 'Worktop Options & Installation', href: '/guides' }]}>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-amber-900"><span className="font-semibold">ℹ️ Professional Benchmark:</span> {pricingDisclaimer}</p>
      </div>

      <FormSection title="Kitchen Specifications" description="Enter kitchen size and components">
        <InputWrapper label="Cabinet units (base + wall combined)">
          <input type="number" value={cabinetCount} onChange={(e) => setCabinetCount(parseFloat(e.target.value) || 0)} step="1" min="1" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 12" />
        </InputWrapper>

        <InputWrapper label="Worktop length" hint="Total linear metres">
          <div className="flex gap-2">
            <input type="number" value={worktopLength} onChange={(e) => setWorktopLength(parseFloat(e.target.value) || 0)} step="0.1" min="0.5" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 3" />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m</span>
          </div>
        </InputWrapper>

        <InputWrapper label="Appliances to install" hint="Cooker, hob, dishwasher, etc.">
          <input type="number" value={appliances} onChange={(e) => setAppliances(parseFloat(e.target.value) || 0)} step="1" min="0" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., 3" />
        </InputWrapper>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900 font-semibold mb-2">📏 Estimation Notes</p>
          <ul className="text-sm text-blue-900 space-y-1">
            <li>• Budget mode: straight layouts, standard finishes</li>
            <li>• Standard mode: typical kitchen with minor adaptations</li>
            <li>• Premium mode: bespoke fitments, meticulous installation, adjustments</li>
          </ul>
        </div>
      </FormSection>

      <FormSection title="Pricing Mode" description="Reflects quality and timeline">
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
            <p className="text-sm text-green-900 font-semibold mb-2">✓ What's Included</p>
            <ul className="text-sm text-green-900 space-y-1">
              <li>• Cabinet installation and levelling</li>
              <li>• Worktop fitting (cutting, joints, sealing)</li>
              <li>• Appliance installation and testing</li>
              <li>• Basic plumbing/electrical connections</li>
              <li>• Splash back installation</li>
              <li>• Final finishing and adjustments</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 font-semibold mb-2">ℹ️ Not Included</p>
            <ul className="text-sm text-blue-900 space-y-1">
              <li>• Major plumbing/electrical work (separate quotes)</li>
              <li>• Wall preparation or structural work</li>
              <li>• Specialist finishes (e.g., custom joinery)</li>
              <li>• Material supply (labour only)</li>
            </ul>
          </div>
        </div>
      </div>
    </CalculatorLayout>
  );
}
