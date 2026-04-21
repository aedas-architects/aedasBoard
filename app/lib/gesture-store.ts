import { create } from "zustand";
import { useBoard, type ConnectorEnd, type ItemId } from "./board-store";

type Point = { x: number; y: number };
type TargetStart = {
  id: ItemId;
  x: number;
  y: number;
  /** Present for connector targets — translate endpoints, not x/y. */
  connectorStart?: { from: ConnectorEnd; to: ConnectorEnd };
};

export type DragState = {
  pointerId: number;
  clientStart: Point;
  targets: TargetStart[];
};

export type ResizeHandle =
  | "tl"
  | "tr"
  | "bl"
  | "br"
  | "t"
  | "b"
  | "l"
  | "r";

export type ResizeState = {
  pointerId: number;
  itemId: ItemId;
  handle: ResizeHandle;
  start: { x: number; y: number; w: number; h: number };
  clientStart: Point;
};

export type RotateState = {
  pointerId: number;
  /** World-space center of the rotation (item center or multi-selection center). */
  centerWorld: Point;
  /** Screen-space angle (radians) from center to pointer at gesture start. */
  startAngle: number;
  /** Per-item snapshot: rotation in degrees + world-space offset from center. */
  startItems: {
    id: string;
    rotation: number;
    /** Item center offset from centerWorld, world coords. */
    offsetX: number;
    offsetY: number;
    w: number;
    h: number;
  }[];
};

type GestureStore = {
  drag: DragState | null;
  resize: ResizeState | null;
  rotate: RotateState | null;
  /** Current rotation angle in degrees shown in the angle chip (null when not rotating). */
  rotateAngleDeg: number | null;
  startDrag: (d: DragState) => void;
  endDrag: () => void;
  startResize: (r: ResizeState) => void;
  endResize: () => void;
  startRotate: (r: RotateState) => void;
  endRotate: () => void;
  setRotateAngleDeg: (deg: number | null) => void;
};

export const useGesture = create<GestureStore>((set) => ({
  drag: null,
  resize: null,
  rotate: null,
  rotateAngleDeg: null,
  startDrag: (drag) => {
    useBoard.getState().snapshot();
    set({ drag });
  },
  endDrag: () => set({ drag: null }),
  startResize: (resize) => {
    useBoard.getState().snapshot();
    set({ resize });
  },
  endResize: () => set({ resize: null }),
  startRotate: (rotate) => {
    useBoard.getState().snapshot();
    set({ rotate, rotateAngleDeg: null });
  },
  endRotate: () => set({ rotate: null, rotateAngleDeg: null }),
  setRotateAngleDeg: (rotateAngleDeg) => set({ rotateAngleDeg }),
}));

export const RESIZE_CURSOR: Record<ResizeHandle, string> = {
  tl: "nwse-resize",
  tr: "nesw-resize",
  bl: "nesw-resize",
  br: "nwse-resize",
  t: "ns-resize",
  b: "ns-resize",
  l: "ew-resize",
  r: "ew-resize",
};
