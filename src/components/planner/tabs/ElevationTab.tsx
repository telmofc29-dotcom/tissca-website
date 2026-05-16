// src/components/planner/tabs/ElevationTab.tsx v3.0
//
// PURPOSE:
// Real wall elevation views — true orthographic projection of each wall.
// Shows cabinets with structural detail (plinth, shelves, door panel),
// openings (doors/windows/obstacles), and dimensioned layout.
//
// ENGINE:
// Coordinate math and category logic delegated to /src/spatial/.
// This component is a 2D Canvas renderer only.

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { LayoutDocument, Opening, PlacedModule } from '@/lib/planner/planner-types';
import { formatMM } from '@/lib/planner/planner-types';
import {
  getWallLength,
  PLINTH_HEIGHT_MM,
  WALL_CAB_ELEVATION_MM,
  isBaseCategory,
  isWallCategory,
  isTallCategory,
  getModuleFloorElevation,
  getModuleBodyHeight,
} from '@/spatial/coordinateUtils';
import { projectModuleOnWall } from '@/spatial/openingProjector';
import { getGapsOnWall } from '@/spatial/dimensions';
import { drawDimH, drawDimV, drawGapH } from '@/spatial/dimensionRenderer';

type Props = {
  layout: LayoutDocument;
};

export default function ElevationTab({ layout }: Props) {
  const { room, openings, placedModules } = layout;
  const [selectedWall, setSelectedWall] = useState<string>(room.walls[0]?.id || '');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const wall = room.walls.find((w) => w.id === selectedWall);

  function modulesOnWall(wallId: string): PlacedModule[] {
    return placedModules.filter((m) => m.wall_id === wallId);
  }

  function openingsOnWall(wallId: string): Opening[] {
    return openings.filter((o) => o.wall_id === wallId);
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !wall) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const wLen = getWallLength(wall);
    const wHeight = room.height;
    const pad = 60;

    const scaleX = (rect.width - pad * 2) / wLen;
    const scaleY = (rect.height - pad * 2) / wHeight;
    const s = Math.min(scaleX, scaleY);

    const ox = (rect.width - wLen * s) / 2;
    const oy = rect.height - pad;

    const toX = (mm: number) => ox + mm * s;
    const toY = (mmFromFloor: number) => oy - mmFromFloor * s;

    // ── Background ──
    ctx.fillStyle = '#FAFBFC';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // ── Wall face ──
    ctx.fillStyle = '#F5F3EF';
    ctx.fillRect(toX(0), toY(wHeight), wLen * s, wHeight * s);

    // ── Floor line ──
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(toX(0), oy);
    ctx.lineTo(toX(wLen), oy);
    ctx.stroke();

    // ── Ceiling line (dashed) ──
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(wHeight));
    ctx.lineTo(toX(wLen), toY(wHeight));
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Wall cabinet guide line (dashed at 1400mm) ──
    const mods = modulesOnWall(selectedWall);
    const hasWallCabs = mods.some((m) => m.category === 'wall_cabinet');
    if (hasWallCabs) {
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(WALL_CAB_ELEVATION_MM));
      ctx.lineTo(toX(wLen), toY(WALL_CAB_ELEVATION_MM));
      ctx.stroke();
      ctx.setLineDash([]);

      // Guide label
      ctx.fillStyle = '#CBD5E1';
      ctx.font = '9px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('1400mm', toX(wLen) - 4, toY(WALL_CAB_ELEVATION_MM) - 2);
    }

    // ── Openings ──
    const wallOpenings = openingsOnWall(selectedWall);
    for (const op of wallOpenings) {
      drawOpening(ctx, op, toX, toY, s);
    }

    // ── Modules ──
    for (const mod of mods) {
      const offset = projectModuleOnWall(mod, wall);
      drawCabinetElevation(ctx, mod, offset, toX, toY, s);
    }

    // ── Wall side lines ──
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(toX(0), oy);
    ctx.lineTo(toX(0), toY(wHeight));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(toX(wLen), oy);
    ctx.lineTo(toX(wLen), toY(wHeight));
    ctx.stroke();

    // ── Dimension: wall width ──
    drawDimH(ctx, toX(0), toX(wLen), oy + 14, formatMM(wLen, 'm'));

    // ── Dimension: wall height ──
    drawDimV(ctx, toX(0) - 14, toY(wHeight), oy, formatMM(wHeight, 'm'));

    // ── Module height dimensions ──
    for (const mod of mods) {
      const offset = projectModuleOnWall(mod, wall);
      const mx = toX(offset);
      const mw = mod.width * s;
      const floorElev = getModuleFloorElevation(mod.category);
      const bodyH = getModuleBodyHeight(mod.category, mod.height);
      const topElev = floorElev + bodyH;

      // Vertical height dimension (right side of module)
      if (mw > 20) {
        drawDimV(
          ctx,
          mx + mw + 6,
          toY(topElev),
          toY(floorElev),
          formatMM(bodyH),
          { font: '8px Inter, system-ui, sans-serif' },
        );
      }

      // Module width dimension (below module, above wall width line)
      drawDimH(
        ctx,
        mx,
        mx + mw,
        oy + 4,
        formatMM(mod.width),
        { font: '8px Inter, system-ui, sans-serif', color: mod.color || '#94A3B8' },
      );
    }

    // ── Gap dimensions between modules ──
    const wallGaps = getGapsOnWall(placedModules, wall);
    for (const gap of wallGaps.gaps) {
      if (gap.width < 30) continue;
      drawGapH(ctx, toX(gap.start), toX(gap.end), oy + 26, formatMM(Math.round(gap.width)));
    }

    // ── Opening dimensions ──
    for (const op of wallOpenings) {
      const osx = toX(op.offset);
      const ow = op.width * s;
      const oh = op.height * s;
      const osy = toY(op.elevation + op.height);

      // Width dimension below opening
      drawDimH(ctx, osx, osx + ow, osy + oh + 16, formatMM(op.width), {
        font: '8px Inter, system-ui, sans-serif',
        color: op.type === 'window' ? '#7BA4C7' : '#6B8F71',
      });

      // Height dimension right of opening
      if (oh > 15) {
        drawDimV(ctx, osx + ow + 8, osy, osy + oh, formatMM(op.height), {
          font: '8px Inter, system-ui, sans-serif',
          color: op.type === 'window' ? '#7BA4C7' : '#6B8F71',
        });
      }
    }

    // ── Title ──
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 13px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Elevation — ${wall.label}`, 14, 14);

    // Module + opening count
    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.fillText(`${mods.length} module${mods.length !== 1 ? 's' : ''} · ${wallOpenings.length} opening${wallOpenings.length !== 1 ? 's' : ''}`, 14, 30);
  }, [layout, selectedWall, wall]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    draw();
    const ro = new ResizeObserver(() => draw());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [draw]);

  const selectedMods = wall ? modulesOnWall(wall.id).length : 0;
  const selectedOps = wall ? openingsOnWall(wall.id).length : 0;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Wall selector */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs font-semibold text-slate-600">Wall:</span>
        <div className="flex gap-1 flex-wrap">
          {room.walls.map((w) => {
            const isActive = selectedWall === w.id;
            const modCount = modulesOnWall(w.id).length;
            const openCount = openingsOnWall(w.id).length;
            return (
              <button
                key={w.id}
                onClick={() => setSelectedWall(w.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {w.label}
                {(modCount > 0 || openCount > 0) && (
                  <span className={`ml-1 ${isActive ? 'text-amber-100' : 'text-slate-400'}`}>
                    ({modCount + openCount})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 min-h-[300px] rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {selectedMods === 0 && selectedOps === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <span className="text-4xl mb-3">🧱</span>
            <h3 className="text-sm font-semibold text-slate-700">Empty wall</h3>
            <p className="text-xs text-slate-400 mt-1">No modules or openings placed on {wall?.label || 'this wall'}.</p>
            <p className="text-xs text-slate-400">Switch to the Layout tab to add components.</p>
          </div>
        ) : (
          <canvas ref={canvasRef} className="w-full h-full" />
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-2 text-[11px] text-slate-400">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#555] inline-block" /> Plinth</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#a3c4f3] inline-block" /> Base / Drawer</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#b5e48c] inline-block" /> Wall Cabinet</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#f9c74f] inline-block" /> Tall</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#6B8F7140] inline-block border border-[#6B8F71]" /> Door</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#7BA4C740] inline-block border border-[#7BA4C7]" /> Window</span>
      </div>
    </div>
  );
}

// ─── Project module position onto wall axis ──────────────────────────────────
// Now delegated to openingProjector.projectModuleOnWall

// ─── Draw structured cabinet in elevation ────────────────────────────────────

function drawCabinetElevation(
  ctx: CanvasRenderingContext2D,
  mod: PlacedModule,
  offsetAlongWall: number,
  toX: (mm: number) => number,
  toY: (mmFromFloor: number) => number,
  scale: number,
) {
  const isBase = isBaseCategory(mod.category);
  const isWall = isWallCategory(mod.category);
  const isTall = isTallCategory(mod.category);

  const mx = toX(offsetAlongWall);
  const mw = mod.width * scale;

  const floorElev = getModuleFloorElevation(mod.category);
  const bodyH = getModuleBodyHeight(mod.category, mod.height);

  if (isBase) {
    // Draw plinth
    const plinthPx = PLINTH_HEIGHT_MM * scale;
    ctx.fillStyle = '#555555';
    ctx.fillRect(mx + 2, toY(PLINTH_HEIGHT_MM), mw - 4, plinthPx);
  }

  const bodyY = toY(floorElev + bodyH);
  const bodyPx = bodyH * scale;

  // Main body fill
  ctx.fillStyle = (mod.color || '#a3c4f3') + '50';
  ctx.fillRect(mx, bodyY, mw, bodyPx);

  // Body outline
  ctx.strokeStyle = mod.color || '#a3c4f3';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(mx, bodyY, mw, bodyPx);

  // Front panel (inset door)
  const inset = Math.max(2, mw * 0.03);
  ctx.strokeStyle = mod.color || '#a3c4f3';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(mx + inset, bodyY + inset, mw - inset * 2, bodyPx - inset * 2);

  // Drawer lines (for drawer units)
  if (mod.category === 'drawer_unit') {
    const drawerCount = 4;
    for (let i = 1; i < drawerCount; i++) {
      const dy = bodyY + (bodyPx / drawerCount) * i;
      ctx.strokeStyle = mod.color || '#90dbf4';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(mx + inset, dy);
      ctx.lineTo(mx + mw - inset, dy);
      ctx.stroke();
    }
  }

  // Shelf line (base / tall only — horizontal divider inside body)
  if (isBase || isTall) {
    const shelfCount = isTall ? 3 : 1;
    for (let i = 1; i <= shelfCount; i++) {
      const sy = bodyY + (bodyPx / (shelfCount + 1)) * i;
      ctx.strokeStyle = '#AAA';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(mx + 3, sy);
      ctx.lineTo(mx + mw - 3, sy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Handle dot (centre of door panel)
  if (!isWall || mw > 15) {
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(mx + mw / 2, bodyY + bodyPx / 2, Math.min(2.5, mw * 0.04), 0, Math.PI * 2);
    ctx.fill();
  }

  // Label
  if (mw > 25) {
    ctx.fillStyle = '#334155';
    ctx.font = `${Math.max(8, Math.min(10, mw / 5))}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(mod.label, mx + mw / 2, bodyY + bodyPx + 3);

    ctx.fillStyle = '#94A3B8';
    ctx.font = `${Math.max(7, Math.min(9, mw / 6))}px Inter, system-ui, sans-serif`;
    ctx.fillText(formatMM(mod.width), mx + mw / 2, bodyY + bodyPx + 14);
  }
}

