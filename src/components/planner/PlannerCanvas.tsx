// src/components/planner/PlannerCanvas.tsx v1.0
//
// PURPOSE:
// The 2D planning canvas — renders room walls, openings, placed modules, and grid.
// Uses HTML5 Canvas for performant rendering at scale.
//
// ARCHITECTURE:
// - Receives layout document + selection state from parent
// - Renders room walls (thick dark lines), openings (gaps in walls), placed modules (coloured rects)
// - Grid overlay for alignment
// - Handles mouse interactions: click to select, drag to move, hover for cursor feedback
// - Coordinate system: millimetres (mm). Canvas uses a scale factor to convert mm → pixels.
//
// FUTURE EXTENSIONS:
// - Pan/zoom gestures (currently uses viewSettings.zoom + panOffset)
// - Rubber-band multi-select
// - Snap-to-wall logic for placed modules
// - Dimension annotations between items
// - 3D preview toggle (would swap this canvas for a Three.js renderer)
// - LiDAR scan overlay (show imported room outline under manual adjustments)

'use client';

import { useRef, useEffect, useCallback } from 'react';
import type {
  LayoutDocument,
  PlacedModule,
  Wall,
  Opening,
  Point2D,
  ModuleRelationship,
} from '@/lib/planner/planner-types';
import { snapToWall, snapToGrid } from '@/spatial/snapping';
import type { SnapResult } from '@/spatial/snapping';
import type { CabinetRun } from '@/spatial/relationships';

type PlannerCanvasProps = {
  layout: LayoutDocument;
  selectedItemId: string | null;
  selectedItemIds?: string[];
  onSelectItem: (id: string | null) => void;
  onToggleSelectItem?: (id: string) => void;
  onMoveItem: (id: string, position: Point2D, wallId?: string | null, rotation?: number) => void;
  onDropModule: (position: Point2D, wallId?: string | null, rotation?: number) => void;
  /** Collision IDs to highlight in red */
  collisionIds?: string[];
  /** Whether the current drag placement is invalid */
  placementInvalid?: boolean;
  /** Relationships to draw as connector lines */
  relationships?: ModuleRelationship[];
  /** Callback when a wall is double-clicked (for entering wall edit mode) */
  onWallClick?: (wallId: string) => void;
  /** Detected cabinet runs for visual overlay */
  runs?: CabinetRun[];
};

// ─── Scale ───────────────────────────────────────────────────────────────────

const PADDING = 60; // px padding around room
const MIN_CANVAS_PX = 500;

function getScale(room: LayoutDocument['room'], canvasWidth: number, canvasHeight: number, zoom: number): number {
  const availW = Math.max(canvasWidth - PADDING * 2, MIN_CANVAS_PX);
  const availH = Math.max(canvasHeight - PADDING * 2, MIN_CANVAS_PX);
  const scaleW = availW / room.width;
  const scaleH = availH / room.depth;
  return Math.min(scaleW, scaleH) * zoom;
}

function mmToPx(mm: number, scale: number): number {
  return mm * scale;
}

// ─── Drawing ─────────────────────────────────────────────────────────────────

function drawGrid(ctx: CanvasRenderingContext2D, room: LayoutDocument['room'], scale: number, gridSize: number, offsetX: number, offsetY: number) {
  const w = mmToPx(room.width, scale);
  const h = mmToPx(room.depth, scale);
  const step = mmToPx(gridSize, scale);

  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let x = 0; x <= w; x += step) {
    ctx.moveTo(offsetX + x, offsetY);
    ctx.lineTo(offsetX + x, offsetY + h);
  }
  for (let y = 0; y <= h; y += step) {
    ctx.moveTo(offsetX, offsetY + y);
    ctx.lineTo(offsetX + w, offsetY + y);
  }
  ctx.stroke();
}

function drawWalls(ctx: CanvasRenderingContext2D, walls: Wall[], scale: number, offsetX: number, offsetY: number) {
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  walls.forEach((wall) => {
    ctx.moveTo(offsetX + mmToPx(wall.start.x, scale), offsetY + mmToPx(wall.start.y, scale));
    ctx.lineTo(offsetX + mmToPx(wall.end.x, scale), offsetY + mmToPx(wall.end.y, scale));
  });
  ctx.stroke();
}

