// src/components/admin/ParametricPreview.tsx
//
// SVG front-elevation + side-elevation preview renderer for CabinetSpec.
// Pure visual — no 3D, no state. Receives spec + outer dims, renders immediately.

'use client';

import type { CabinetSpec, HandleStyle } from '@/lib/warehouse/parametric-types';

// ─── Props ───────────────────────────────────────────────────────────────────

interface ParametricPreviewProps {
  spec: CabinetSpec;
  width: number;   // outer width in mm
  depth: number;   // outer depth in mm
  height: number;  // outer height in mm
}

// ─── Colours ─────────────────────────────────────────────────────────────────

const C = {
  carcass: '#D4D4D8',  // zinc-300
  door: '#A1A1AA',     // zinc-400
  drawer: '#A1A1AA',
  worktop: '#78716C',  // stone-500
  plinth: '#9CA3AF',   // gray-400
  shelf: '#E4E4E7',    // zinc-200
  handle: '#3F3F46',   // zinc-700
  bg: '#FAFAFA',       // zinc-50
  stroke: '#52525B',   // zinc-600
  divider: '#D4D4D8',
  dim: '#71717A',      // zinc-500
};

// ─── Scaling ─────────────────────────────────────────────────────────────────

const SVG_W = 300;
const SVG_H = 340;
const PAD = 30;
const DIM_PAD = 18; // space for dimension labels

export default function ParametricPreview({ spec, width, depth, height }: ParametricPreviewProps) {
  // Two views: front elevation (left) and side elevation (right)
  const frontW = SVG_W * 0.58;
  const sideW = SVG_W * 0.32;
  const viewH = SVG_H - PAD * 2;

  return (
    <div className="space-y-2">
      <div className="flex gap-4">
        {/* Front elevation */}
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 mb-1 text-center">Front</p>
          <svg
            viewBox={`0 0 ${frontW + DIM_PAD * 2} ${viewH + DIM_PAD * 2}`}
            className="w-full bg-white border border-gray-200 rounded-lg"
            style={{ maxHeight: 280 }}
          >
            <FrontElevation
              spec={spec}
              w={width}
              h={height}
              vw={frontW}
              vh={viewH}
              ox={DIM_PAD}
              oy={DIM_PAD}
            />
          </svg>
        </div>

        {/* Side elevation */}
        <div style={{ width: '38%' }}>
          <p className="text-xs font-medium text-gray-500 mb-1 text-center">Side</p>
          <svg
            viewBox={`0 0 ${sideW + DIM_PAD * 2} ${viewH + DIM_PAD * 2}`}
            className="w-full bg-white border border-gray-200 rounded-lg"
            style={{ maxHeight: 280 }}
          >
            <SideElevation
              spec={spec}
              d={depth}
              h={height}
              vw={sideW}
              vh={viewH}
              ox={DIM_PAD}
              oy={DIM_PAD}
            />
          </svg>
        </div>
      </div>

      {/* Compact spec summary */}
      <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
        <span>{width}×{depth}×{height}mm</span>
        {spec.doors.count > 0 && <span>{spec.doors.count} door{spec.doors.count > 1 ? 's' : ''} ({spec.doors.style})</span>}
        {spec.drawers.count > 0 && <span>{spec.drawers.count} drawer{spec.drawers.count > 1 ? 's' : ''}</span>}
        {spec.shelves.count > 0 && <span>{spec.shelves.count} shel{spec.shelves.count > 1 ? 'ves' : 'f'}</span>}
        {spec.worktop.enabled && <span>worktop {spec.worktop.thickness}mm</span>}
        {spec.plinth.enabled && <span>plinth {spec.plinth.height}mm</span>}
      </div>
    </div>
  );
}

// ─── Front Elevation ─────────────────────────────────────────────────────────

