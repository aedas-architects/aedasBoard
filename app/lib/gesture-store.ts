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

type GestureStore = {
  drag: DragState | null;
  resize: ResizeState | null;
  startDrag: (d: DragState) => void;
  endDrag: () => void;
  startResize: (r: ResizeState) => void;
  endResize: () => void;
};

export const useGesture = create<GestureStore>((set) => ({
  drag: null,
  resize: null,
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
