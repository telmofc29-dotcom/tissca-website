// src/components/planner/tabs/PlanTab.tsx v1.0
//
// PURPOSE:
// Clean read-only 2D floor plan view.
// Shows room geometry, walls, openings, and placed modules
// without editing controls – for review and print.

'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { LayoutDocument } from '@/lib/planner/planner-types';
import { formatMM } from '@/lib/planner/planner-types';
import { getWallLength, worldToWallLocal } from '@/spatial/coordinateUtils';
import { analyzeWallLayout } from '@/spatial/dimensions';
import type { GapClass } from '@/spatial/dimensions';
import { drawDimAligned, drawGapH } from '@/spatial/dimensionRenderer';
import { effectiveDims } from '@/spatial/placementRules';

type Props = {
  layout: LayoutDocument;
};

export default function PlanTab({ layout }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const { room, openings, placedModules } = layout;
    const pad = 60;
    const scaleX = (rect.width - pad * 2) / room.width;
    const scaleY = (rect.height - pad * 2) / room.depth;
    const s = Math.min(scaleX, scaleY);
    const ox = (rect.width - room.width * s) / 2;
    const oy = (rect.height - room.depth * s) / 2;

    const toX = (mm: number) => ox + mm * s;
    const toY = (mm: number) => oy + mm * s;

    // Background
    ctx.fillStyle = '#FAFBFC';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Grid
    const gridMM = 500; // 500mm grid for plan view
    ctx.strokeStyle = '#F0F0F0';
    ctx.lineWidth = 0.5;
    for (let gx = 0; gx <= room.width; gx += gridMM) {
      ctx.beginPath();
      ctx.moveTo(toX(gx), toY(0));
      ctx.lineTo(toX(gx), toY(room.depth));
      ctx.stroke();
    }
    for (let gy = 0; gy <= room.depth; gy += gridMM) {
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(gy));
      ctx.lineTo(toX(room.width), toY(gy));
      ctx.stroke();
    }

    // Floor fill
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    const walls = room.walls;
    if (walls.length > 0) {
      ctx.moveTo(toX(walls[0].start.x), toY(walls[0].start.y));
      for (const wall of walls) {
        ctx.lineTo(toX(wall.end.x), toY(wall.end.y));
      }
      ctx.closePath();
      ctx.fill();
    }

    // ── Gap highlights (classified) ──
    const GAP_COLORS: Record<GapClass, string> = {
      ignore: 'transparent',
      filler: 'rgba(245, 158, 11, 0.18)',   // amber
      warning: 'rgba(239, 68, 68, 0.18)',    // red
      available: 'rgba(148, 163, 184, 0.10)', // neutral
    };
    const GAP_BORDER: Record<GapClass, string> = {
      ignore: 'transparent',
      filler: 'rgba(245, 158, 11, 0.50)',
      warning: 'rgba(239, 68, 68, 0.50)',
      available: 'rgba(148, 163, 184, 0.25)',
    };
    for (const wall of walls) {
      const wa = analyzeWallLayout(placedModules, wall);
      if (wa.moduleCount === 0) continue; // skip walls with no modules
      const wLen = getWallLength(wall);
      if (wLen === 0) continue;
      const wdx = wall.end.x - wall.start.x;
      const wdy = wall.end.y - wall.start.y;
      const wux = wdx / wLen;
      const wuy = wdy / wLen;
      // Normal pointing inward
      const wnx = -wuy;
      const wny = wux;
      const stripDepth = 100; // 100mm visual strip depth

      for (const gap of wa.gaps) {
        if (gap.classification === 'ignore') continue;
        const fill = GAP_COLORS[gap.classification];
        const border = GAP_BORDER[gap.classification];

        // Four corners of the gap strip
        const x1 = toX(wall.start.x + wux * gap.start);
        const y1 = toY(wall.start.y + wuy * gap.start);
        const x2 = toX(wall.start.x + wux * gap.end);
        const y2 = toY(wall.start.y + wuy * gap.end);
        const inX = wnx * stripDepth * s;
        const inY = wny * stripDepth * s;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2 + inX, y2 + inY);
        ctx.lineTo(x1 + inX, y1 + inY);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = border;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Placed modules (soft colour fill)
    for (const mod of placedModules) {
      const mx = toX(mod.position.x);
      const my = toY(mod.position.y);
      const mw = mod.width * s;
      const md = mod.depth * s;

      ctx.save();
      if (mod.rotation) {
        ctx.translate(mx + mw / 2, my + md / 2);
        ctx.rotate((mod.rotation * Math.PI) / 180);
        ctx.translate(-(mx + mw / 2), -(my + md / 2));
      }

      ctx.fillStyle = mod.color + '40'; // 25% opacity
      ctx.fillRect(mx, my, mw, md);
      ctx.strokeStyle = mod.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(mx, my, mw, md);

      // Label
      if (mw > 30 && md > 14) {
        ctx.fillStyle = '#475569';
        ctx.font = `${Math.max(8, Math.min(11, mw / 8))}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(mod.label, mx + mw / 2, my + md / 2 - 4);
        ctx.fillStyle = '#94A3B8';
        ctx.font = `${Math.max(7, Math.min(9, mw / 10))}px Inter, system-ui, sans-serif`;
        ctx.fillText(formatMM(mod.width), mx + mw / 2, my + md / 2 + 7);
      }

      ctx.restore();
    }

    // Walls (thick lines)
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = Math.max(2, 4 * s);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const wall of walls) {
      ctx.beginPath();
      ctx.moveTo(toX(wall.start.x), toY(wall.start.y));
      ctx.lineTo(toX(wall.end.x), toY(wall.end.y));
      ctx.stroke();
    }

    // Openings
    for (const opening of openings) {
      const wall = walls.find((w) => w.id === opening.wall_id);
      if (!wall) continue;

      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) continue;

      const ux = dx / len;
      const uy = dy / len;

      const osx = wall.start.x + ux * opening.offset;
      const osy = wall.start.y + uy * opening.offset;
      const oex = osx + ux * opening.width;
      const oey = osy + uy * opening.width;

      // Draw opening break
      ctx.strokeStyle = '#FAFBFC'; // "erase" wall
      ctx.lineWidth = Math.max(3, 6 * s);
      ctx.beginPath();
      ctx.moveTo(toX(osx), toY(osy));
      ctx.lineTo(toX(oex), toY(oey));
      ctx.stroke();

      // Draw opening symbol
      if (opening.type === 'door') {
        // Arc swing
        ctx.strokeStyle = '#64748B';
        ctx.lineWidth = 1;
        const r = opening.width * s;
        const angle = Math.atan2(uy, ux);
        ctx.beginPath();
        ctx.arc(toX(osx), toY(osy), r, angle - Math.PI / 2, angle, false);
        ctx.stroke();
      } else if (opening.type === 'window') {
        // Double line
        ctx.strokeStyle = '#7BA4C7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(toX(osx), toY(osy));
        ctx.lineTo(toX(oex), toY(oey));
        ctx.stroke();
        // Centre mark
        const cx = (toX(osx) + toX(oex)) / 2;
        const cy = (toY(osy) + toY(oey)) / 2;
        ctx.strokeStyle = '#7BA4C7';
        ctx.lineWidth = 1;
        const perpX = -uy * 6;
        const perpY = ux * 6;
        ctx.beginPath();
        ctx.moveTo(cx - perpX, cy - perpY);
        ctx.lineTo(cx + perpX, cy + perpY);
        ctx.stroke();
      }
    }

    // ── Wall dimension labels (aligned to each wall, offset outward) ──
    for (const wall of walls) {
      const wLen = getWallLength(wall);
      if (wLen < 100) continue;
      drawDimAligned(
        ctx,
        toX(wall.start.x), toY(wall.start.y),
        toX(wall.end.x), toY(wall.end.y),
        -18,
        formatMM(wLen, 'm'),
      );

      // ── Classified gap dimensions on this wall ──
      const wa = analyzeWallLayout(placedModules, wall);
      if (wa.moduleCount === 0) continue;
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) continue;
      const ux = dx / len;
      const uy = dy / len;

      const GAP_LABEL_COLOR: Record<GapClass, string> = {
        ignore: '#94A3B8',
        filler: '#D97706',
        warning: '#DC2626',
        available: '#64748B',
      };

      for (const gap of wa.gaps) {
        if (gap.classification === 'ignore') continue;
        const gsx = toX(wall.start.x + ux * gap.start);
        const gsy = toY(wall.start.y + uy * gap.start);
        const gex = toX(wall.start.x + ux * gap.end);
        const gey = toY(wall.start.y + uy * gap.end);
        const labelColor = GAP_LABEL_COLOR[gap.classification];
        const isHorizontal = Math.abs(uy) < 0.1;
        if (isHorizontal) {
          drawGapH(ctx, gsx, gex, gsy + 14, formatMM(Math.round(gap.width)), { color: labelColor });
        } else {
          drawGapH(ctx, Math.min(gsx, gex) - 12, Math.min(gsx, gex) - 12, Math.min(gsy, gey), formatMM(Math.round(gap.width)), { color: labelColor });
        }
      }
    }

    // ── Module along-wall width markers ──
    for (const mod of placedModules) {
      if (!mod.wall_id) continue;
      const wall = walls.find((w) => w.id === mod.wall_id);
      if (!wall) continue;
      const { w: ew } = effectiveDims(mod);
      const centre = {
        x: mod.position.x + ew / 2,
        y: mod.position.y + effectiveDims(mod).d / 2,
      };
      const local = worldToWallLocal(centre, wall);
      const wLen = getWallLength(wall);
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const ux = dx / wLen;
      const uy = dy / wLen;

      const modStartAlong = local.along - ew / 2;
      const modEndAlong = local.along + ew / 2;

      const sx = toX(wall.start.x + ux * modStartAlong);
      const sy = toY(wall.start.y + uy * modStartAlong);
      const ex = toX(wall.start.x + ux * modEndAlong);
      const ey = toY(wall.start.y + uy * modEndAlong);

      // Draw width dimension below module (offset into room)
      drawDimAligned(ctx, sx, sy, ex, ey, 22, formatMM(mod.width), {
        color: mod.color || '#94A3B8',
        font: '9px Inter, system-ui, sans-serif',
      });
    }

    // Title
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Floor Plan', 12, 12);

    // North arrow
    const arrowX = rect.width - 30;
    const arrowY = 24;
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY + 16);
    ctx.lineTo(arrowX, arrowY - 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(arrowX - 4, arrowY - 2);
    ctx.lineTo(arrowX, arrowY - 8);
    ctx.lineTo(arrowX + 4, arrowY - 2);
    ctx.stroke();
    ctx.fillStyle = '#94A3B8';
    ctx.font = '9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', arrowX, arrowY - 14);
  }, [layout]);

  useEffect(() => {
    draw();
    const ro = new ResizeObserver(() => draw());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [draw]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[400px] rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
