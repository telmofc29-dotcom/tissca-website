// src/components/admin/ProfileEditor.tsx
//
// 2D profile polyline editor for the warehouse shape editor (Phase 3A).
// SVG-based, admin-only. Supports:
//   - Draggable vertex handles
//   - Click-to-add points on edges
//   - Right-click / button to delete points
//   - Grid snapping (10mm increments)
//   - Dimension readout
//   - Validation warnings
//   - Reset to rectangle

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ShapeEditorConfig,
  ProfilePoint,
  CurveSegment,
} from '@/lib/warehouse/shape-editor-types';
import {
  computeProfileBBox,
  validateProfile,
  getCurveForEdge,
} from '@/lib/warehouse/shape-editor-types';

// ─── Constants ───────────────────────────────────────────────────────────────

const GRID_STEP = 10; // mm
const HANDLE_RADIUS = 6;
const CP_HANDLE_SIZE = 5; // curve control point diamond half-size
const EDGE_HIT_WIDTH = 12;
const MIN_CANVAS = 320;
const PADDING = 40; // px padding inside the SVG viewport

// ─── Props ───────────────────────────────────────────────────────────────────

interface ProfileEditorProps {
  config: ShapeEditorConfig;
  onChange: (config: ShapeEditorConfig) => void;
  /** Outer asset dimensions for reference overlay (optional). */
  assetWidth?: number;
  assetHeight?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function snap(value: number): number {
  return Math.round(value / GRID_STEP) * GRID_STEP;
}

/** Convert mm coords to SVG pixel coords. */
function toSvg(
  pt: ProfilePoint,
  scale: number,
  offsetX: number,
  offsetY: number,
  viewHeight: number,
): [number, number] {
  // Flip Y so 0,0 is bottom-left (mm convention) but SVG is top-left
  return [
    pt[0] * scale + offsetX,
    viewHeight - (pt[1] * scale + offsetY),
  ];
}

/** Convert SVG pixel coords back to mm coords. */
function fromSvg(
  sx: number,
  sy: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  viewHeight: number,
): ProfilePoint {
  return [
    snap((sx - offsetX) / scale),
    snap((viewHeight - sy - offsetY) / scale),
  ];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProfileEditor({
  config,
  onChange,
  assetWidth,
  assetHeight,
}: ProfileEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragCurveIndex, setDragCurveIndex] = useState<number | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const points = config.profile.points;
  const curves = config.profile.curves;
  const warnings = validateProfile(config.profile);
  const bbox = computeProfileBBox(points, curves);

  // ─── Viewport Scaling ──────────────────────────────────────────────────

  const extentW = Math.max(bbox.width, assetWidth ?? 0, 100);
  const extentH = Math.max(bbox.height, assetHeight ?? 0, 100);
  const viewW = Math.max(MIN_CANVAS, 500);
  const viewH = Math.max(MIN_CANVAS, 400);
  const scaleX = (viewW - PADDING * 2) / extentW;
  const scaleY = (viewH - PADDING * 2) / extentH;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = PADDING + (viewW - PADDING * 2 - extentW * scale) / 2;
  const offsetY = PADDING + (viewH - PADDING * 2 - extentH * scale) / 2;

  // ─── Update helpers ────────────────────────────────────────────────────

  /** Update points and/or curves, recomputing bbox. */
  const updateProfile = useCallback(
    (newPoints: ProfilePoint[], newCurves?: CurveSegment[]) => {
      const c = newCurves !== undefined ? newCurves : curves;
      const filtered = c && c.length > 0 ? c : undefined;
      const newBBox = computeProfileBBox(newPoints, filtered);
      onChange({
        ...config,
        profile: { ...config.profile, points: newPoints, curves: filtered },
        bbox: newBBox,
      });
    },
    [config, curves, onChange],
  );

  /** Shorthand: update only points, keeping existing curves. */
  const updatePoints = useCallback(
    (newPoints: ProfilePoint[]) => updateProfile(newPoints),
    [updateProfile],
  );

  // ─── Drag Handlers ────────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (index: number, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragIndex(index);
      (e.target as SVGElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragIndex === null && dragCurveIndex === null) return;
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const [mx, my] = fromSvg(sx, sy, scale, offsetX, offsetY, viewH);
      const clamped: ProfilePoint = [Math.max(0, mx), Math.max(0, my)];

      if (dragIndex !== null) {
        const newPoints = [...points];
        newPoints[dragIndex] = clamped;
        updatePoints(newPoints);
      } else if (dragCurveIndex !== null && curves) {
        const newCurves = curves.map((c, i) =>
          i === dragCurveIndex ? { ...c, cp: clamped } : c,
        );
        updateProfile(points, newCurves);
      }
    },
    [dragIndex, dragCurveIndex, points, curves, scale, offsetX, offsetY, viewH, updatePoints, updateProfile],
  );

  const handlePointerUp = useCallback(() => {
    setDragIndex(null);
    setDragCurveIndex(null);
  }, []);

  // ─── Add point on edge click ──────────────────────────────────────────

  const handleEdgeClick = useCallback(
    (edgeIndex: number, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const [mx, my] = fromSvg(sx, sy, scale, offsetX, offsetY, viewH);
      const newPoints = [...points];
      newPoints.splice(edgeIndex + 1, 0, [mx, my]);
      // Remap curve edge indices: edges after insertion point shift +1.
      // The original edge at edgeIndex is now split into edgeIndex and edgeIndex+1.
      // Any curve on the original edge is removed (split invalidates it).
      const newCurves = (curves ?? [])
        .filter((c) => c.edge !== edgeIndex) // remove curve on split edge
        .map((c) => (c.edge > edgeIndex ? { ...c, edge: c.edge + 1 } : c));
      updateProfile(newPoints, newCurves);
    },
    [points, curves, scale, offsetX, offsetY, viewH, updateProfile],
  );

  // ─── Double-click edge to add/toggle curve ────────────────────────────

  const handleEdgeDoubleClick = useCallback(
    (edgeIndex: number, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const existing = getCurveForEdge(curves, edgeIndex);
      if (existing) {
        // Remove curve on this edge
        updateProfile(points, (curves ?? []).filter((c) => c.edge !== edgeIndex));
      } else {
        // Add curve: control point at edge midpoint offset perpendicularly
        const j = (edgeIndex + 1) % points.length;
        const midX = (points[edgeIndex][0] + points[j][0]) / 2;
        const midY = (points[edgeIndex][1] + points[j][1]) / 2;
        const dx = points[j][0] - points[edgeIndex][0];
        const dy = points[j][1] - points[edgeIndex][1];
        const len = Math.sqrt(dx * dx + dy * dy);
        // Perpendicular offset: 20% of edge length, outward
        const offset = Math.max(20, len * 0.2);
        const nx = -dy / (len || 1);
        const ny = dx / (len || 1);
        const cp: ProfilePoint = [snap(midX + nx * offset), snap(midY + ny * offset)];
        const newCurves = [...(curves ?? []), { edge: edgeIndex, cp }];
        updateProfile(points, newCurves);
      }
    },
    [points, curves, updateProfile],
  );

  // ─── Delete point ─────────────────────────────────────────────────────

  const deletePoint = useCallback(
    (index: number) => {
      if (points.length <= 3) return; // keep minimum triangle
      const newPoints = points.filter((_, i) => i !== index);
      // Remap curves: remove curves referencing edges touching this point,
      // then shift edge indices >= index down by 1.
      const prevEdge = (index - 1 + points.length) % points.length;
      const newCurves = (curves ?? [])
        .filter((c) => c.edge !== index && c.edge !== prevEdge)
        .map((c) => (c.edge > index ? { ...c, edge: c.edge - 1 } : c));
      updateProfile(newPoints, newCurves);
    },
    [points, curves, updateProfile],
  );

  // ─── Reset to rectangle ───────────────────────────────────────────────

  const resetToRect = useCallback(() => {
    const w = assetWidth ?? 600;
    const h = assetHeight ?? 870;
    updateProfile(
      [[0, 0], [w, 0], [w, h], [0, h]],
      [], // clear curves
    );
  }, [assetWidth, assetHeight, updateProfile]);

  // ─── Keyboard handler for delete ──────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && hoveredPoint !== null) {
        e.preventDefault();
        deletePoint(hoveredPoint);
        setHoveredPoint(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hoveredPoint, deletePoint]);

  // ─── SVG grid lines ───────────────────────────────────────────────────

  const gridLines: JSX.Element[] = [];
  const gridMajor = 100; // mm
  const gridMinor = 50; // mm

  // Generate grid lines covering the viewport extent
  for (let x = 0; x <= extentW + GRID_STEP; x += gridMinor) {
    const [sx] = toSvg([x, 0], scale, offsetX, offsetY, viewH);
    const isMajor = x % gridMajor === 0;
    gridLines.push(
      <line
        key={`gx-${x}`}
        x1={sx}
        y1={PADDING / 2}
        x2={sx}
        y2={viewH - PADDING / 2}
        stroke={isMajor ? '#d1d5db' : '#e5e7eb'}
        strokeWidth={isMajor ? 0.8 : 0.4}
      />,
    );
  }
  for (let y = 0; y <= extentH + GRID_STEP; y += gridMinor) {
    const [, sy] = toSvg([0, y], scale, offsetX, offsetY, viewH);
    const isMajor = y % gridMajor === 0;
    gridLines.push(
      <line
        key={`gy-${y}`}
        x1={PADDING / 2}
        y1={sy}
        x2={viewW - PADDING / 2}
        y2={sy}
        stroke={isMajor ? '#d1d5db' : '#e5e7eb'}
        strokeWidth={isMajor ? 0.8 : 0.4}
      />,
    );
  }

  // ─── Build SVG polygon path (with optional Q commands for curves) ────

  const svgPoints = points.map((p) => toSvg(p, scale, offsetX, offsetY, viewH));
  const polygonPath = (() => {
    const parts: string[] = [];
    for (let i = 0; i < points.length; i++) {
      const [x, y] = svgPoints[i];
      if (i === 0) {
        parts.push(`M${x},${y}`);
      } else {
        const curve = getCurveForEdge(curves, i - 1);
        if (curve) {
          const [cpx, cpy] = toSvg(curve.cp, scale, offsetX, offsetY, viewH);
          parts.push(`Q${cpx},${cpy} ${x},${y}`);
        } else {
          parts.push(`L${x},${y}`);
        }
      }
    }
    // Closing edge (last → first)
    if (config.profile.closed) {
      const lastCurve = getCurveForEdge(curves, points.length - 1);
      if (lastCurve) {
        const [cpx, cpy] = toSvg(lastCurve.cp, scale, offsetX, offsetY, viewH);
        const [fx, fy] = svgPoints[0];
        parts.push(`Q${cpx},${cpy} ${fx},${fy}`);
      } else {
        parts.push('Z');
      }
    }
    return parts.join(' ');
  })();

  // ─── Edge midpoint labels (segment length) ────────────────────────────

  const edgeLabels: JSX.Element[] = [];
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    if (!config.profile.closed && j === 0) break;
    const dx = points[j][0] - points[i][0];
    const dy = points[j][1] - points[i][1];
    const len = Math.round(Math.sqrt(dx * dx + dy * dy));
    const isCurved = !!getCurveForEdge(curves, i);
    const mid = toSvg(
      [(points[i][0] + points[j][0]) / 2, (points[i][1] + points[j][1]) / 2],
      scale,
      offsetX,
      offsetY,
      viewH,
    );
    edgeLabels.push(
      <text
        key={`el-${i}`}
        x={mid[0]}
        y={mid[1] - 8}
        textAnchor="middle"
        fill={isCurved ? '#7c3aed' : '#6b7280'}
        fontSize="10"
        fontFamily="monospace"
        pointerEvents="none"
      >
        {isCurved ? `~${len}mm ⌒` : `${len}mm`}
      </text>,
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={resetToRect}
          className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Reset to Rectangle
        </button>
        <span className="text-xs text-gray-500">
          {points.length} points · {bbox.width}×{bbox.height}mm
        </span>
        <span className="text-xs text-gray-400">
          Grid: {GRID_STEP}mm · Click edge to add point · Double-click edge to curve · Right-click to delete
        </span>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-lg text-xs space-y-1">
          {warnings.map((w, i) => (
            <p key={i}>⚠ {w}</p>
          ))}
        </div>
      )}

      {/* SVG Canvas */}
      <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
        <svg
          ref={svgRef}
          width={viewW}
          height={viewH}
          className="select-none"
          style={{ cursor: dragIndex !== null || dragCurveIndex !== null ? 'grabbing' : 'default' }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Grid */}
          <g>{gridLines}</g>

          {/* Asset dimension reference rectangle (dashed outline) */}
          {assetWidth && assetHeight && (
            <rect
              x={toSvg([0, assetHeight], scale, offsetX, offsetY, viewH)[0]}
              y={toSvg([0, assetHeight], scale, offsetX, offsetY, viewH)[1]}
              width={assetWidth * scale}
              height={assetHeight * scale}
              fill="none"
              stroke="#93c5fd"
              strokeWidth="1"
              strokeDasharray="6 3"
              opacity={0.5}
            />
          )}

          {/* Filled polygon */}
          <path
            d={polygonPath}
            fill="#3b82f620"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Clickable edge hit areas (invisible wide strokes for interaction) */}
          {points.map((_, i) => {
            const j = (i + 1) % points.length;
            if (!config.profile.closed && j === 0) return null;
            const [x1, y1] = svgPoints[i];
            const [x2, y2] = svgPoints[j];
            return (
              <line
                key={`edge-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="transparent"
                strokeWidth={EDGE_HIT_WIDTH}
                style={{ cursor: 'copy' }}
                onMouseEnter={() => setHoveredEdge(i)}
                onMouseLeave={() => setHoveredEdge(null)}
                onClick={(e) => handleEdgeClick(i, e)}
                onDoubleClick={(e) => handleEdgeDoubleClick(i, e)}
              />
            );
          })}

          {/* Hovered edge highlight */}
          {hoveredEdge !== null && (() => {
            const j = (hoveredEdge + 1) % points.length;
            const [x1, y1] = svgPoints[hoveredEdge];
            const [x2, y2] = svgPoints[j];
            return (
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#60a5fa"
                strokeWidth="3"
                strokeDasharray="4 2"
                pointerEvents="none"
              />
            );
          })()}

          {/* Edge length labels */}
          {edgeLabels}

          {/* Curve control point handles (diamond + guide lines) */}
          {(curves ?? []).map((curve, ci) => {
            const [cpx, cpy] = toSvg(curve.cp, scale, offsetX, offsetY, viewH);
            const [ax, ay] = svgPoints[curve.edge];
            const j = (curve.edge + 1) % points.length;
            const [bx, by] = svgPoints[j];
            const s = CP_HANDLE_SIZE;
            return (
              <g key={`cp-${ci}`}>
                {/* Guide lines from control point to edge endpoints */}
                <line x1={ax} y1={ay} x2={cpx} y2={cpy} stroke="#a78bfa" strokeWidth="1" strokeDasharray="3 2" pointerEvents="none" />
                <line x1={bx} y1={by} x2={cpx} y2={cpy} stroke="#a78bfa" strokeWidth="1" strokeDasharray="3 2" pointerEvents="none" />
                {/* Diamond handle */}
                <polygon
                  points={`${cpx},${cpy - s} ${cpx + s},${cpy} ${cpx},${cpy + s} ${cpx - s},${cpy}`}
                  fill="#7c3aed"
                  stroke="#fff"
                  strokeWidth="1.5"
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragCurveIndex(ci);
                    (e.target as SVGElement).setPointerCapture(e.pointerId);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    // Remove this curve on right-click
                    updateProfile(points, (curves ?? []).filter((_, i) => i !== ci));
                  }}
                />
                {/* CP coordinate label */}
                <text
                  x={cpx}
                  y={cpy - s - 4}
                  textAnchor="middle"
                  fill="#7c3aed"
                  fontSize="8"
                  fontFamily="monospace"
                  pointerEvents="none"
                >
                  cp
                </text>
              </g>
            );
          })}

          {/* Vertex handles */}
          {svgPoints.map(([cx, cy], i) => (
            <g key={`pt-${i}`}>
              <circle
                cx={cx}
                cy={cy}
                r={HANDLE_RADIUS}
                fill={hoveredPoint === i ? '#2563eb' : '#3b82f6'}
                stroke="#fff"
                strokeWidth="2"
                style={{ cursor: 'grab' }}
                onPointerDown={(e) => handlePointerDown(i, e)}
                onMouseEnter={() => setHoveredPoint(i)}
                onMouseLeave={() => setHoveredPoint(null)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  deletePoint(i);
                }}
              />
              {/* Point index label */}
              <text
                x={cx}
                y={cy - HANDLE_RADIUS - 4}
                textAnchor="middle"
                fill="#1e40af"
                fontSize="9"
                fontWeight="600"
                fontFamily="monospace"
                pointerEvents="none"
              >
                {i + 1}
              </text>
            </g>
          ))}

          {/* Origin marker */}
          {(() => {
            const [ox, oy] = toSvg([0, 0], scale, offsetX, offsetY, viewH);
            return (
              <g>
                <line x1={ox} y1={oy} x2={ox + 20} y2={oy} stroke="#ef4444" strokeWidth="1.5" markerEnd="url(#arrowX)" />
                <line x1={ox} y1={oy} x2={ox} y2={oy - 20} stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#arrowY)" />
                <text x={ox + 22} y={oy + 4} fontSize="9" fill="#ef4444" fontFamily="monospace">X</text>
                <text x={ox + 4} y={oy - 22} fontSize="9" fill="#22c55e" fontFamily="monospace">Y</text>
              </g>
            );
          })()}

          {/* Arrow markers */}
          <defs>
            <marker id="arrowX" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="#ef4444" />
            </marker>
            <marker id="arrowY" markerWidth="6" markerHeight="6" refX="3" refY="5" orient="auto">
              <path d="M0,0 L3,6 L6,0" fill="#22c55e" />
            </marker>
          </defs>
        </svg>
      </div>

      {/* Points table */}
      <details className="text-xs">
        <summary className="text-gray-500 cursor-pointer hover:text-gray-700">
          Point coordinates ({points.length} points)
        </summary>
        <div className="mt-2 max-h-40 overflow-y-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-400 border-b">
                <th className="py-1 pr-2">#</th>
                <th className="py-1 pr-2">X (mm)</th>
                <th className="py-1 pr-2">Y (mm)</th>
                <th className="py-1"></th>
              </tr>
            </thead>
            <tbody>
              {points.map((pt, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1 pr-2 text-gray-400">{i + 1}</td>
                  <td className="py-1 pr-2 font-mono">{pt[0]}</td>
                  <td className="py-1 pr-2 font-mono">{pt[1]}</td>
                  <td className="py-1">
                    {points.length > 3 && (
                      <button
                        type="button"
                        onClick={() => deletePoint(i)}
                        className="text-red-400 hover:text-red-600"
                        title="Delete point"
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