function drawOpenings(ctx: CanvasRenderingContext2D, openings: Opening[], walls: Wall[], scale: number, offsetX: number, offsetY: number) {
  openings.forEach((opening) => {
    const wall = walls.find((w) => w.id === opening.wall_id);
    if (!wall) return;

    // Calculate opening position along the wall
    const wallDx = wall.end.x - wall.start.x;
    const wallDy = wall.end.y - wall.start.y;
    const wallLen = Math.sqrt(wallDx * wallDx + wallDy * wallDy);
    if (wallLen === 0) return;

    const unitX = wallDx / wallLen;
    const unitY = wallDy / wallLen;

    const startX = wall.start.x + unitX * opening.offset;
    const startY = wall.start.y + unitY * opening.offset;
    const endX = startX + unitX * opening.width;
    const endY = startY + unitY * opening.width;

    // Draw break in wall (white gap)
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(offsetX + mmToPx(startX, scale), offsetY + mmToPx(startY, scale));
    ctx.lineTo(offsetX + mmToPx(endX, scale), offsetY + mmToPx(endY, scale));
    ctx.stroke();

    // Draw opening indicator
    if (opening.type === 'door') {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      // Door swing arc
      const cx = offsetX + mmToPx(startX, scale);
      const cy = offsetY + mmToPx(startY, scale);
      const radius = mmToPx(opening.width, scale);
      const angle = Math.atan2(unitY, unitX);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, angle - Math.PI / 2, angle, false);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (opening.type === 'window') {
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(offsetX + mmToPx(startX, scale), offsetY + mmToPx(startY, scale));
      ctx.lineTo(offsetX + mmToPx(endX, scale), offsetY + mmToPx(endY, scale));
      ctx.stroke();
      // Double line for window
      const perpX = -unitY * 3;
      const perpY = unitX * 3;
      ctx.beginPath();
      ctx.moveTo(offsetX + mmToPx(startX, scale) + perpX, offsetY + mmToPx(startY, scale) + perpY);
      ctx.lineTo(offsetX + mmToPx(endX, scale) + perpX, offsetY + mmToPx(endY, scale) + perpY);
      ctx.stroke();
    } else {
      // Obstacle — hatched
      ctx.fillStyle = '#fca5a5';
      ctx.globalAlpha = 0.4;
      const ox = offsetX + mmToPx(startX, scale);
      const oy = offsetY + mmToPx(startY, scale);
      const ow = mmToPx(opening.width, scale);
      ctx.fillRect(ox - 4, oy - 4, ow, 8);
      ctx.globalAlpha = 1;
    }

    // Label
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    const midX = offsetX + mmToPx((startX + endX) / 2, scale);
    const midY = offsetY + mmToPx((startY + endY) / 2, scale);
    ctx.fillText(opening.label, midX, midY - 8);
  });
}

function drawModules(
  ctx: CanvasRenderingContext2D,
  modules: PlacedModule[],
  scale: number,
  offsetX: number,
  offsetY: number,
  selectedId: string | null,
  collisionSet?: Set<string>,
  selectedIds?: Set<string>,
  hostHighlightId?: string | null,
) {
  modules.forEach((mod) => {
    const x = offsetX + mmToPx(mod.position.x, scale);
    const y = offsetY + mmToPx(mod.position.y, scale);
    let w = mmToPx(mod.width, scale);
    let d = mmToPx(mod.depth, scale);

    const isColliding = collisionSet?.has(mod.id) ?? false;

    ctx.save();
    ctx.translate(x + w / 2, y + d / 2);
    ctx.rotate((mod.rotation * Math.PI) / 180);

    // Swap width/depth for 90/270 rotation so bounding box reflects visual
    if (mod.rotation === 90 || mod.rotation === 270) {
      [w, d] = [d, w];
    }

    // Fill
    ctx.fillStyle = isColliding ? '#fca5a5' : (mod.color || '#a3c4f3');
    ctx.globalAlpha = isColliding ? 0.5 : 0.7;
    ctx.fillRect(-w / 2, -d / 2, w, d);
    ctx.globalAlpha = 1;

    // Border
    if (isColliding) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
    } else if (selectedId === mod.id || selectedIds?.has(mod.id)) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
    } else {
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
    }
    ctx.strokeRect(-w / 2, -d / 2, w, d);

    // Host highlight glow (snap target) — strong "locked" indicator
    if (hostHighlightId === mod.id) {
      ctx.save();
      // Outer glow
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 22;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.strokeRect(-w / 2 - 2, -d / 2 - 2, w + 4, d + 4);
      // Inner bright ring
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 2]);
      ctx.strokeRect(-w / 2 - 1, -d / 2 - 1, w + 2, d + 2);
      ctx.setLineDash([]);
      // Snap lock checkmark
      const ckX = w / 2 + 4;
      const ckY = -d / 2 - 4;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(ckX, ckY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ckX - 3, ckY);
      ctx.lineTo(ckX - 1, ckY + 2);
      ctx.lineTo(ckX + 3, ckY - 2);
      ctx.stroke();
      ctx.restore();
    }

    // Label
    ctx.fillStyle = '#1e293b';
    ctx.font = `${Math.max(9, Math.min(12, w / 6))}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const displayLabel = mod.label.length > 14 ? mod.label.slice(0, 12) + '…' : mod.label;
    ctx.fillText(displayLabel, 0, 0);

    ctx.restore();
  });
}

function drawDimensions(ctx: CanvasRenderingContext2D, room: LayoutDocument['room'], scale: number, offsetX: number, offsetY: number) {
  const w = mmToPx(room.width, scale);
  const h = mmToPx(room.depth, scale);

  ctx.fillStyle = '#64748b';
  ctx.font = '11px system-ui';
  ctx.textAlign = 'center';

  // Width dimension (top)
  ctx.fillText(`${room.width}mm`, offsetX + w / 2, offsetY - 12);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(offsetX, offsetY - 6);
  ctx.lineTo(offsetX + w, offsetY - 6);
  ctx.stroke();

  // Depth dimension (left)
  ctx.save();
  ctx.translate(offsetX - 12, offsetY + h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${room.depth}mm`, 0, 0);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(offsetX - 6, offsetY);
  ctx.lineTo(offsetX - 6, offsetY + h);
  ctx.stroke();
}

