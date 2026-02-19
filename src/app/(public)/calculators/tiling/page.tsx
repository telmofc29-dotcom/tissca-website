'use client';

import { useState } from 'react';
import CalculatorLayout, { ResultCard, InputWrapper, FormSection, ResultsGrid } from '@/components/CalculatorLayout';
import { calculateTiling } from '@/utils/calculations';

export default function TilingCalculator() {
  const [area, setArea] = useState(50);
  const [tileWidth, setTileWidth] = useState(300);
  const [tileHeight, setTileHeight] = useState(300);
  const [waste, setWaste] = useState(10);
  const [adhesiveCoverage, setAdhesiveCoverage] = useState(4);
  const [groutPerSqm, setGroutPerSqm] = useState<number | undefined>(undefined);

  const result = calculateTiling({
    area,
    tileWidth,
    tileHeight,
    waste,
    adhesiveCoverage,
    groutPerSqm,
  });

  return (
    <CalculatorLayout
      title="Tiling Calculator"
      subtitle="Calculate tiles, adhesive, and grout needed for your tiling project"
      exampleTitle="20m² bathroom with 300x300mm tiles"
      exampleInputs="Area: 20 m²\nTile size: 300 x 300 mm\nWaste: 10%\nAdhesive coverage: 4 m²/bag\nGrout: Auto-estimated"
      exampleOutputs="Tiles needed: 223\nAdhesive bags: 6\nGrout: 9 kg"
      howToUse={[
        'Enter the area you want to tile in square meters',
        'Input your tile dimensions in millimeters',
        'Adjust waste percentage (10-15% typical)',
        'Set adhesive and grout coverage rates',
        'Review calculated quantities',
        'Add 10-15% extra for breakage during installation',
      ]}
      relatedGuides={[
        { title: 'Tiling Best Practices', href: '/guides' },
        { title: 'Surface Preparation', href: '/guides' },
        { title: 'Grouting Techniques', href: '/guides' },
      ]}
    >
      <FormSection title="Project Dimensions" description="Enter the area and tile size">
        <InputWrapper
          label="Area to tile"
          description="The total surface area you want to cover"
          hint="Use 50 m² for a large room project"
        >
          <div className="flex gap-2">
            <input
              type="number"
              value={area}
              onChange={(e) => setArea(parseFloat(e.target.value) || 0)}
              step="0.1"
              min="0.1"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 50"
            />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m²</span>
          </div>
        </InputWrapper>

        <InputWrapper label="Tile width" hint="Standard: 200-600mm">
          <div className="flex gap-2">
            <input
              type="number"
              value={tileWidth}
              onChange={(e) => setTileWidth(parseFloat(e.target.value) || 0)}
              step="10"
              min="50"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 300"
            />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">mm</span>
          </div>
        </InputWrapper>

        <InputWrapper label="Tile height" hint="Standard: 200-600mm">
          <div className="flex gap-2">
            <input
              type="number"
              value={tileHeight}
              onChange={(e) => setTileHeight(parseFloat(e.target.value) || 0)}
              step="10"
              min="50"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 300"
            />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">mm</span>
          </div>
        </InputWrapper>
      </FormSection>

      <FormSection title="Materials" description="Specify adhesive and grout requirements">
        <InputWrapper label="Waste allowance" hint="10-15% typical, 20%+ for complex layouts">
          <div className="flex gap-2">
            <input
              type="number"
              value={waste}
              onChange={(e) => setWaste(parseFloat(e.target.value) || 0)}
              step="1"
              min="0"
              max="50"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 10"
            />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">%</span>
          </div>
        </InputWrapper>

        <InputWrapper label="Adhesive coverage" hint="Check product label - typically 3-5 m²/bag">
          <div className="flex gap-2">
            <input
              type="number"
              value={adhesiveCoverage}
              onChange={(e) => setAdhesiveCoverage(parseFloat(e.target.value) || 0)}
              step="0.1"
              min="0.1"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., 4"
            />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">m²/bag</span>
          </div>
        </InputWrapper>

        <InputWrapper label="Grout coverage" required={false} hint="Leave blank for auto-estimate based on tile size">
          <div className="flex gap-2">
            <input
              type="number"
              value={groutPerSqm ?? ''}
              onChange={(e) => setGroutPerSqm(e.target.value ? parseFloat(e.target.value) : undefined)}
              step="0.1"
              min="0"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Auto-calculated"
            />
            <span className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 font-medium">kg/m²</span>
          </div>
        </InputWrapper>
      </FormSection>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Results</h2>
        
        <ResultsGrid columns={2}>
          <ResultCard label="Tile Size" value={`${result.tileAreaSqm}`} unit="m²" />
          <ResultCard label="Tiles per m²" value={`${result.tilesPerSqm}`} unit="tiles" />
          <ResultCard label="Tiles Needed" value={`${result.tilesNeeded}`} highlighted icon="🔢" />
          <ResultCard label="Total Area (incl. waste)" value={`${result.totalAreaIncWaste}`} unit="m²" />
          <ResultCard label="Adhesive Bags" value={`${result.adhesiveBags}`} highlighted icon="🪣" />
          <ResultCard label="Grout Required" value={`${result.groutKg}`} unit="kg" highlighted icon="💨" />
        </ResultsGrid>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-900">
            <span className="font-semibold">💡 Pro Tip:</span> Always order extra tiles and materials to account for breakage and future repairs. Store spare tiles in a dry place.
          </p>
        </div>
      </div>
    </CalculatorLayout>
  );
}
