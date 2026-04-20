"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTool } from "../lib/tool-store";

// §3.6 — six pen colors, ordered by frequency of use.
const PEN_COLORS = [
  "#1a1a1a",
  "#D94A38",
  "#2E6FDB",
  "#2E8B57",
  "#C97A1F",
  "#7A4DB8",
];

const PEN_WIDTHS = [
  { w: 2, label: "Thin" },
  { w: 4, label: "Medium" },
  { w: 8, label: "Thick" },
];

const HIGHLIGHTER_WIDTHS = [
  { w: 12, label: "Thin" },
  { w: 20, label: "Medium" },
  { w: 32, label: "Thick" },
];

export function PenPicker() {
  const activeTool = useTool((s) => s.active);
  const penColor = useTool((s) => s.penColor);
  const penWidth = useTool((s) => s.penWidth);
  const setPenColor = useTool((s) => s.setPenColor);
  const setPenWidth = useTool((s) => s.setPenWidth);

  const visible = activeTool === "pen" || activeTool === "highlighter";
  const isHighlighter = activeTool === "highlighter";
  const widths = isHighlighter ? HIGHLIGHTER_WIDTHS : PEN_WIDTHS;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="pen-picker"
          initial={{ opacity: 0, x: -8, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -8, scale: 0.96 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto absolute left-[72px] top-1/2 z-30 -translate-y-1/2 flex flex-col gap-2 rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel p-2.5 shadow-[var(--shadow-md)]"
          style={{ width: 164 }}
        >
          <div>
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              Color
            </span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: 6,
              }}
            >
              {PEN_COLORS.map((c) => (
                <motion.button
                  key={c}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  onClick={() => setPenColor(c)}
                  className="h-5 w-5 rounded-full border border-[var(--line)]"
                  style={{
                    background: c,
                    boxShadow: c === penColor ? "0 0 0 2px var(--accent)" : undefined,
                  }}
                  aria-label={`Pen color ${c}`}
                />
              ))}
            </div>
          </div>

          <span className="h-px w-full bg-[var(--line)]" />

          <div>
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              Weight
            </span>
            <div className="flex items-center justify-between gap-1">
              {widths.map((opt) => {
                const active = Math.abs(opt.w - penWidth) < 0.5;
                return (
                  <button
                    key={opt.w}
                    type="button"
                    onClick={() => setPenWidth(opt.w)}
                    title={opt.label}
                    className={`flex h-10 flex-1 items-center justify-center rounded-[var(--r-md)] transition-colors ${
                      active ? "bg-panel-soft" : "hover:bg-panel-soft"
                    }`}
                    aria-pressed={active}
                  >
                    <span
                      className="block rounded-full"
                      style={{
                        width: 28,
                        height: Math.min(10, Math.max(2, opt.w / 2)),
                        background: isHighlighter ? `${penColor}66` : penColor,
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
