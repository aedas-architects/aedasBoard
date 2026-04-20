"use client";

import { AnimatePresence, motion } from "motion/react";
import { newId, useBoard } from "../lib/board-store";
import { useTool, type FrameKind } from "../lib/tool-store";
import { useViewport } from "../lib/viewport-store";

type Preset = {
  id: FrameKind;
  label: string;
  w: number;
  h: number;
};

// "Custom" = drag-to-size on canvas (no fixed dims).
const CUSTOM: Preset = { id: "custom", label: "Custom", w: 0, h: 0 };

// Paper
const A4: Preset = { id: "a4", label: "A4", w: 794, h: 1123 };
const LETTER: Preset = { id: "letter", label: "Letter", w: 816, h: 1056 };

// Screen ratios
const R16_9: Preset = { id: "16:9", label: "16 : 9", w: 1280, h: 720 };
const R4_3: Preset = { id: "4:3", label: "4 : 3", w: 1024, h: 768 };
const R1_1: Preset = { id: "1:1", label: "1 : 1", w: 960, h: 960 };

// Devices
const MOBILE: Preset = { id: "mobile", label: "Mobile", w: 390, h: 844 };
const TABLET: Preset = { id: "tablet", label: "Tablet", w: 834, h: 1194 };
const DESKTOP: Preset = { id: "desktop", label: "Desktop", w: 1440, h: 900 };

const GRID: Preset[][] = [
  [CUSTOM, A4, LETTER],
  [R16_9, R4_3, R1_1],
  [MOBILE, TABLET, DESKTOP],
];

function Glyph({ preset }: { preset: Preset }) {
  const stroke = "currentColor";
  if (preset.id === "custom") {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect
          x="3"
          y="3"
          width="16"
          height="16"
          stroke={stroke}
          strokeWidth="1.4"
          strokeDasharray="2.5 2.5"
          rx="2"
        />
      </svg>
    );
  }
  // Portrait vs landscape based on aspect ratio; sized to fit a 22×22 box.
  const max = 16;
  const ratio = preset.w / preset.h;
  let w: number;
  let h: number;
  if (ratio >= 1) {
    w = max;
    h = Math.round(max / ratio);
  } else {
    h = max;
    w = Math.round(max * ratio);
  }
  const x = (22 - w) / 2;
  const y = (22 - h) / 2;
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        stroke={stroke}
        strokeWidth="1.5"
        rx="1.5"
      />
    </svg>
  );
}

export function FramePicker() {
  const active = useTool((s) => s.active);
  const frameKind = useTool((s) => s.frameKind);
  const setFrameKind = useTool((s) => s.setFrameKind);
  const setActive = useTool((s) => s.setActive);
  const pan = useViewport((s) => s.pan);
  const zoom = useViewport((s) => s.zoom);
  const addItem = useBoard((s) => s.addItem);
  const setSelection = useBoard((s) => s.setSelection);
  const startEdit = useBoard((s) => s.startEdit);

  const visible = active === "frame";

  const handlePick = (preset: Preset) => {
    if (preset.id === "custom") {
      setFrameKind("custom");
      return;
    }
    const cx = (window.innerWidth / 2 - pan.x) / zoom;
    const cy = (window.innerHeight / 2 - pan.y) / zoom;
    const id = newId("frame");
    addItem({
      id,
      type: "frame",
      x: cx - preset.w / 2,
      y: cy - preset.h / 2,
      w: preset.w,
      h: preset.h,
      rotation: 0,
      title: preset.label,
    });
    setFrameKind(preset.id);
    setSelection([id]);
    startEdit(id);
    setActive("select");
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="frame-picker"
          initial={{ opacity: 0, x: -8, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -8, scale: 0.96 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto absolute left-[72px] top-1/2 z-30 -translate-y-1/2 rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel p-2 shadow-[var(--shadow-md)]"
          style={{ width: 232 }}
        >
          <span className="mb-1.5 block px-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
            Frame size
          </span>
          <div className="flex flex-col gap-1.5">
            {GRID.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-1.5">
                {row.map((preset) => {
                  const activeCell =
                    frameKind === preset.id ||
                    (preset.id === "custom" && frameKind === "custom");
                  return (
                    <motion.button
                      key={preset.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handlePick(preset)}
                      className={`flex flex-col items-center gap-1 rounded-[var(--r-md)] px-1 py-2 transition-colors ${
                        activeCell
                          ? "bg-panel-soft text-ink"
                          : "text-ink-soft hover:bg-panel-soft"
                      }`}
                      title={`${preset.label}${preset.id === "custom" ? " (drag to size)" : ""}`}
                    >
                      <span
                        className={
                          activeCell ? "text-[var(--accent)]" : "text-ink-soft"
                        }
                      >
                        <Glyph preset={preset} />
                      </span>
                      <span className="text-[11px] font-medium">{preset.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="mt-2 px-1 font-mono text-[10px] leading-[1.4] text-muted">
            Click a preset or use Custom to drag a frame on the canvas.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
