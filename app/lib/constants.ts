export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 4;
export const ZOOM_STEP = 0.1;

export const GRID_SIZE = 24;

export const FIT_PADDING = 0.1;

// Bounding box of the demo scene in world coordinates.
// Swap for a real items[] store in §3.
export const DEMO_SCENE_BBOX = {
  minX: 340,
  minY: 130,
  maxX: 1100,
  maxY: 660,
};

export function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}
