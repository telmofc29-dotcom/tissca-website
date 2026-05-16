// src/app/(member)/app/tools/page.tsx v3.0
//
// PURPOSE:
// Tools hub — mirrors Android hub structure.
// Groups: Estimation, Layout, Kitchens, Bathrooms, Bedrooms, Trade Calculators.
// Each card routes to its tool page (General = existing, others = trade/[toolKey]).
//
// ANDROID PARITY:
// - Hub structure matches Android
// - toolKey values match Android exact strings
// - All parity-safe tools are marked as ready
// - Bedroom sub-tools and multitools are not yet parity-safe

'use client';

import { useRouter } from 'next/navigation';
import { useLanguage } from '@/i18n';
import { trackEvent } from '@/utils/analytics';
import { useEffect } from 'react';
import { TOOL_TITLES, TOOL_ICONS, type ToolKey } from '@/lib/tools/tool-types';

// ─── Tool category definitions (mirrors Android hub structure) ──────────────

type ToolItem = {
  id: string;
  toolKey: ToolKey | null; // null for non-tool items like Scan to Layout
  icon: string;
  title: string;
  description: string;
  href: string;
  ready: boolean;
};

type ToolGroup = {
  title: string;
  description: string;
  tools: ToolItem[];
};

/**
 * Hub structure mirroring Android.
 * NOTE: toolKey values MUST match Android exact strings.
 */
