import { itemBBox, type Item } from "./board-store";

export type BBox = { minX: number; minY: number; maxX: number; maxY: number };

/** A single guide line the UI will paint while snapping. */
export type SnapGuide = {
  axis: "x" | "y";
  /** World coordinate on the axis where the dashed line sits. */
  at: number;
  /** Extent along the perpendicular axis so the line covers both shapes. */
  start: number;
  end: number;
};

export type SnapResult = {
  dx: number;
  dy: number;
  guides: SnapGuide[];
};

/** Edges a bbox exposes on the X axis. */
function xEdges(b: BBox) {
  return {
    left: b.minX,
    center: (b.minX + b.maxX) / 2,
    right: b.maxX,
  };
}
function yEdges(b: BBox) {
  return {
    top: b.minY,
    center: (b.minY + b.maxY) / 2,
    bottom: b.maxY,
  };
}

/**
 * Given a moving bbox (already offset by raw dx/dy) and the rest of the items,
 * return a refined (dx, dy) that snaps to the nearest edge/center alignment
 * within `threshold` world units, along with the guide lines to draw.
 */
export function computeSnap(
  startBBox: BBox,
  staticItems: Item[],
  rawDx: number,
  rawDy: number,
  threshold: number,
): SnapResult {
  const movingBBox: BBox = {
    minX: startBBox.minX + rawDx,
    minY: startBBox.minY + rawDy,
    maxX: startBBox.maxX + rawDx,
    maxY: startBBox.maxY + rawDy,
  };

  const candidates = staticItems
    .filter(
      (it) =>
        it.type !== "connector" && it.type !== "comment" && it.type !== "stroke",
    )
    .map(itemBBox);

  if (candidates.length === 0) {
    return { dx: rawDx, dy: rawDy, guides: [] };
  }

  const mvX = xEdges(movingBBox);
  const mvY = yEdges(movingBBox);

  let bestDeltaX: number | null = null;
  let bestDeltaXAbs = threshold + 1;
  let guideX: SnapGuide | null = null;

  let bestDeltaY: number | null = null;
  let bestDeltaYAbs = threshold + 1;
  let guideY: SnapGuide | null = null;

  for (const c of candidates) {
    const cx = xEdges(c);
    const cy = yEdges(c);

    // X-axis alignments: for every pair (movingEdge, candidateEdge), compute
    // the delta that would align them. Consider same-type pairs (left-left,
    // right-right, center-center) and cross-type (left-right, right-left).
    const xPairs: Array<[number, number]> = [
      [mvX.left, cx.left],
      [mvX.right, cx.right],
      [mvX.center, cx.center],
      [mvX.left, cx.right],
      [mvX.right, cx.left],
    ];
    for (const [m, t] of xPairs) {
      const delta = t - m;
      const abs = Math.abs(delta);
      if (abs <= threshold && abs < bestDeltaXAbs) {
        bestDeltaXAbs = abs;
        bestDeltaX = delta;
        guideX = {
          axis: "x",
          at: t,
          start: Math.min(movingBBox.minY + 0, c.minY),
          end: Math.max(movingBBox.maxY + 0, c.maxY),
        };
      }
    }

    const yPairs: Array<[number, number]> = [
      [mvY.top, cy.top],
      [mvY.bottom, cy.bottom],
      [mvY.center, cy.center],
      [mvY.top, cy.bottom],
      [mvY.bottom, cy.top],
    ];
    for (const [m, t] of yPairs) {
      const delta = t - m;
      const abs = Math.abs(delta);
      if (abs <= threshold && abs < bestDeltaYAbs) {
        bestDeltaYAbs = abs;
        bestDeltaY = delta;
        guideY = {
          axis: "y",
          at: t,
          start: Math.min(movingBBox.minX + 0, c.minX),
          end: Math.max(movingBBox.maxX + 0, c.maxX),
        };
      }
    }
  }

  const dx = bestDeltaX !== null ? rawDx + bestDeltaX : rawDx;
  const dy = bestDeltaY !== null ? rawDy + bestDeltaY : rawDy;

  // Recompute guide extents against the FINAL moving bbox so the line
  // overlaps both shapes cleanly.
  const guides: SnapGuide[] = [];
  if (guideX !== null) {
    const newBB: BBox = {
      minX: startBBox.minX + dx,
      minY: startBBox.minY + dy,
      maxX: startBBox.maxX + dx,
      maxY: startBBox.maxY + dy,
    };
    guides.push({
      axis: "x",
      at: guideX.at,
      start: Math.min(newBB.minY, guideX.start),
      end: Math.max(newBB.maxY, guideX.end),
    });
  }
  if (guideY !== null) {
    const newBB: BBox = {
      minX: startBBox.minX + dx,
      minY: startBBox.minY + dy,
      maxX: startBBox.maxX + dx,
      maxY: startBBox.maxY + dy,
    };
    guides.push({
      axis: "y",
      at: guideY.at,
      start: Math.min(newBB.minX, guideY.start),
      end: Math.max(newBB.maxX, guideY.end),
    });
  }

  return { dx, dy, guides };
}