// ─── Draw opening in elevation ───────────────────────────────────────────────

function drawOpening(
  ctx: CanvasRenderingContext2D,
  op: Opening,
  toX: (mm: number) => number,
  toY: (mmFromFloor: number) => number,
  scale: number,
) {
  const osx = toX(op.offset);
  const ow = op.width * scale;
  const oh = op.height * scale;
  const osy = toY(op.elevation + op.height);

  if (op.type === 'door') {
    // Door fill
    ctx.fillStyle = '#6B8F7118';
    ctx.fillRect(osx, osy, ow, oh);
    // Frame
    ctx.strokeStyle = '#6B8F71';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(osx, osy, ow, oh);
    // Door arc (swing indicator at bottom)
    ctx.strokeStyle = '#6B8F7180';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(osx, toY(op.elevation), ow, -Math.PI / 2, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    // Handle
    ctx.fillStyle = '#6B8F71';
    ctx.beginPath();
    ctx.arc(osx + ow - 10, osy + oh / 2, 3, 0, Math.PI * 2);
    ctx.fill();
    // Label
    ctx.fillStyle = '#6B8F71';
    ctx.font = '9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(op.label, osx + ow / 2, osy - 4);
  } else if (op.type === 'window') {
    // Window fill (lighter)
    ctx.fillStyle = '#7BA4C715';
    ctx.fillRect(osx, osy, ow, oh);
    // Frame
    ctx.strokeStyle = '#7BA4C7';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(osx, osy, ow, oh);
    // Mullion cross
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(osx + ow / 2, osy);
    ctx.lineTo(osx + ow / 2, osy + oh);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(osx, osy + oh / 2);
    ctx.lineTo(osx + ow, osy + oh / 2);
    ctx.stroke();
    // Sill dimension
    ctx.fillStyle = '#7BA4C7';
    ctx.font = '8px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`sill ${formatMM(op.elevation)}`, osx + ow / 2, osy + oh + 10);
    // Label
    ctx.fillText(op.label, osx + ow / 2, osy - 4);
  } else {
    // Obstacle — hatched fill
    ctx.fillStyle = '#88888820';
    ctx.fillRect(osx, osy, ow, oh);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(osx, osy, ow, oh);
    // Diagonal hatch
    ctx.strokeStyle = '#88888840';
    ctx.lineWidth = 0.5;
    const step = 8;
    for (let i = 0; i < ow + oh; i += step) {
      ctx.beginPath();
      ctx.moveTo(osx + Math.min(i, ow), osy + Math.max(0, i - ow));
      ctx.lineTo(osx + Math.max(0, i - oh), osy + Math.min(i, oh));
      ctx.stroke();
    }
    ctx.fillStyle = '#888';
    ctx.font = '9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(op.label, osx + ow / 2, osy - 4);
  }
}

// Old drawDimensionH removed — now using shared drawDimH from @/spatial/dimensionRenderer
