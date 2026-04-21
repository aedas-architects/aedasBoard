import { create } from "zustand";

export type Tool =
  | "hand"
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

export type PenPreset = { color: string; width: number };

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
  penPresets: [PenPreset, PenPreset, PenPreset];
  activePenPreset: 0 | 1 | 2;
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
  setPenPreset: (idx: 0 | 1 | 2, patch: Partial<PenPreset>) => void;
  setActivePenPreset: (idx: 0 | 1 | 2) => void;
  setConnectorVariant: (v: ConnectorVariant) => void;
  setConnectorColor: (c: string) => void;
  setFrameKind: (k: FrameKind) => void;
};

export const useTool = create<ToolState>((set, get) => ({
  active: "hand",
  spaceHeld: false,
  stickyColor: "var(--sticky-canary)",
  shapeKind: "rectangle",
  penColor: "#1a1a1a",
  penWidth: 4,
  penMode: "pen",
  penPresets: [
    { color: "#1a1a1a", width: 4 },
    { color: "#D94A38", width: 4 },
    { color: "#2E8B57", width: 4 },
  ],
  activePenPreset: 0,
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
  setPenPreset: (idx, patch) => {
    const presets = [...get().penPresets] as [PenPreset, PenPreset, PenPreset];
    presets[idx] = { ...presets[idx], ...patch };
    const update: Partial<ToolState> = { penPresets: presets };
    if (idx === get().activePenPreset) {
      if (patch.color !== undefined) update.penColor = patch.color;
      if (patch.width !== undefined) update.penWidth = patch.width;
    }
    set(update);
  },
  setActivePenPreset: (idx) => {
    const preset = get().penPresets[idx];
    set({ activePenPreset: idx, penColor: preset.color, penWidth: preset.width });
  },
  setConnectorVariant: (connectorVariant) => set({ connectorVariant }),
  setConnectorColor: (connectorColor) => set({ connectorColor }),
  setFrameKind: (frameKind) => set({ frameKind }),
}));

export const TOOL_SHORTCUTS: Record<string, Tool> = {
  KeyH: "hand",
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
