// src/components/planner/EditorModeBar.tsx v1.0
//
// PURPOSE:
// Sub-mode selector for the Layout tab.
// Modes: Floor Plan | Wall Edit | Free Place | Openings

'use client';

import type { EditorMode } from '@/lib/warehouse/warehouse-types';
import { EDITOR_MODES } from '@/lib/warehouse/warehouse-types';

type Props = {
  activeMode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
};

export default function EditorModeBar({ activeMode, onModeChange }: Props) {
  return (
    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1 py-0.5">
      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider px-1.5 hidden md:inline">
        Mode
      </span>
      {EDITOR_MODES.map((mode) => {
        const isActive = activeMode === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            title={mode.description}
            className={`
              flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium
              transition-all duration-100 select-none
              ${isActive
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }
            `}
          >
            <span className="text-xs">{mode.icon}</span>
            <span className="hidden lg:inline">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
