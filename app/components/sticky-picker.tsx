"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTool } from "../lib/tool-store";

const SWATCHES = [
  "var(--sticky-canary)",
  "var(--sticky-peach)",
  "var(--sticky-rose)",
  "var(--sticky-sky)",
  "var(--sticky-sage)",
  "var(--sticky-lilac)",
  "var(--sticky-stone)",
  "var(--sticky-ink)",
];

export function StickyPicker() {
  const activeTool = useTool((s) => s.active);
  const stickyColor = useTool((s) => s.stickyColor);
  const setStickyColor = useTool((s) => s.setStickyColor);

  const visible = activeTool === "sticky";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="sticky-picker"
          initial={{ opacity: 0, x: -8, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -8, scale: 0.96 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto absolute left-[72px] top-1/2 z-30 -translate-y-1/2 rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel p-2 shadow-[var(--shadow-md)]"
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 44px)",
              gap: 8,
            }}
          >
            {SWATCHES.map((s) => {
              const active = s === stickyColor;
              return (
                <motion.button
                  key={s}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  onClick={() => setStickyColor(s)}
                  className="relative h-[44px] w-[44px] rounded-[var(--r-sm)] border border-[var(--line)]"
                  style={{
                    background: s,
                    boxShadow: active
                      ? "0 0 0 2px var(--accent), var(--shadow-paper)"
                      : "var(--shadow-paper)",
                  }}
                  aria-label={`Sticky color ${s}`}
                  aria-pressed={active}
                />
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
