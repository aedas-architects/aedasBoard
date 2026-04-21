"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { useBoard, type Item } from "../lib/board-store";
import { useViewport } from "../lib/viewport-store";

const W = 220;
const H = 150;
const PAD = 12;

function itemTint(it: Item): { fill: string; stroke?: string } {
  switch (it.type) {
    case "sticky":
      return { fill: it.color };
    case "shape":
      return { fill: it.fill, stroke: it.stroke };
    case "text":
      return { fill: "transparent", stroke: "#3a3a3a" };
    case "frame":
      return { fill: "transparent", stroke: "#C4BDA8" };
    case "stroke":
      return { fill: it.color };
    case "connector":
      return { fill: "#3a3a3a" };
    case "comment":
      return { fill: "#D94A38" };
    case "image":
      return { fill: "#C4BDA8", stroke: "#8a8578" };
    case "group":
      return { fill: "transparent", stroke: "#C4BDA8" };
  }
}

export function Minimap() {
  const visible = useViewport((s) => s.minimapVisible);
  const toggle = useViewport((s) => s.toggleMinimap);
  const pan = useViewport((s) => s.pan);
  const zoom = useViewport((s) => s.zoom);
  const setPan = useViewport((s) => s.setPan);
  const items = useBoard((s) => s.items);

  const dragRef = useRef<{ pointerId: number } | null>(null);

  // World-space viewport rect (what the user currently sees).
  const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
  const vh = typeof window !== "undefined" ? window.innerHeight : 1080;
  const view = {
    minX: -pan.x / zoom,
    minY: -pan.y / zoom,
    maxX: (vw - pan.x) / zoom,
    maxY: (vh - pan.y) / zoom,
  };

  // Bounds that combine content + viewport so the user can always see the frame.
  let minX = view.minX;
  let minY = view.minY;
  let maxX = view.maxX;
  let maxY = view.maxY;
  for (const it of items) {
    if (it.type === "connector" || it.type === "comment") continue;
    minX = Math.min(minX, it.x);
    minY = Math.min(minY, it.y);
    maxX = Math.max(maxX, it.x + it.w);
    maxY = Math.max(maxY, it.y + it.h);
  }
  const rangeW = Math.max(1, maxX - minX);
  const rangeH = Math.max(1, maxY - minY);
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const scale = Math.min(innerW / rangeW, innerH / rangeH);
  const offX = PAD + (innerW - rangeW * scale) / 2 - minX * scale;
  const offY = PAD + (innerH - rangeH * scale) / 2 - minY * scale;

  const viewRect = {
    x: view.minX * scale + offX,
    y: view.minY * scale + offY,
    w: (view.maxX - view.minX) * scale,
    h: (view.maxY - view.minY) * scale,
  };

  // Pan so that the given minimap pixel becomes the center of the viewport.
  const centerOnMinimap = (mx: number, my: number) => {
    const wx = (mx - offX) / scale;
    const wy = (my - offY) / scale;
    setPan({ x: vw / 2 - wx * zoom, y: vh / 2 - wy * zoom });
  };

  const onPointerDown = (e: React.PointerEvent<SVGElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    centerOnMinimap(mx, my);
    (e.currentTarget as SVGElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { pointerId: e.pointerId };
  };

  const onPointerMove = (e: React.PointerEvent<SVGElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    centerOnMinimap(e.clientX - rect.left, e.clientY - rect.top);
  };

  const onPointerUp = (e: React.PointerEvent<SVGElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      (e.currentTarget as SVGElement).releasePointerCapture?.(e.pointerId);
      dragRef.current = null;
    }
  };

  // Esc closes the minimap.
  useEffect(() => {
    if (!visible) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, toggle]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="minimap"
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          className="pointer-events-auto absolute bottom-[62px] right-[14px] z-30 overflow-hidden rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel shadow-[var(--shadow-md)]"
          style={{ width: W, height: H + 22 }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-2.5 pt-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              Minimap
            </span>
            <button
              type="button"
              onClick={toggle}
              className="rounded-[var(--r-xs)] px-1 text-[11px] text-muted hover:bg-panel-soft hover:text-ink"
              aria-label="Close minimap"
            >
              ×
            </button>
          </div>

          <svg
            width={W}
            height={H}
            className="block cursor-crosshair touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ background: "var(--bg)" }}
          >
            {items.map((it) => {
              if (it.type === "connector" || it.type === "comment") return null;
              if (it.type === "stroke") {
                // Draw the actual path at minimap scale so strokes read as lines,
                // not solid bounding rectangles.
                const pts: string[] = [];
                for (let i = 0; i < it.points.length; i += 2) {
                  const px = (it.x + it.points[i]) * scale + offX;
                  const py = (it.y + it.points[i + 1]) * scale + offY;
                  pts.push(`${px},${py}`);
                }
                return (
                  <polyline
                    key={it.id}
                    points={pts.join(" ")}
                    fill="none"
                    stroke={it.color}
                    strokeWidth={Math.max(0.6, it.strokeWidth * scale)}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={it.tool === "highlighter" ? 0.4 : 1}
                  />
                );
              }
              const tint = itemTint(it);
              const rx = it.x * scale + offX;
              const ry = it.y * scale + offY;
              const rw = Math.max(1, it.w * scale);
              const rh = Math.max(1, it.h * scale);
              return (
                <rect
                  key={it.id}
                  x={rx}
                  y={ry}
                  width={rw}
                  height={rh}
                  style={{ fill: tint.fill, stroke: tint.stroke }}
                  strokeWidth={tint.stroke ? 0.6 : 0}
                  rx={1}
                />
              );
            })}
            <rect
              x={viewRect.x}
              y={viewRect.y}
              width={viewRect.w}
              height={viewRect.h}
              fill="rgba(217, 74, 56, 0.08)"
              stroke="var(--accent)"
              strokeWidth={1.25}
              rx={1}
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
