// src/app/(member)/app/tools/[slug]/page.tsx v2.0
//
// PURPOSE:
// Dynamic catch-all for old tool category URLs.
// Now redirects to trade tool pages for Android-parity tools.
// Shows "foundation ready" for any remaining unknown slugs.
//
// ANDROID PARITY:
// Known Android toolKey slugs redirect to /app/tools/trade/[toolKey]

'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trackEvent } from '@/utils/analytics';
import { TOOL_DEFINITIONS } from '@/lib/tools/tool-definitions';
import type { ToolKey } from '@/lib/tools/tool-types';

// ─── Slug → toolKey mapping for redirect ─────────────────────────────────────

const SLUG_TO_TOOL_KEY: Record<string, ToolKey> = {
  'kitchens': 'kitchen',
  'kitchen': 'kitchen',
  'kitchen-materials': 'kitchen_materials',
  'bathrooms': 'bathroom_renovation',
  'bathroom-quick-fittings': 'bathroom_quick_fittings',
  'bathroom-renovation': 'bathroom_renovation',
  'bedrooms': 'bedroom_wardrobes',
  'bedroom-wardrobes': 'bedroom_wardrobes',
  'bedroom-sliding-wardrobes': 'bedroom_sliding_wardrobes',
  'flooring': 'flooring',
  'paint': 'paint',
  'paint-decorating': 'paint',
  'carpentry': 'carpentry',
  'electrical': 'electrical',
  'plumbing': 'plumbing',
  'roofing': 'roofing',
  'hvac': 'hvac',
  'tiles': 'tiling',
  'tiling': 'tiling',
  'windows': 'windows',
  'landscaping': 'landscaping',
  'cleaning': 'cleaning',
};

export default function ToolCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  // Check if this slug maps to an Android-parity trade tool
  const mappedKey = SLUG_TO_TOOL_KEY[slug];
  const definition = mappedKey ? TOOL_DEFINITIONS[mappedKey] : undefined;

  useEffect(() => {
    // Redirect to the new trade tool page if we have a match
    if (definition && mappedKey) {
      router.replace(`/app/tools/trade/${mappedKey}`);
      return;
    }

    trackEvent('feature_view', `/app/tools/${slug}`, {
      eventLabel: 'tool_category',
      metadata: { toolSlug: slug },
    });
  }, [slug, definition, mappedKey, router]);

  // If we're redirecting, show loading
  if (definition) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <p className="mt-2 text-sm text-slate-500">Redirecting to {definition.toolTitle}...</p>
        </div>
      </div>
    );
  }

  // Unknown slug — show "not found"
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
        <div className="flex items-center gap-4 mb-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-3xl">🔧</span>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{slug}</h2>
            <span className="inline-block rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wider mt-1">
              Not available
            </span>
          </div>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          This tool is not yet available. Check the Tools hub for all active tools.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)]">
        <h3 className="text-sm font-semibold text-amber-900 mb-2">What you can do now</h3>
        <p className="text-sm text-amber-900/80 mb-4">
          Use any of the active trade tools or the <strong>General</strong> tool for quick estimates.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => router.push('/app/tools/general')}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
          >
            Open General Tool
          </button>
          <button
            onClick={() => router.push('/app/tools')}
            className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
          >
            Back to Tools Hub
          </button>
        </div>
      </div>
    </div>
  );
}