const TOOL_GROUPS: ToolGroup[] = [
  {
    title: 'Estimation Tools',
    description: 'Quick estimates and quote generators for client-facing proposals.',
    tools: [
      {
        id: 'general',
        toolKey: 'general_estimate',
        icon: TOOL_ICONS.general_estimate,
        title: 'Quick Quote / General',
        description: 'Quick estimates with line items, adjustments, VAT, and lead generation.',
        href: '/app/tools/general',
        ready: true,
      },
    ],
  },
  {
    title: 'Layout & Design',
    description: 'Visual tools for room capture, layout building, and spatial planning.',
    tools: [
      {
        id: 'scan-to-layout',
        toolKey: null,
        icon: '📐',
        title: 'Scan to Layout',
        description: 'Room capture and visual layout builder — place cabinets, fittings, and modules.',
        href: '/app/scan-to-layout',
        ready: true,
      },
    ],
  },
  {
    title: 'Kitchens',
    description: 'Kitchen fitting and materials calculators.',
    tools: [
      {
        id: 'kitchen',
        toolKey: 'kitchen',
        icon: TOOL_ICONS.kitchen,
        title: TOOL_TITLES.kitchen,
        description: 'Kitchen fitting — cabinets, worktops, appliances, and installation labour.',
        href: '/app/tools/trade/kitchen',
        ready: true,
      },
      {
        id: 'kitchen-materials',
        toolKey: 'kitchen_materials',
        icon: TOOL_ICONS.kitchen_materials,
        title: TOOL_TITLES.kitchen_materials,
        description: 'Materials-only pricing for kitchen projects.',
        href: '/app/tools/trade/kitchen_materials',
        ready: true,
      },
    ],
  },
  {
    title: 'Bathrooms',
    description: 'Bathroom quick fittings and full renovation calculators.',
    tools: [
      {
        id: 'bathroom-quick-fittings',
        toolKey: 'bathroom_quick_fittings',
        icon: TOOL_ICONS.bathroom_quick_fittings,
        title: TOOL_TITLES.bathroom_quick_fittings,
        description: 'Quick fixture and fitting replacement estimates.',
        href: '/app/tools/trade/bathroom_quick_fittings',
        ready: true,
      },
      {
        id: 'bathroom-renovation',
        toolKey: 'bathroom_renovation',
        icon: TOOL_ICONS.bathroom_renovation,
        title: TOOL_TITLES.bathroom_renovation,
        description: 'Full bathroom renovation with tiling, plumbing, and fixtures.',
        href: '/app/tools/trade/bathroom_renovation',
        ready: true,
      },
    ],
  },
  {
    title: 'Bedrooms',
    description: 'Wardrobes, sliding wardrobes, and bedroom joinery.',
    tools: [
      {
        id: 'bedroom-wardrobes',
        toolKey: 'bedroom_wardrobes',
        icon: TOOL_ICONS.bedroom_wardrobes,
        title: TOOL_TITLES.bedroom_wardrobes,
        description: 'Built-in and freestanding wardrobe installation.',
        href: '/app/tools/trade/bedroom_wardrobes',
        ready: true,
      },
      {
        id: 'bedroom-sliding-wardrobes',
        toolKey: 'bedroom_sliding_wardrobes',
        icon: TOOL_ICONS.bedroom_sliding_wardrobes,
        title: TOOL_TITLES.bedroom_sliding_wardrobes,
        description: 'Sliding door wardrobe systems.',
        href: '/app/tools/trade/bedroom_sliding_wardrobes',
        ready: true,
      },
      // NOTE: bedside_units, chest_of_drawers, wall_panelling, headboards,
      // shelving, other_joinery are NOT parity-safe yet
    ],
  },
  {
    title: 'Trade Calculators',
    description: 'Material and labour calculators for specific trades.',
    tools: [
      {
        id: 'flooring',
        toolKey: 'flooring',
        icon: TOOL_ICONS.flooring,
        title: TOOL_TITLES.flooring,
        description: 'Floor covering, skirting, and finishing calculator.',
        href: '/app/tools/trade/flooring',
        ready: true,
      },
      {
        id: 'paint',
        toolKey: 'paint',
        icon: TOOL_ICONS.paint,
        title: TOOL_TITLES.paint,
        description: 'Paint, wallpaper, preparation, and decorating estimates.',
        href: '/app/tools/trade/paint',
        ready: true,
      },
      {
        id: 'carpentry',
        toolKey: 'carpentry',
        icon: TOOL_ICONS.carpentry,
        title: TOOL_TITLES.carpentry,
        description: 'Doors, skirting, shelving, timber, and joinery calculator.',
        href: '/app/tools/trade/carpentry',
        ready: true,
      },
      {
        id: 'electrical',
        toolKey: 'electrical',
        icon: TOOL_ICONS.electrical,
        title: TOOL_TITLES.electrical,
        description: 'Sockets, lighting, consumer units, and cable work.',
        href: '/app/tools/trade/electrical',
        ready: true,
      },
      {
        id: 'plumbing',
        toolKey: 'plumbing',
        icon: TOOL_ICONS.plumbing,
        title: TOOL_TITLES.plumbing,
        description: 'Sanitary fittings, pipework, heating, and radiators.',
        href: '/app/tools/trade/plumbing',
        ready: true,
      },
      {
        id: 'roofing',
        toolKey: 'roofing',
        icon: TOOL_ICONS.roofing,
        title: TOOL_TITLES.roofing,
        description: 'Roof covering, structural, flashing, and rainwater.',
        href: '/app/tools/trade/roofing',
        ready: true,
      },
      {
        id: 'hvac',
        toolKey: 'hvac',
        icon: TOOL_ICONS.hvac,
        title: TOOL_TITLES.hvac,
        description: 'Heating, ventilation, and air conditioning calculator.',
        href: '/app/tools/trade/hvac',
        ready: true,
      },
      {
        id: 'tiling',
        toolKey: 'tiling',
        icon: TOOL_ICONS.tiling,
        title: TOOL_TITLES.tiling,
        description: 'Tile supply, adhesive, grout, and finishing calculator.',
        href: '/app/tools/trade/tiling',
        ready: true,
      },
      {
        id: 'windows',
        toolKey: 'windows',
        icon: TOOL_ICONS.windows,
        title: TOOL_TITLES.windows,
        description: 'Window and door supply, frames, hardware, and fitting.',
        href: '/app/tools/trade/windows',
        ready: true,
      },
      {
        id: 'landscaping',
        toolKey: 'landscaping',
        icon: TOOL_ICONS.landscaping,
        title: TOOL_TITLES.landscaping,
        description: 'Fencing, paving, turf, and outdoor work calculator.',
        href: '/app/tools/trade/landscaping',
        ready: true,
      },
      {
        id: 'cleaning',
        toolKey: 'cleaning',
        icon: TOOL_ICONS.cleaning,
        title: TOOL_TITLES.cleaning,
        description: 'Post-build, deep clean, and specialist cleaning estimates.',
        href: '/app/tools/trade/cleaning',
        ready: true,
      },
    ],
  },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function ToolsHubPage() {
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    trackEvent('feature_view', '/app/tools', {
      eventLabel: 'tools_hub',
      metadata: { feature: 'tools', action: 'view' },
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-35px_rgba(0,0,0,0.28)]">
        <h2 className="text-lg font-semibold text-slate-900">
          {(t.member.nav as Record<string, string>).tools || 'Tools'}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Your workspace toolbox. Calculators, estimators, and layout tools for every trade.
        </p>
      </div>

      {/* Tool groups */}
      {TOOL_GROUPS.map((group) => (
        <div key={group.title} className="space-y-3">
          {/* Group header */}
          <div className="px-1">
            <h3 className="text-sm font-bold text-slate-900">{group.title}</h3>
            <p className="text-xs text-slate-500">{group.description}</p>
          </div>

          {/* Tool cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {group.tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => {
                  trackEvent('cta_click', '/app/tools', {
                    eventLabel: tool.id,
                    metadata: { toolId: tool.id, ready: tool.ready },
                  });
                  router.push(tool.href);
                }}
                className={`group relative flex flex-col rounded-2xl border bg-white p-5 text-left shadow-[0_16px_40px_-34px_rgba(0,0,0,0.22)] transition-all duration-200 ${
                  tool.ready
                    ? 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/30 hover:shadow-[0_20px_50px_-30px_rgba(217,119,6,0.25)]'
                    : 'border-gray-100 hover:border-gray-300'
                }`}
              >
                {/* Icon + badges */}
                <div className="flex items-start justify-between mb-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-2xl group-hover:bg-amber-50 transition-colors">
                    {tool.icon}
                  </span>
                  {!tool.ready && (
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Coming soon
                    </span>
                  )}
                </div>

                {/* Title + description */}
                <h3 className="text-sm font-semibold text-slate-900 group-hover:text-amber-900 transition-colors">
                  {tool.title}
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed line-clamp-2">
                  {tool.description}
                </p>

                {/* Ready indicator */}
                {tool.ready && (
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-medium text-emerald-700 uppercase tracking-wider">Available</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Public calculators link */}
      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
        <p className="text-sm text-slate-600">
          Looking for public trade calculators?{' '}
          <a href="/calculators" className="font-medium text-amber-600 hover:text-amber-700 underline underline-offset-2">
            View all calculators
          </a>
        </p>
      </div>
    </div>
  );
}
