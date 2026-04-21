import { create } from "zustand";
import { clamp, FIT_PADDING, ZOOM_MAX, ZOOM_MIN } from "./constants";

export type Point = { x: number; y: number };
export type BBox = { minX: number; minY: number; maxX: number; maxY: number };

type ViewportState = {
  pan: Point;
  zoom: number;
  gridVisible: boolean;
  gridStyle: "lines" | "dots";
  minimapVisible: boolean;

  setPan: (pan: Point) => void;
  panBy: (dx: number, dy: number) => void;
  setZoom: (zoom: number) => void;

  /** Change zoom so the world point under (clientX, clientY) stays put. */
  zoomAt: (clientX: number, clientY: number, nextZoom: number) => void;

  /** Step zoom by ±ZOOM_STEP around viewport center. */
  zoomStep: (direction: 1 | -1) => void;

  /** Reset to 100% around viewport center (world origin to screen center). */
  zoomTo100: () => void;

  /** Fit a world-space bbox into the viewport with 10% padding. */
  fitToBBox: (bbox: BBox) => void;

  toggleGrid: () => void;
  setGridStyle: (style: "lines" | "dots") => void;
  toggleMinimap: () => void;
};

export const useViewport = create<ViewportState>((set, get) => ({
  pan: { x: 0, y: 0 },
  zoom: 1,
  gridVisible: true,
  gridStyle: "lines",
  minimapVisible: false,

  setPan: (pan) => set({ pan }),
  panBy: (dx, dy) => set({ pan: { x: get().pan.x + dx, y: get().pan.y + dy } }),
  setZoom: (zoom) => set({ zoom: clamp(zoom, ZOOM_MIN, ZOOM_MAX) }),

  zoomAt: (clientX, clientY, nextZoom) => {
    const { pan, zoom } = get();
    const z2 = clamp(nextZoom, ZOOM_MIN, ZOOM_MAX);
    if (z2 === zoom) return;
    const wx = (clientX - pan.x) / zoom;
    const wy = (clientY - pan.y) / zoom;
    set({
      zoom: z2,
      pan: { x: clientX - wx * z2, y: clientY - wy * z2 },
    });
  },

  zoomStep: (direction) => {
    const { zoom } = get();
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const next = clamp(
      Math.round((zoom + direction * 0.1) * 10) / 10,
      ZOOM_MIN,
      ZOOM_MAX,
    );
    get().zoomAt(cx, cy, next);
  },

  zoomTo100: () => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    get().zoomAt(cx, cy, 1);
  },

  fitToBBox: (bbox) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = bbox.maxX - bbox.minX;
    const h = bbox.maxY - bbox.minY;
    if (w <= 0 || h <= 0) return;
    const pad = 1 + FIT_PADDING * 2;
    const z = clamp(Math.min(vw / (w * pad), vh / (h * pad)), ZOOM_MIN, ZOOM_MAX);
    const cx = (bbox.minX + bbox.maxX) / 2;
    const cy = (bbox.minY + bbox.maxY) / 2;
    set({ zoom: z, pan: { x: vw / 2 - cx * z, y: vh / 2 - cy * z } });
  },

  toggleGrid: () => set({ gridVisible: !get().gridVisible }),
  setGridStyle: (gridStyle) => set({ gridStyle }),
  toggleMinimap: () => set({ minimapVisible: !get().minimapVisible }),
}));