// ─── Relationship drawing ────────────────────────────────────────────────────

const REL_COLORS: Record<string, string> = {
  attached_to: '#f59e0b',  // amber
  hosted_by: '#8b5cf6',    // purple
  spans_over: '#06b6d4',   // cyan
  grouped_with: '#6b7280', // gray
};

function drawRelationships(
  ctx: CanvasRenderingContext2D,
  relationships: ModuleRelationship[],
  modules: PlacedModule[],
  scale: number,
  offsetX: number,
  offsetY: number,
) {
  const moduleMap = new Map(modules.map((m) => [m.id, m]));

  relationships.forEach((rel) => {
    const src = moduleMap.get(rel.sourceId);
    const tgt = moduleMap.get(rel.targetId);
    if (!src || !tgt) return;

    // Centre of each module
    const srcCx = offsetX + mmToPx(src.position.x + src.width / 2, scale);
    const srcCy = offsetY + mmToPx(src.position.y + src.depth / 2, scale);
    const tgtCx = offsetX + mmToPx(tgt.position.x + tgt.width / 2, scale);
    const tgtCy = offsetY + mmToPx(tgt.position.y + tgt.depth / 2, scale);

    ctx.strokeStyle = REL_COLORS[rel.type] || '#9ca3af';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    ctx.globalAlpha = 0.7;

    ctx.beginPath();
    ctx.moveTo(srcCx, srcCy);
    ctx.lineTo(tgtCx, tgtCy);
    ctx.stroke();

    // Small diamond at midpoint
    const mx = (srcCx + tgtCx) / 2;
    const my = (srcCy + tgtCy) / 2;
    const ds = 4;
    ctx.fillStyle = REL_COLORS[rel.type] || '#9ca3af';
    ctx.beginPath();
    ctx.moveTo(mx, my - ds);
    ctx.lineTo(mx + ds, my);
    ctx.lineTo(mx, my + ds);
    ctx.lineTo(mx - ds, my);
    ctx.closePath();
    ctx.fill();

    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  });
}

// ─── Wall label drawing ─────────────────────────────────────────────────────

function drawWallLabels(
  ctx: CanvasRenderingContext2D,
  walls: Wall[],
  scale: number,
  offsetX: number,
  offsetY: number,
  modules: PlacedModule[],
) {
  // Count modules per wall
  const wallCounts = new Map<string, number>();
  modules.forEach((m) => {
    if (m.wall_id) wallCounts.set(m.wall_id, (wallCounts.get(m.wall_id) || 0) + 1);
  });

  walls.forEach((wall) => {
    const mx = (wall.start.x + wall.end.x) / 2;
    const my = (wall.start.y + wall.end.y) / 2;
    // Wall normal for label offset
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;
    const nx = -dy / len * 120; // 120mm offset into room
    const ny = dx / len * 120;

    const px = offsetX + mmToPx(mx + nx, scale);
    const py = offsetY + mmToPx(my + ny, scale);

    const count = wallCounts.get(wall.id) || 0;
    const label = `${wall.label}${count > 0 ? ` (${count})` : ''}`;

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.8;
    ctx.fillText(label, px, py);
    ctx.globalAlpha = 1;
  });
}

