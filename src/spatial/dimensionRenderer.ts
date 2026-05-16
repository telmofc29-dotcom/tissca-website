// src/spatial/dimensionRenderer.ts
//
// Canvas 2D rendering helpers for dimension lines, labels, and tick marks.
// Used by PlanTab + ElevationTab for consistent dimension styling.

// ─── Style constants ─────────────────────────────────────────────────────────

const DIM_COLOR = '#94A3B8';
const DIM_GAP_COLOR = '#E2A33E';
const DIM_FONT = '10px Inter, system-ui, sans-serif';
const DIM_FONT_SMALL = '8px Inter, system-ui, sans-serif';
const DIM_TICK = 4;
const DIM_LINE_WIDTH = 0.7;

// ─── Horizontal dimension ───────────────────────────────────────────────────

/**
 * Draw a horizontal dimension line with tick marks and centred label.
 * x1, x2 = pixel positions; y = pixel baseline.
 */
export function drawDimH(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  label: string,
  options?: { color?: string; font?: string; tickSize?: number },
) {
  const color = options?.color ?? DIM_COLOR;
  const font = options?.font ?? DIM_FONT;
  const tick = options?.tickSize ?? DIM_TICK;

  const minWidth = Math.abs(x2 - x1);
  if (minWidth < 8) return; // too small to label

  ctx.strokeStyle = color;
  ctx.lineWidth = DIM_LINE_WIDTH;

  // Ticks
  ctx.beginPath();
  ctx.moveTo(x1, y - tick);
  ctx.lineTo(x1, y + tick);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y - tick);
  ctx.lineTo(x2, y + tick);
  ctx.stroke();

  // Line
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();

  // Label
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(label, (x1 + x2) / 2, y + 3);
}

// ─── Vertical dimension ─────────────────────────────────────────────────────

/**
 * Draw a vertical dimension line with tick marks and rotated label.
 * y1, y2 = pixel positions; x = pixel baseline.
 */
export function drawDimV(
  ctx: CanvasRenderingContext2D,
  x: number,
  y1: number,
  y2: number,
  label: string,
  options?: { color?: string; font?: string; tickSize?: number },
) {
  const color = options?.color ?? DIM_COLOR;
  const font = options?.font ?? DIM_FONT;
  const tick = options?.tickSize ?? DIM_TICK;

  const minHeight = Math.abs(y2 - y1);
  if (minHeight < 8) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = DIM_LINE_WIDTH;

  // Ticks
  ctx.beginPath();
  ctx.moveTo(x - tick, y1);
  ctx.lineTo(x + tick, y1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - tick, y2);
  ctx.lineTo(x + tick, y2);
  ctx.stroke();

  // Line
  ctx.beginPath();
  ctx.moveTo(x, y1);
  ctx.lineTo(x, y2);
  ctx.stroke();

  // Label (rotated)
  ctx.save();
  ctx.translate(x - 6, (y1 + y2) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label, 0, 0);
  ctx.restore();
}

// ─── Gap dimension ──────────────────────────────────────────────────────────

/**
 * Draw a gap dimension (amber highlight) — horizontal.
 */
export function drawGapH(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  label: string,
  options?: { color?: string },
) {
  drawDimH(ctx, x1, x2, y, label, {
    color: options?.color ?? DIM_GAP_COLOR,
    font: DIM_FONT_SMALL,
  });
}

// ─── Aligned (angled) dimension along a wall ────────────────────────────────

/**
 * Draw a dimension line aligned to a wall direction.
 * sx, sy, ex, ey = pixel positions of the start and end points.
 * offsetPx = perpendicular pixel offset from the wall.
 */
export function drawDimAligned(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  offsetPx: number,
  label: string,
  options?: { color?: string; font?: string },
) {
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 8) return;

  const color = options?.color ?? DIM_COLOR;
  const font = options?.font ?? DIM_FONT;

  // Unit direction and perpendicular
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;

  // Offset start/end
  const osx = sx + nx * offsetPx;
  const osy = sy + ny * offsetPx;
  const oex = ex + nx * offsetPx;
  const oey = ey + ny * offsetPx;

  const tick = DIM_TICK;

  ctx.strokeStyle = color;
  ctx.lineWidth = DIM_LINE_WIDTH;

  // Extension lines (from geometry to dimension line)
  ctx.beginPath();
  ctx.moveTo(sx + nx * (offsetPx - tick * 2), sy + ny * (offsetPx - tick * 2));
  ctx.lineTo(osx + nx * tick, osy + ny * tick);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ex + nx * (offsetPx - tick * 2), ey + ny * (offsetPx - tick * 2));
  ctx.lineTo(oex + nx * tick, oey + ny * tick);
  ctx.stroke();

  // Ticks at ends
  ctx.beginPath();
  ctx.moveTo(osx - nx * tick, osy - ny * tick);
  ctx.lineTo(osx + nx * tick, osy + ny * tick);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(oex - nx * tick, oey - ny * tick);
  ctx.lineTo(oex + nx * tick, oey + ny * tick);
  ctx.stroke();

  // Main dimension line
  ctx.beginPath();
  ctx.moveTo(osx, osy);
  ctx.lineTo(oex, oey);
  ctx.stroke();

  // Label at midpoint
  const mx = (osx + oex) / 2;
  const my = (osy + oey) / 2;
  const angle = Math.atan2(dy, dx);

  ctx.save();
  ctx.translate(mx, my);
  // Flip text for readability when angle is > 90°
  const flipAngle = angle > Math.PI / 2 || angle < -Math.PI / 2 ? angle + Math.PI : angle;
  ctx.rotate(flipAngle);
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label, 0, -3);
  ctx.restore();
}