function FrontElevation({
  spec, w, h, vw, vh, ox, oy,
}: {
  spec: CabinetSpec; w: number; h: number; vw: number; vh: number; ox: number; oy: number;
}) {
  // Scale factor: fit cabinet into viewport
  const scaleX = vw / w;
  const scaleY = vh / h;
  const scale = Math.min(scaleX, scaleY) * 0.88;

  const sw = w * scale; // scaled width
  const sh = h * scale; // scaled height
  const cx = ox + (vw - sw) / 2; // centered x
  const cy = oy + (vh - sh) / 2; // centered y

  const pt = spec.carcass.panelThickness * scale;

  // Zones (from top to bottom):
  // worktop → carcass body → plinth
  const worktopH = spec.worktop.enabled ? spec.worktop.thickness * scale : 0;
  const plinthH = spec.plinth.enabled ? spec.plinth.height * scale : 0;
  const bodyH = sh - worktopH - plinthH;
  const bodyY = cy + worktopH;

  // Internal area (inside carcass panels)
  const innerX = cx + pt;
  const innerY = bodyY + pt;
  const innerW = sw - pt * 2;
  const innerH = bodyH - pt * 2;

  // Door gap
  const doorGap = spec.doors.gap * scale;

  // Compute zones: doors vs drawers within inner area
  // Drawers take their specified heights from the top
  const drawerTotalH = spec.drawers.count > 0
    ? spec.drawers.heights.reduce((s, dh) => s + dh, 0) * scale
      + (spec.drawers.count - 1) * spec.drawers.gap * scale
    : 0;

  // Remaining space is for doors
  const doorZoneH = innerH - drawerTotalH - (spec.drawers.count > 0 ? doorGap : 0);

  return (
    <g>
      {/* Worktop */}
      {spec.worktop.enabled && (
        <>
          <rect
            x={cx - spec.worktop.overhang * scale}
            y={cy}
            width={sw + spec.worktop.overhang * scale * 2}
            height={worktopH}
            fill={C.worktop}
            stroke={C.stroke}
            strokeWidth={0.8}
            rx={1}
          />
        </>
      )}

      {/* Carcass body */}
      <rect
        x={cx}
        y={bodyY}
        width={sw}
        height={bodyH}
        fill={C.carcass}
        stroke={C.stroke}
        strokeWidth={1}
      />

      {/* Plinth */}
      {spec.plinth.enabled && (
        <rect
          x={cx + spec.plinth.inset * scale}
          y={cy + sh - plinthH}
          width={sw - spec.plinth.inset * scale * 2}
          height={plinthH}
          fill={C.plinth}
          stroke={C.stroke}
          strokeWidth={0.5}
        />
      )}

      {/* Internal shelves (drawn behind doors) */}
      {spec.shelves.count > 0 && (spec.shelves.openFront || spec.doors.count === 0) && (
        <Shelves
          count={spec.shelves.count}
          x={innerX}
          y={innerY}
          w={innerW}
          h={doorZoneH > 0 ? doorZoneH : innerH}
          thickness={spec.shelves.thickness * scale}
        />
      )}

      {/* Vertical dividers */}
      {spec.divisions.verticalDividers > 0 && (
        <Dividers
          count={spec.divisions.verticalDividers}
          direction="vertical"
          x={innerX}
          y={innerY}
          w={innerW}
          h={innerH}
          thickness={pt}
        />
      )}

      {/* Drawers — drawn from top of inner area */}
      {spec.drawers.count > 0 && (
        <DrawersFront
          spec={spec}
          x={innerX}
          y={innerY}
          w={innerW}
          scale={scale}
          handleStyle={spec.handle.style}
        />
      )}

      {/* Doors — below drawers */}
      {spec.doors.count > 0 && doorZoneH > 0 && (
        <DoorsFront
          spec={spec}
          x={innerX}
          y={innerY + drawerTotalH + (spec.drawers.count > 0 ? doorGap : 0)}
          w={innerW}
          h={doorZoneH}
          gap={doorGap}
          handleStyle={spec.handle.style}
          handlePosition={spec.handle.position}
        />
      )}

      {/* Dimension labels */}
      <DimLabel x1={cx} x2={cx + sw} y={cy + sh + 14} label={`${w}`} />
      <DimLabelV y1={cy} y2={cy + sh} x={cx + sw + 10} label={`${h}`} />
    </g>
  );
}

// ─── Side Elevation ──────────────────────────────────────────────────────────

