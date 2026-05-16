// src/components/admin/ParametricBuilder.tsx
//
// Structured parametric cabinet/object builder for the Warehouse Object Editor.
// Renders form controls for each sub-spec of CabinetSpec.
// Does NOT render a 3D preview — that is handled by ParametricPreview.

'use client';

import { useCallback } from 'react';
import type {
  CabinetSpec,
  CabinetType,
  DoorStyle,
  HingeSide,
  HandleStyle,
  HandlePosition,
} from '@/lib/warehouse/parametric-types';
import { defaultCabinetSpec } from '@/lib/warehouse/parametric-types';

// ─── Constants ───────────────────────────────────────────────────────────────

const CABINET_TYPES: { value: CabinetType; label: string }[] = [
  { value: 'base_cabinet', label: 'Base Cabinet' },
  { value: 'wall_cabinet', label: 'Wall Cabinet' },
  { value: 'tall_cabinet', label: 'Tall Cabinet' },
  { value: 'drawer_stack', label: 'Drawer Stack' },
  { value: 'shelf_unit', label: 'Shelf Unit' },
  { value: 'island', label: 'Island' },
  { value: 'wardrobe_section', label: 'Wardrobe Section' },
];

const DOOR_STYLES: { value: DoorStyle; label: string }[] = [
  { value: 'slab', label: 'Slab' },
  { value: 'shaker', label: 'Shaker' },
  { value: 'raised_panel', label: 'Raised Panel' },
  { value: 'glass', label: 'Glass' },
  { value: 'none', label: 'None' },
];

const HINGE_SIDES: { value: HingeSide; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'both', label: 'Split Pair' },
  { value: 'none', label: 'None' },
];

const HANDLE_STYLES: { value: HandleStyle; label: string }[] = [
  { value: 'bar', label: 'Bar' },
  { value: 'knob', label: 'Knob' },
  { value: 'cup', label: 'Cup' },
  { value: 'j_pull', label: 'J-Pull' },
  { value: 'integrated', label: 'Integrated' },
  { value: 'none', label: 'None' },
];

const HANDLE_POSITIONS: { value: HandlePosition; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Centre' },
  { value: 'bottom', label: 'Bottom' },
];

// ─── Props ───────────────────────────────────────────────────────────────────

