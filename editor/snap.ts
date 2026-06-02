import type { Frame } from "../src/ir/schema.ts";

/**
 * Alignment snapping — the "PowerPoint" feel: while dragging, a box's edges and
 * center latch onto sibling edges/centers and the parent's edges/center when
 * they come within THRESHOLD px, and a guide line is reported so the canvas can
 * draw it. This is what makes movement "pause" exactly where things line up.
 *
 * All coordinates are PARENT-LOCAL (same space as Frame.x/y).
 */

export const THRESHOLD = 6;

export type Guide = { axis: "x" | "y"; pos: number };
type Box = { w: number; h: number };

const xEdges = (f: Frame) => [f.x, f.x + f.w / 2, f.x + f.w];
const yEdges = (f: Frame) => [f.y, f.y + f.h / 2, f.y + f.h];

function targetsX(siblings: Frame[], parent: Box): number[] {
  return [0, parent.w / 2, parent.w, ...siblings.flatMap(xEdges)];
}
function targetsY(siblings: Frame[], parent: Box): number[] {
  return [0, parent.h / 2, parent.h, ...siblings.flatMap(yEdges)];
}

/** Snap a moving box (position changes; size fixed). */
export function snapMove(
  moving: Frame,
  siblings: Frame[],
  parent: Box,
): { x: number; y: number; guides: Guide[] } {
  const guides: Guide[] = [];
  let x = moving.x;
  let y = moving.y;

  const tx = targetsX(siblings, parent);
  let bestX = { d: THRESHOLD + 0.001, set: x, guide: 0 };
  for (const edge of xEdges(moving)) {
    for (const t of tx) {
      const d = Math.abs(edge - t);
      if (d < bestX.d) bestX = { d, set: moving.x + (t - edge), guide: t };
    }
  }
  if (bestX.d <= THRESHOLD) {
    x = bestX.set;
    guides.push({ axis: "x", pos: bestX.guide });
  }

  const ty = targetsY(siblings, parent);
  let bestY = { d: THRESHOLD + 0.001, set: y, guide: 0 };
  for (const edge of yEdges(moving)) {
    for (const t of ty) {
      const d = Math.abs(edge - t);
      if (d < bestY.d) bestY = { d, set: moving.y + (t - edge), guide: t };
    }
  }
  if (bestY.d <= THRESHOLD) {
    y = bestY.set;
    guides.push({ axis: "y", pos: bestY.guide });
  }

  return { x: Math.round(x), y: Math.round(y), guides };
}

/** Snap a resizing box's right/bottom edges (top-left stays fixed). */
export function snapResize(
  frame: Frame,
  siblings: Frame[],
  parent: Box,
): { w: number; h: number; guides: Guide[] } {
  const guides: Guide[] = [];
  let w = frame.w;
  let h = frame.h;

  const right = frame.x + frame.w;
  let bestX = { d: THRESHOLD + 0.001, set: w, guide: 0 };
  for (const t of targetsX(siblings, parent)) {
    const d = Math.abs(right - t);
    if (d < bestX.d && t - frame.x >= 8) bestX = { d, set: t - frame.x, guide: t };
  }
  if (bestX.d <= THRESHOLD) {
    w = bestX.set;
    guides.push({ axis: "x", pos: bestX.guide });
  }

  const bottom = frame.y + frame.h;
  let bestY = { d: THRESHOLD + 0.001, set: h, guide: 0 };
  for (const t of targetsY(siblings, parent)) {
    const d = Math.abs(bottom - t);
    if (d < bestY.d && t - frame.y >= 8) bestY = { d, set: t - frame.y, guide: t };
  }
  if (bestY.d <= THRESHOLD) {
    h = bestY.set;
    guides.push({ axis: "y", pos: bestY.guide });
  }

  return { w: Math.round(w), h: Math.round(h), guides };
}