function SideElevation({
  spec, d, h, vw, vh, ox, oy,
}: {
  spec: CabinetSpec; d: number; h: number; vw: number; vh: number; ox: number; oy: number;
}) {
  const scaleX = vw / d;
  const scaleY = vh / h;
  const scale = Math.min(scaleX, scaleY) * 0.88;

  const sd = d * scale;
  const sh = h * scale;
  const cx = ox + (vw - sd) / 2;
  const cy = oy + (vh - sh) / 2;

  const worktopH = spec.worktop.enabled ? spec.worktop.thickness * scale : 0;
  const plinthH = spec.plinth.enabled ? spec.plinth.height * scale : 0;
  const bodyH = sh - worktopH - plinthH;
  const bodyY = cy + worktopH;
  const bp = spec.carcass.backPanelThickness * scale;
  const pt = spec.carcass.panelThickness * scale;

  return (
    <g>
      {/* Worktop */}
      {spec.worktop.enabled && (
        <rect
          x={cx - spec.worktop.overhang * scale}
          y={cy}
          width={sd + spec.worktop.overhang * scale}
          height={worktopH}
          fill={C.worktop}
          stroke={C.stroke}
          strokeWidth={0.8}
          rx={1}
        />
      )}

      {/* Carcass body */}
      <rect
        x={cx}
        y={bodyY}
        width={sd}
        height={bodyH}
        fill={C.carcass}
        stroke={C.stroke}
        strokeWidth={1}
      />

      {/* Back panel */}
      {spec.carcass.hasBack && (
        <rect
          x={cx + sd - bp}
          y={bodyY + pt}
          width={bp}
          height={bodyH - pt * 2}
          fill={C.divider}
          stroke={C.stroke}
          strokeWidth={0.3}
        />
      )}

      {/* Internal shelves (side view) */}
      {spec.shelves.count > 0 && (
        <ShelvesSide
          count={spec.shelves.count}
          x={cx + pt}
          y={bodyY + pt}
          w={sd - pt - bp}
          h={bodyH - pt * 2}
          thickness={spec.shelves.thickness * scale}
        />
      )}

      {/* Plinth */}
      {spec.plinth.enabled && (
        <rect
          x={cx + spec.plinth.inset * scale}
          y={cy + sh - plinthH}
          width={sd - spec.plinth.inset * scale}
          height={plinthH}
          fill={C.plinth}
          stroke={C.stroke}
          strokeWidth={0.5}
        />
      )}

      {/* Dimension labels */}
      <DimLabel x1={cx} x2={cx + sd} y={cy + sh + 14} label={`${d}`} />
    </g>
  );
}

// ─── Sub-elements ────────────────────────────────────────────────────────────

function Shelves({ count, x, y, w, h, thickness }: {
  count: number; x: number; y: number; w: number; h: number; thickness: number;
}) {
  const spacing = h / (count + 1);
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const sy = y + spacing * (i + 1) - thickness / 2;
        return (
          <rect
            key={i}
            x={x}
            y={sy}
            width={w}
            height={thickness}
            fill={C.shelf}
            stroke={C.stroke}
            strokeWidth={0.3}
          />
        );
      })}
    </g>
  );
}

function ShelvesSide({ count, x, y, w, h, thickness }: {
  count: number; x: number; y: number; w: number; h: number; thickness: number;
}) {
  const spacing = h / (count + 1);
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const sy = y + spacing * (i + 1) - thickness / 2;
        return (
          <rect
            key={i}
            x={x}
            y={sy}
            width={w}
            height={thickness}
            fill={C.shelf}
            stroke={C.stroke}
            strokeWidth={0.3}
          />
        );
      })}
    </g>
  );
}

function Dividers({ count, direction, x, y, w, h, thickness }: {
  count: number; direction: 'vertical' | 'horizontal';
  x: number; y: number; w: number; h: number; thickness: number;
}) {
  if (direction === 'vertical') {
    const spacing = w / (count + 1);
    return (
      <g>
        {Array.from({ length: count }, (_, i) => (
          <rect
            key={i}
            x={x + spacing * (i + 1) - thickness / 2}
            y={y}
            width={thickness}
            height={h}
            fill={C.divider}
            stroke={C.stroke}
            strokeWidth={0.3}
          />
        ))}
      </g>
    );
  }
  // horizontal
  const spacing = h / (count + 1);
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <rect
          key={i}
          x={x}
          y={y + spacing * (i + 1) - thickness / 2}
          width={w}
          height={thickness}
          fill={C.divider}
          stroke={C.stroke}
          strokeWidth={0.3}
        />
      ))}
    </g>
  );
}

function DrawersFront({ spec, x, y, w, scale, handleStyle }: {
  spec: CabinetSpec; x: number; y: number; w: number; scale: number;
  handleStyle: HandleStyle;
}) {
  const gap = spec.drawers.gap * scale;
  let cy = y;
  return (
    <g>
      {spec.drawers.heights.map((dh, i) => {
        const h = dh * scale;
        const el = (
          <g key={i}>
            <rect
              x={x}
              y={cy}
              width={w}
              height={h}
              fill={C.drawer}
              stroke={C.stroke}
              strokeWidth={0.6}
              rx={0.5}
            />
            {/* Handle */}
            {handleStyle !== 'none' && handleStyle !== 'integrated' && (
              <HandleMark
                style={handleStyle}
                x={x + w / 2}
                y={cy + h / 2}
                w={w}
              />
            )}
          </g>
        );
        cy += h + gap;
        return el;
      })}
    </g>
  );
}

