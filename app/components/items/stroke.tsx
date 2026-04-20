"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import { useBoard, type StrokeItem } from "../../lib/board-store";
import { useViewport } from "../../lib/viewport-store";
import { useItemPointerHandler } from "./selectable";

function pointsToPath(points: number[]) {
  if (points.length < 2) return "";
  let d = `M ${points[0].toFixed(1)} ${points[1].toFixed(1)}`;
  for (let i = 2; i < points.length; i += 2) {
    d += ` L ${points[i].toFixed(1)} ${points[i + 1].toFixed(1)}`;
  }
  return d;
}

export function Stroke({ item, selected }: { item: StrokeItem; selected: boolean }) {
  const onPointerDown = useItemPointerHandler(item.id);
  const zoom = useViewport((s) => s.zoom);
  const selectionCount = useBoard((s) => s.selectedIds.length);

  const d = useMemo(() => pointsToPath(item.points), [item.points]);
  const pad = item.strokeWidth;

  return (
    <motion.div
      className="absolute"
      data-item={item.id}
      style={{
        left: item.x - pad,
        top: item.y - pad,
        width: item.w + pad * 2,
        height: item.h + pad * 2,
        rotate: item.rotation,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.14 }}
      onPointerDown={onPointerDown}
    >
      <svg
        className="absolute inset-0 overflow-visible"
        width={item.w + pad * 2}
        height={item.h + pad * 2}
      >
        <g transform={`translate(${pad} ${pad})`}>
          <path
            d={d}
            stroke={item.color}
            strokeWidth={item.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            opacity={item.tool === "highlighter" ? 0.4 : 1}
          />
        </g>
      </svg>

      {selected && selectionCount === 1 && (
        <span
          className="pointer-events-none absolute border-2"
          style={{
            inset: -4 / zoom,
            borderWidth: 2 / zoom,
            borderColor: "var(--accent)",
            borderRadius: 8 / zoom,
          }}
          aria-hidden
        />
      )}
    </motion.div>
  );
}
