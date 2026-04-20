import { create } from "zustand";

export type Tool =
  | "select"
  | "sticky"
  | "text"
  | "shape"
  | "pen"
  | "highlighter"
  | "eraser"
  | "connector"
  | "frame"
  | "comment"
  | "stickers"
  | "templates"
  | "more";

import type { ConnectorVariant, ShapeKind } from "./board-store";

export type PenMode = "pen" | "highlighter";

export type FrameKind =
  | "custom"
  | "a4"
  | "a4-landscape"
  | "letter"
  | "16:9"
  | "4:3"
  | "1:1"
  | "mobile"
  | "tablet"
  | "desktop";

type ToolState = {
  active: Tool;
  spaceHeld: boolean;
  /** Session defaults (§2.3–2.7 — persist as last-used values). */
  stickyColor: string;
  shapeKind: ShapeKind;
  penColor: string;
  penWidth: number;
  penMode: PenMode;
  connectorVariant: ConnectorVariant;
  connectorColor: string;
  frameKind: FrameKind;
  setActive: (t: Tool) => void;
  setSpaceHeld: (held: boolean) => void;
  setStickyColor: (c: string) => void;
  setShapeKind: (k: ShapeKind) => void;
  setPenColor: (c: string) => void;
  setPenWidth: (w: number) => void;
  setPenMode: (m: PenMode) => void;
  setConnectorVariant: (v: ConnectorVariant) => void;
  setConnectorColor: (c: string) => void;
  setFrameKind: (k: FrameKind) => void;
};

export const useTool = create<ToolState>((set) => ({
  active: "select",
  spaceHeld: false,
  stickyColor: "var(--sticky-canary)",
  shapeKind: "rectangle",
  penColor: "#1a1a1a",
  penWidth: 4,
  penMode: "pen",
  connectorVariant: "arrow",
  connectorColor: "#3a3a3a",
  frameKind: "custom",
  setActive: (active) => set({ active }),
  setSpaceHeld: (spaceHeld) => set({ spaceHeld }),
  setStickyColor: (stickyColor) => set({ stickyColor }),
  setShapeKind: (shapeKind) => set({ shapeKind }),
  setPenColor: (penColor) => set({ penColor }),
  setPenWidth: (penWidth) => set({ penWidth }),
  setPenMode: (penMode) => set({ penMode }),
  setConnectorVariant: (connectorVariant) => set({ connectorVariant }),
  setConnectorColor: (connectorColor) => set({ connectorColor }),
  setFrameKind: (frameKind) => set({ frameKind }),
}));

export const TOOL_SHORTCUTS: Record<string, Tool> = {
  KeyV: "select",
  KeyN: "sticky",
  KeyT: "text",
  KeyS: "shape",
  KeyP: "pen",
  KeyE: "eraser",
  KeyL: "connector",
  KeyF: "frame",
  KeyC: "comment",
};