function DoorsFront({ spec, x, y, w, h, gap, handleStyle, handlePosition }: {
  spec: CabinetSpec; x: number; y: number; w: number; h: number; gap: number;
  handleStyle: HandleStyle; handlePosition: string;
}) {
  const count = spec.doors.count;
  const totalGap = (count - 1) * gap;
  const doorW = (w - totalGap) / count;

  // Handle Y position
  const handleY =
    handlePosition === 'top' ? y + h * 0.12 :
    handlePosition === 'bottom' ? y + h * 0.88 :
    y + h * 0.5;

  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const dx = x + i * (doorW + gap);
        return (
          <g key={i}>
            <rect
              x={dx}
              y={y}
              width={doorW}
              height={h}
              fill={C.door}
              stroke={C.stroke}
              strokeWidth={0.6}
              rx={0.5}
            />
            {/* Handle */}
            {handleStyle !== 'none' && handleStyle !== 'integrated' && (
              <HandleMark
                style={handleStyle}
                x={dx + doorW / 2}
                y={handleY}
                w={doorW}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

function HandleMark({ style, x, y, w }: {
  style: HandleStyle; x: number; y: number; w: number;
}) {
  const hw = Math.min(w * 0.4, 20);
  switch (style) {
    case 'bar':
      return (
        <line
          x1={x - hw / 2} y1={y}
          x2={x + hw / 2} y2={y}
          stroke={C.handle}
          strokeWidth={2}
          strokeLinecap="round"
        />
      );
    case 'knob':
      return <circle cx={x} cy={y} r={2.5} fill={C.handle} />;
    case 'cup':
      return (
        <path
          d={`M${x - 4},${y + 2} Q${x},${y - 3} ${x + 4},${y + 2}`}
          fill="none"
          stroke={C.handle}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      );
    case 'j_pull':
      return (
        <line
          x1={x} y1={y - 4}
          x2={x} y2={y + 4}
          stroke={C.handle}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      );
    default:
      return null;
  }
}

// ─── Dimension labels ────────────────────────────────────────────────────────

function DimLabel({ x1, x2, y, label }: {
  x1: number; x2: number; y: number; label: string;
}) {
  const mid = (x1 + x2) / 2;
  return (
    <g>
      <line x1={x1} y1={y - 4} x2={x1} y2={y} stroke={C.dim} strokeWidth={0.5} />
      <line x1={x2} y1={y - 4} x2={x2} y2={y} stroke={C.dim} strokeWidth={0.5} />
      <line x1={x1} y1={y - 2} x2={x2} y2={y - 2} stroke={C.dim} strokeWidth={0.5} />
      {/* Arrows */}
      <polygon points={`${x1},${y - 2} ${x1 + 3},${y - 4} ${x1 + 3},${y}`} fill={C.dim} />
      <polygon points={`${x2},${y - 2} ${x2 - 3},${y - 4} ${x2 - 3},${y}`} fill={C.dim} />
      <text x={mid} y={y + 8} textAnchor="middle" fontSize={8} fill={C.dim} fontFamily="system-ui">
        {label}
      </text>
    </g>
  );
}

function DimLabelV({ y1, y2, x, label }: {
  y1: number; y2: number; x: number; label: string;
}) {
  const mid = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x} y1={y1} x2={x + 4} y2={y1} stroke={C.dim} strokeWidth={0.5} />
      <line x1={x} y1={y2} x2={x + 4} y2={y2} stroke={C.dim} strokeWidth={0.5} />
      <line x1={x + 2} y1={y1} x2={x + 2} y2={y2} stroke={C.dim} strokeWidth={0.5} />
      <polygon points={`${x + 2},${y1} ${x},${y1 + 3} ${x + 4},${y1 + 3}`} fill={C.dim} />
      <polygon points={`${x + 2},${y2} ${x},${y2 - 3} ${x + 4},${y2 - 3}`} fill={C.dim} />
      <text
        x={x + 8} y={mid + 3}
        fontSize={8} fill={C.dim} fontFamily="system-ui"
        transform={`rotate(-90, ${x + 8}, ${mid + 3})`}
        textAnchor="middle"
      >
        {label}
      </text>
    </g>
  );
}