// ─── Run overlay drawing ─────────────────────────────────────────────────────

const RUN_COLORS = ['#3b82f620', '#8b5cf620', '#06b6d420', '#10b98120', '#f59e0b20'];
const RUN_BORDER_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

function drawRuns(
  ctx: CanvasRenderingContext2D,
  runs: CabinetRun[],
  scale: number,
  offsetX: number,
  offsetY: number,
  highlightRunId?: string | null,
) {
  runs.forEach((run, idx) => {
    // Compute bounding box of all modules in the run
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const mod of run.modules) {
      minX = Math.min(minX, mod.position.x);
      minY = Math.min(minY, mod.position.y);
      maxX = Math.max(maxX, mod.position.x + mod.width);
      maxY = Math.max(maxY, mod.position.y + mod.depth);
    }

    const pad = 6; // px padding
    const rx = offsetX + mmToPx(minX, scale) - pad;
    const ry = offsetY + mmToPx(minY, scale) - pad;
    const rw = mmToPx(maxX - minX, scale) + pad * 2;
    const rh = mmToPx(maxY - minY, scale) + pad * 2;
    const colorIdx = idx % RUN_COLORS.length;
    const isHighlighted = highlightRunId === run.id;

    // Background fill
    ctx.fillStyle = isHighlighted ? RUN_BORDER_COLORS[colorIdx] + '30' : RUN_COLORS[colorIdx];
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, 4);
    ctx.fill();

    // Border
    ctx.strokeStyle = RUN_BORDER_COLORS[colorIdx];
    ctx.lineWidth = isHighlighted ? 2 : 1;
    ctx.globalAlpha = isHighlighted ? 0.9 : 0.4;
    ctx.setLineDash(isHighlighted ? [] : [4, 3]);
    ctx.beginPath();
    ctx.roundRect(rx, ry, rw, rh, 4);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Run length label (above the run)
    const runLengthMM = Math.round(run.endAlong - run.startAlong);
    ctx.fillStyle = RUN_BORDER_COLORS[colorIdx];
    ctx.font = '9px system-ui';
    ctx.textAlign = 'center';
    ctx.globalAlpha = isHighlighted ? 1 : 0.7;
    ctx.fillText(
      `${runLengthMM}mm`,
      rx + rw / 2,
      ry - 4,
    );
    ctx.globalAlpha = 1;
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PlannerCanvas({ layout, selectedItemId, selectedItemIds, onSelectItem, onToggleSelectItem, onMoveItem, onDropModule, collisionIds, placementInvalid: _placementInvalid, relationships, onWallClick, runs }: PlannerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; startMouse: Point2D; startPos: Point2D; groupStartPositions?: Map<string, Point2D> } | null>(null);
  const snapResultRef = useRef<SnapResult | null>(null);

  // ─── Render ────────────────────────────────────────────────────────────

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const { room, openings, placedModules, viewSettings } = layout;
    const scale = getScale(room, rect.width, rect.height, viewSettings.zoom);
    const roomW = mmToPx(room.width, scale);
    const roomH = mmToPx(room.depth, scale);
    const offsetX = (rect.width - roomW) / 2 + viewSettings.panOffset.x;
    const offsetY = (rect.height - roomH) / 2 + viewSettings.panOffset.y;

    // Clear
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Room floor
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(offsetX, offsetY, roomW, roomH);

    // Grid
    if (viewSettings.showGrid) {
      drawGrid(ctx, room, scale, viewSettings.gridSize, offsetX, offsetY);
    }

    // Modules (behind walls so walls overlap)
    const collisionSet = new Set(collisionIds || []);
    const selectedSet = new Set(selectedItemIds || []);
    const hostHighlightId = dragRef.current ? snapResultRef.current?.hostTarget ?? null : null;

    // Cabinet run overlays (drawn before modules)
    if (runs && runs.length > 0) {
      const highlightRunId = selectedItemId
        ? runs.find((r) => r.modules.some((m) => m.id === selectedItemId))?.id ?? null
        : null;
      drawRuns(ctx, runs, scale, offsetX, offsetY, highlightRunId);
    }

    drawModules(ctx, placedModules, scale, offsetX, offsetY, selectedItemId, collisionSet, selectedSet, hostHighlightId);

    // Snap guide line — stronger, bolder feedback for confidence
    const snap = snapResultRef.current;
    if (snap?.snapGuide && dragRef.current) {
      const guide = snap.snapGuide;
      const along = guide.along;
      const wall = guide.wall;
      const dir = { x: (wall.end.x - wall.start.x), y: (wall.end.y - wall.start.y) };
      const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
      if (len > 0) {
        const ux = dir.x / len;
        const uy = dir.y / len;
        const gx = wall.start.x + ux * along;
        const gy = wall.start.y + uy * along;
        const perpX = -uy;
        const perpY = ux;
        const guideLen = 120; // mm extension (wider)

        ctx.strokeStyle = guide.type === 'centre' ? '#3b82f6' : guide.type === 'host-centre' ? '#8b5cf6' : '#10b981';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(
          offsetX + mmToPx(gx - perpX * guideLen, scale),
          offsetY + mmToPx(gy - perpY * guideLen, scale),
        );
        ctx.lineTo(
          offsetX + mmToPx(gx + perpX * guideLen, scale),
          offsetY + mmToPx(gy + perpY * guideLen, scale),
        );
        ctx.stroke();
        ctx.setLineDash([]);

        // Snap point indicator (small filled circle at snap position)
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.arc(
          offsetX + mmToPx(gx, scale),
          offsetY + mmToPx(gy, scale),
          3, 0, Math.PI * 2,
        );
        ctx.fill();
      }
    }

    // Walls
    drawWalls(ctx, room.walls, scale, offsetX, offsetY);

    // Openings
    drawOpenings(ctx, openings, room.walls, scale, offsetX, offsetY);

    // Dimensions
    if (viewSettings.showDimensions) {
      drawDimensions(ctx, room, scale, offsetX, offsetY);
    }

    // Wall labels
    drawWallLabels(ctx, room.walls, scale, offsetX, offsetY, placedModules);

    // Relationships
    if (relationships && relationships.length > 0) {
      drawRelationships(ctx, relationships, placedModules, scale, offsetX, offsetY);
    }
  }, [layout, selectedItemId, selectedItemIds, collisionIds, relationships, runs]);

  useEffect(() => {
    render();
    const handleResize = () => render();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);

  // ─── Hit testing ───────────────────────────────────────────────────────

  const getCanvasCoords = useCallback((e: React.MouseEvent): Point2D => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const pxToMm = useCallback((px: Point2D): Point2D => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const scale = getScale(layout.room, rect.width, rect.height, layout.viewSettings.zoom);
    const roomW = mmToPx(layout.room.width, scale);
    const roomH = mmToPx(layout.room.depth, scale);
    const offsetX = (rect.width - roomW) / 2 + layout.viewSettings.panOffset.x;
    const offsetY = (rect.height - roomH) / 2 + layout.viewSettings.panOffset.y;
    return {
      x: (px.x - offsetX) / scale,
      y: (px.y - offsetY) / scale,
    };
  }, [layout]);

  const hitTestModules = useCallback((pxPos: Point2D): string | null => {
    const mmPos = pxToMm(pxPos);
    // Iterate in reverse so topmost module is selected first
    for (let i = layout.placedModules.length - 1; i >= 0; i--) {
      const mod = layout.placedModules[i];
      if (
        mmPos.x >= mod.position.x &&
        mmPos.x <= mod.position.x + mod.width &&
        mmPos.y >= mod.position.y &&
        mmPos.y <= mod.position.y + mod.depth
      ) {
        return mod.id;
      }
    }
    return null;
  }, [layout, pxToMm]);

  // ─── Mouse handlers ───────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasCoords(e);
    const hitId = hitTestModules(pos);

    if (hitId) {
      const isMultiSelected = (selectedItemIds || []).includes(hitId) && (selectedItemIds || []).length > 1;

      if (e.shiftKey && onToggleSelectItem) {
        onToggleSelectItem(hitId);
      } else if (!isMultiSelected) {
        onSelectItem(hitId);
      }

      const mod = layout.placedModules.find((m) => m.id === hitId);
      if (mod) {
        if (isMultiSelected) {
          // Group drag — store starting positions for all selected modules
          const groupStartPositions = new Map<string, Point2D>();
          for (const selId of (selectedItemIds || [])) {
            const selMod = layout.placedModules.find((m) => m.id === selId);
            if (selMod) groupStartPositions.set(selId, { ...selMod.position });
          }
          dragRef.current = { id: hitId, startMouse: pos, startPos: { ...mod.position }, groupStartPositions };
        } else {
          dragRef.current = { id: hitId, startMouse: pos, startPos: { ...mod.position } };
        }
      }
    } else {
      onSelectItem(null);
    }
  }, [getCanvasCoords, hitTestModules, onSelectItem, onToggleSelectItem, layout.placedModules, selectedItemIds]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    const pos = getCanvasCoords(e);
    const dx = pos.x - dragRef.current.startMouse.x;
    const dy = pos.y - dragRef.current.startMouse.y;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const scale = getScale(layout.room, rect.width, rect.height, layout.viewSettings.zoom);

    // ─── Group drag: move all selected modules by same delta ────
    const groupPositions = dragRef.current.groupStartPositions;
    if (groupPositions && groupPositions.size > 1) {
      const mmDx = dx / scale;
      const mmDy = dy / scale;
      const gridSize = layout.viewSettings.gridSize;
      for (const [modId, startPos] of groupPositions) {
        const newPos = snapToGrid({ x: startPos.x + mmDx, y: startPos.y + mmDy }, gridSize);
        onMoveItem(modId, newPos);
      }
      return;
    }

    // ─── Single module drag: wall-aware snap ────────────────────
    const rawX = dragRef.current.startPos.x + dx / scale;
    const rawY = dragRef.current.startPos.y + dy / scale;

    // Find the module being dragged
    const mod = layout.placedModules.find((m) => m.id === dragRef.current!.id);
    if (!mod) return;

    // Wall-aware snap
    const snap = snapToWall(
      { x: rawX, y: rawY },
      mod,
      layout.room.walls,
      layout.placedModules,
      mod.id,
    );
    snapResultRef.current = snap;

    if (snap.wall_id) {
      onMoveItem(dragRef.current.id, snap.position, snap.wall_id, snap.rotation);
    } else {
      // Fallback: grid snap
      const gridSize = layout.viewSettings.gridSize;
      const gridPos = snapToGrid({ x: rawX, y: rawY }, gridSize);
      onMoveItem(dragRef.current.id, gridPos, null);
    }
  }, [getCanvasCoords, layout, onMoveItem]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    snapResultRef.current = null;
  }, []);

  // ─── Wall double-click → enter wall edit mode ─────────────────────────

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!onWallClick) return;
    const pos = getCanvasCoords(e);
    const mmPos = pxToMm(pos);
    // Hit test walls: find closest wall within tolerance
    const tolerance = 80; // mm
    for (const wall of layout.room.walls) {
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) continue;
      const t = Math.max(0, Math.min(1, ((mmPos.x - wall.start.x) * dx + (mmPos.y - wall.start.y) * dy) / lenSq));
      const projX = wall.start.x + t * dx;
      const projY = wall.start.y + t * dy;
      const dist = Math.sqrt((mmPos.x - projX) ** 2 + (mmPos.y - projY) ** 2);
      if (dist <= tolerance) {
        onWallClick(wall.id);
        return;
      }
    }
  }, [getCanvasCoords, pxToMm, layout.room.walls, onWallClick]);

  // ─── Drop zone ────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const pos = getCanvasCoords(e as unknown as React.MouseEvent);
    const mmPos = pxToMm(pos);
    // Grid-snap the drop position (wall snapping happens in parent on creation)
    const gridSize = layout.viewSettings.gridSize;
    const snappedX = Math.round(mmPos.x / gridSize) * gridSize;
    const snappedY = Math.round(mmPos.y / gridSize) * gridSize;
    onDropModule({ x: snappedX, y: snappedY });
  }, [getCanvasCoords, pxToMm, layout.viewSettings.gridSize, onDropModule]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-xl border border-gray-200 bg-slate-50"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />
      {/* Zoom indicator */}
      <div className="absolute bottom-3 right-3 rounded-lg bg-white/80 border border-gray-200 px-2 py-1 text-xs text-slate-600 backdrop-blur-sm">
        {Math.round(layout.viewSettings.zoom * 100)}%
      </div>
    </div>
  );
}
