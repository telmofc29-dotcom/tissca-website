// src/components/planner/EditorTabs.tsx v1.0
//
// PURPOSE:
// Main tab navigation bar for the TISSCA Spatial Editor.
// Tabs: Overview | Plan | Elevation | 3D | Layout | Scope
// This structure is LOCKED and matches the cross-platform spec.

'use client';

import type { EditorTab } from '@/lib/warehouse/warehouse-types';
import { EDITOR_TABS } from '@/lib/warehouse/warehouse-types';

type Props = {
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  moduleCount: number;
};

export default function EditorTabs({ activeTab, onTabChange, moduleCount }: Props) {
  return (
    <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-1">
      {EDITOR_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
              transition-all duration-150 select-none
              ${isActive
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }
            `}
          >
            <span className="text-sm">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            {/* Module count badge on Layout tab */}
            {tab.id === 'layout' && moduleCount > 0 && (
              <span className={`
                ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1
                rounded-full text-[10px] font-bold
                ${isActive ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}
              `}>
                {moduleCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
