"use client";

import { LayoutGrid } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ShapeKind } from "../lib/board-store";
import { useTool } from "../lib/tool-store";
import { useUI } from "../lib/ui-store";

type Entry = {
  kind: ShapeKind;
  label: string;
  shortcut?: string;
};

const ENTRIES: Entry[] = [
  { kind: "rectangle", label: "Rectangle", shortcut: "R" },
  { kind: "rounded", label: "Rounded" },
  { kind: "oval", label: "Oval", shortcut: "O" },
  { kind: "rhombus", label: "Rhombus" },
  { kind: "triangle", label: "Triangle" },
];

function Glyph({ kind }: { kind: ShapeKind }) {
  const stroke = "currentColor";
  const common = { fill: "none", stroke, strokeWidth: 1.6 } as const;
  switch (kind) {
    case "rectangle":
      return (
        <svg width="18" height="18" viewBox="0 0 18 18">
          <rect x="2.5" y="4.5" width="13" height="9" {...common} />
        </svg>
      );
    case "rounded":
      return (
        <svg width="18" height="18" viewBox="0 0 18 18">
          <rect x="2.5" y="4.5" width="13" height="9" rx="2.5" {...common} />
        </svg>
      );
    case "oval":
      return (
        <svg width="18" height="18" viewBox="0 0 18 18">
          <ellipse cx="9" cy="9" rx="6.5" ry="4.5" {...common} />
        </svg>
      );
    case "rhombus":
      return (
        <svg width="18" height="18" viewBox="0 0 18 18">
          <polygon points="9,2.5 15.5,9 9,15.5 2.5,9" {...common} />
        </svg>
      );
    case "triangle":
      return (
        <svg width="18" height="18" viewBox="0 0 18 18">
          <polygon points="9,2.5 15.5,15 2.5,15" {...common} />
        </svg>
      );
  }
}

export function ShapePicker({ onPick }: { onPick?: () => void }) {
  const activeTool = useTool((s) => s.active);
  const shapeKind = useTool((s) => s.shapeKind);
  const setShapeKind = useTool((s) => s.setShapeKind);
  const shapesLibraryOpen = useUI((s) => s.shapesLibraryOpen);
  const setShapesLibrary = useUI((s) => s.setShapesLibrary);

  const visible = activeTool === "shape" && !shapesLibraryOpen;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="shape-picker"
          initial={{ opacity: 0, x: -8, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -8, scale: 0.96 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto absolute left-[72px] top-1/2 z-30 -translate-y-1/2 flex flex-col gap-0.5 rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel p-1.5 shadow-[var(--shadow-md)]"
        >
          {ENTRIES.map((e) => {
            const active = shapeKind === e.kind;
            return (
              <motion.button
                key={e.kind}
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  setShapeKind(e.kind);
                  onPick?.();
                }}
                className={`group flex items-center gap-2 rounded-[var(--r-md)] px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-panel-soft text-ink"
                    : "text-ink-soft hover:bg-panel-soft"
                }`}
              >
                <span
                  className={active ? "text-[var(--accent)]" : "text-ink-soft"}
                >
                  <Glyph kind={e.kind} />
                </span>
                <span className="flex-1 text-left">{e.label}</span>
                {e.shortcut && (
                  <kbd className="font-mono text-[10px] text-muted">
                    {e.shortcut}
                  </kbd>
                )}
              </motion.button>
            );
          })}

          <span className="my-1 h-px w-full bg-[var(--line)]" />

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setShapesLibrary(true)}
            className="flex items-center gap-2 rounded-[var(--r-md)] px-2.5 py-1.5 text-[13px] font-medium text-ink-soft hover:bg-panel-soft"
          >
            <span className="text-ink-soft">
              <LayoutGrid size={15} strokeWidth={1.6} />
            </span>
            <span className="flex-1 text-left">More shapes…</span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
