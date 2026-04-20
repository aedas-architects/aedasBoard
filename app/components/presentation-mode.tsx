"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo } from "react";
import { itemBBox, useBoard, type FrameItem } from "../lib/board-store";
import { useUI } from "../lib/ui-store";
import { useViewport } from "../lib/viewport-store";

export function PresentationMode() {
  const presenting = useUI((s) => s.presenting);
  const index = useUI((s) => s.presentationIndex);
  const setIndex = useUI((s) => s.setPresentationIndex);
  const stop = useUI((s) => s.stopPresenting);

  const items = useBoard((s) => s.items);
  const clearSelection = useBoard((s) => s.clearSelection);
  const fitToBBox = useViewport((s) => s.fitToBBox);

  const frames = useMemo(
    () => items.filter((it): it is FrameItem => it.type === "frame"),
    [items],
  );

  // Whenever the visible index or presenting toggle changes, fit to that frame.
  useEffect(() => {
    if (!presenting) return;
    const f = frames[index];
    if (!f) {
      // No frames at all → exit presentation.
      stop();
      return;
    }
    const b = itemBBox(f);
    const pad = 48;
    fitToBBox({
      minX: b.minX - pad,
      minY: b.minY - pad,
      maxX: b.maxX + pad,
      maxY: b.maxY + pad,
    });
    clearSelection();
  }, [presenting, index, frames, fitToBBox, clearSelection, stop]);

  // Keyboard navigation.
  useEffect(() => {
    if (!presenting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        stop();
      } else if (
        e.key === "ArrowRight" ||
        e.key === "PageDown" ||
        (e.code === "Space" && !e.shiftKey)
      ) {
        e.preventDefault();
        if (index < frames.length - 1) setIndex(index + 1);
      } else if (
        e.key === "ArrowLeft" ||
        e.key === "PageUp" ||
        (e.code === "Space" && e.shiftKey)
      ) {
        e.preventDefault();
        if (index > 0) setIndex(index - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        setIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setIndex(Math.max(0, frames.length - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting, index, frames.length, setIndex, stop]);

  return (
    <AnimatePresence>
      {presenting && frames.length > 0 && (
        <>
          <motion.div
            key="present-bar"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="pointer-events-auto fixed bottom-[22px] left-1/2 z-[70] flex -translate-x-1/2 items-center gap-1 rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel px-2 py-1.5 shadow-[var(--shadow-lg)]"
          >
            <button
              type="button"
              onClick={() => index > 0 && setIndex(index - 1)}
              disabled={index === 0}
              className={`flex h-8 w-8 items-center justify-center rounded-[var(--r-md)] ${
                index === 0
                  ? "text-muted opacity-40 cursor-not-allowed"
                  : "text-ink-soft hover:bg-panel-soft"
              }`}
              title="Previous (←)"
              aria-label="Previous frame"
            >
              <ChevronLeft size={15} strokeWidth={1.8} />
            </button>
            <div className="px-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft">
              {index + 1} <span className="text-muted">/</span> {frames.length}
            </div>
            <span className="max-w-[220px] truncate px-1 text-[12.5px] text-ink">
              {frames[index]?.title}
            </span>
            <button
              type="button"
              onClick={() =>
                index < frames.length - 1 && setIndex(index + 1)
              }
              disabled={index >= frames.length - 1}
              className={`flex h-8 w-8 items-center justify-center rounded-[var(--r-md)] ${
                index >= frames.length - 1
                  ? "text-muted opacity-40 cursor-not-allowed"
                  : "text-ink-soft hover:bg-panel-soft"
              }`}
              title="Next (→)"
              aria-label="Next frame"
            >
              <ChevronRight size={15} strokeWidth={1.8} />
            </button>
            <span className="mx-1 h-5 w-px bg-[var(--line)]" />
            <button
              type="button"
              onClick={stop}
              title="Exit presentation (Esc)"
              aria-label="Exit presentation"
              className="flex h-8 items-center gap-1 rounded-[var(--r-md)] px-2 text-[12px] font-medium text-ink-soft hover:bg-panel-soft"
            >
              <X size={13} strokeWidth={1.8} />
              Exit
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