interface ParametricBuilderProps {
  spec: CabinetSpec;
  onChange: (spec: CabinetSpec) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ParametricBuilder({ spec, onChange }: ParametricBuilderProps) {
  // Deep-update helper
  const update = useCallback(
    <K extends keyof CabinetSpec>(section: K, patch: Partial<CabinetSpec[K]>) => {
      onChange({
        ...spec,
        [section]: { ...(spec[section] as object), ...patch },
      });
    },
    [spec, onChange],
  );

  const handleTypeChange = useCallback(
    (type: CabinetType) => {
      onChange(defaultCabinetSpec(type));
    },
    [onChange],
  );

  // Drawer heights helper
  const updateDrawerCount = useCallback(
    (count: number) => {
      const clamped = Math.max(0, Math.min(12, count));
      const existing = spec.drawers.heights;
      let heights: number[];
      if (clamped > existing.length) {
        // Add new drawers with default height
        heights = [...existing, ...Array(clamped - existing.length).fill(140)];
      } else {
        heights = existing.slice(0, clamped);
      }
      update('drawers', { count: clamped, heights });
    },
    [spec.drawers.heights, update],
  );

  const updateDrawerHeight = useCallback(
    (index: number, height: number) => {
      const heights = [...spec.drawers.heights];
      heights[index] = height;
      update('drawers', { heights });
    },
    [spec.drawers.heights, update],
  );

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Cabinet type selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cabinet Type</label>
        <select
          value={spec.type}
          onChange={(e) => handleTypeChange(e.target.value as CabinetType)}
          className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
        >
          {CABINET_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* ── Carcass ───────────────────────────────────────────────────────── */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">Carcass</legend>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <NumberField
            label="Panel Thickness"
            value={spec.carcass.panelThickness}
            onChange={(v) => update('carcass', { panelThickness: v })}
            min={8} max={36} unit="mm"
          />
          <NumberField
            label="Back Panel"
            value={spec.carcass.backPanelThickness}
            onChange={(v) => update('carcass', { backPanelThickness: v })}
            min={3} max={18} unit="mm"
          />
          <ToggleField
            label="Has Back"
            checked={spec.carcass.hasBack}
            onChange={(v) => update('carcass', { hasBack: v })}
          />
        </div>
      </fieldset>

      {/* ── Plinth ────────────────────────────────────────────────────────── */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">Plinth / Kick</legend>
        <div className="space-y-3">
          <ToggleField
            label="Has Plinth"
            checked={spec.plinth.enabled}
            onChange={(v) => update('plinth', { enabled: v })}
          />
          {spec.plinth.enabled && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <NumberField
                label="Height"
                value={spec.plinth.height}
                onChange={(v) => update('plinth', { height: v })}
                min={50} max={250} unit="mm"
              />
              <NumberField
                label="Inset"
                value={spec.plinth.inset}
                onChange={(v) => update('plinth', { inset: v })}
                min={0} max={100} unit="mm"
              />
              <NumberField
                label="Thickness"
                value={spec.plinth.thickness}
                onChange={(v) => update('plinth', { thickness: v })}
                min={8} max={25} unit="mm"
              />
            </div>
          )}
        </div>
      </fieldset>

      {/* ── Doors ─────────────────────────────────────────────────────────── */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">Doors</legend>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <NumberField
            label="Count"
            value={spec.doors.count}
            onChange={(v) => update('doors', { count: Math.max(0, Math.min(6, v)) })}
            min={0} max={6}
          />
          <SelectField
            label="Style"
            value={spec.doors.style}
            options={DOOR_STYLES}
            onChange={(v) => update('doors', { style: v as DoorStyle })}
          />
          <SelectField
            label="Hinge Side"
            value={spec.doors.hingeSide}
            options={HINGE_SIDES}
            onChange={(v) => update('doors', { hingeSide: v as HingeSide })}
          />
          <NumberField
            label="Gap"
            value={spec.doors.gap}
            onChange={(v) => update('doors', { gap: v })}
            min={0} max={10} unit="mm"
          />
        </div>
      </fieldset>

      {/* ── Drawers ───────────────────────────────────────────────────────── */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">Drawers</legend>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Count"
              value={spec.drawers.count}
              onChange={updateDrawerCount}
              min={0} max={12}
            />
            <NumberField
              label="Gap"
              value={spec.drawers.gap}
              onChange={(v) => update('drawers', { gap: v })}
              min={0} max={10} unit="mm"
            />
          </div>
          {spec.drawers.count > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Drawer Heights (top → bottom)
              </label>
              <div className="flex flex-wrap gap-2">
                {spec.drawers.heights.map((h, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                    <input
                      type="number"
                      value={h}
                      onChange={(e) => updateDrawerHeight(i, Number(e.target.value))}
                      min={60}
                      max={500}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <span className="text-xs text-gray-400">mm</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </fieldset>

      {/* ── Shelves ───────────────────────────────────────────────────────── */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">Shelves</legend>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <NumberField
            label="Count"
            value={spec.shelves.count}
            onChange={(v) => update('shelves', { count: Math.max(0, Math.min(10, v)) })}
            min={0} max={10}
          />
          <NumberField
            label="Thickness"
            value={spec.shelves.thickness}
            onChange={(v) => update('shelves', { thickness: v })}
            min={8} max={36} unit="mm"
          />
          <ToggleField
            label="Adjustable"
            checked={spec.shelves.adjustable}
            onChange={(v) => update('shelves', { adjustable: v })}
          />
          <ToggleField
            label="Open Front"
            checked={spec.shelves.openFront}
            onChange={(v) => update('shelves', { openFront: v })}
          />
        </div>
      </fieldset>

      {/* ── Worktop ───────────────────────────────────────────────────────── */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">Worktop</legend>
        <div className="space-y-3">
          <ToggleField
            label="Has Worktop"
            checked={spec.worktop.enabled}
            onChange={(v) => update('worktop', { enabled: v })}
          />
          {spec.worktop.enabled && (
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Overhang"
                value={spec.worktop.overhang}
                onChange={(v) => update('worktop', { overhang: v })}
                min={0} max={100} unit="mm"
              />
              <NumberField
                label="Thickness"
                value={spec.worktop.thickness}
                onChange={(v) => update('worktop', { thickness: v })}
                min={12} max={80} unit="mm"
              />
            </div>
          )}
        </div>
      </fieldset>

      {/* ── Handle ────────────────────────────────────────────────────────── */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">Handle</legend>
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Style"
            value={spec.handle.style}
            options={HANDLE_STYLES}
            onChange={(v) => update('handle', { style: v as HandleStyle })}
          />
          <SelectField
            label="Position"
            value={spec.handle.position}
            options={HANDLE_POSITIONS}
            onChange={(v) => update('handle', { position: v as HandlePosition })}
          />
        </div>
      </fieldset>

      {/* ── Divisions ─────────────────────────────────────────────────────── */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">Internal Divisions</legend>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Vertical Dividers"
            value={spec.divisions.verticalDividers}
            onChange={(v) => update('divisions', { verticalDividers: Math.max(0, Math.min(5, v)) })}
            min={0} max={5}
          />
          <NumberField
            label="Horizontal Dividers"
            value={spec.divisions.horizontalDividers}
            onChange={(v) => update('divisions', { horizontalDividers: Math.max(0, Math.min(5, v)) })}
            min={0} max={5}
          />
        </div>
      </fieldset>

      {/* ── Finish ────────────────────────────────────────────────────────── */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-700 px-2">Finish / Material</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextField
            label="Carcass"
            value={spec.finish.carcass}
            onChange={(v) => update('finish', { carcass: v })}
            placeholder="e.g. White Melamine"
          />
          <TextField
            label="Door / Drawer Front"
            value={spec.finish.door}
            onChange={(v) => update('finish', { door: v })}
            placeholder="e.g. Anthracite Matt"
          />
          <TextField
            label="Worktop"
            value={spec.finish.worktop}
            onChange={(v) => update('finish', { worktop: v })}
            placeholder="e.g. Oak Laminate"
          />
          <TextField
            label="Edge Band"
            value={spec.finish.edge}
            onChange={(v) => update('finish', { edge: v })}
            placeholder="e.g. Matching ABS"
          />
        </div>
      </fieldset>
    </div>
  );
}

// ─── Reusable field primitives ───────────────────────────────────────────────

function NumberField({
  label, value, onChange, min, max, unit,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; unit?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-0.5">
        {label}{unit && <span className="text-gray-400 ml-1">({unit})</span>}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
      />
    </div>
  );
}

function TextField({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-0.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
      />
    </div>
  );
}

function SelectField<T extends string>({
  label, value, options, onChange,
}: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-0.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none bg-white"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function ToggleField({
  label, checked, onChange,
}: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 pt-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <label className="text-xs font-medium text-gray-600">{label}</label>
    </div>
  );
}
