"use client";

import { motion } from "motion/react";
import { useBoard, type ImageItem } from "../../lib/board-store";
import { useViewport } from "../../lib/viewport-store";
import { LockBadge } from "./lock-badge";
import { ResizeHandles } from "./resize-handles";
import { useItemPointerHandler } from "./selectable";

export function ImageView({ item, selected }: { item: ImageItem; selected: boolean }) {
  const onPointerDown = useItemPointerHandler(item.id);
  const selectionCount = useBoard((s) => s.selectedIds.length);
  const zoom = useViewport((s) => s.zoom);

  const showHandles = selected && selectionCount === 1;

  return (
    <motion.div
      className="absolute"
      data-item={item.id}
      style={{
        left: item.x,
        top: item.y,
        width: item.w,
        height: item.h,
        rotate: item.rotation,
      }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      onPointerDown={onPointerDown}
    >
      <img
        src={item.src}
        alt={item.alt ?? ""}
        draggable={false}
        className="h-full w-full rounded-[var(--r-md)] object-cover"
        style={{ pointerEvents: "none", userSelect: "none" }}
      />

      {selected && (
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

      {showHandles && <ResizeHandles item={item} set="corners" zoom={zoom} />}
      {item.locked && selected && <LockBadge zoom={zoom} />}
    </motion.div>
  );
}
