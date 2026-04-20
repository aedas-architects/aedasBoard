"use client";

import { motion } from "motion/react";
import { useBoard, type FontFamily, type StickyItem } from "../../lib/board-store";
import { useViewport } from "../../lib/viewport-store";
import { EditableText } from "./editable-text";
import { LockBadge } from "./lock-badge";
import { ResizeHandles } from "./resize-handles";
import { useItemDoubleClick, useItemPointerHandler } from "./selectable";

const FAMILY_CLASS: Record<FontFamily, string> = {
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
};

export function Sticky({ item, selected }: { item: StickyItem; selected: boolean }) {
  const onPointerDown = useItemPointerHandler(item.id);
  const onDoubleClick = useItemDoubleClick(item.id);
  const editing = useBoard((s) => s.editingId === item.id);
  const updateText = useBoard((s) => s.updateText);
  const stopEdit = useBoard((s) => s.stopEdit);
  const selectionCount = useBoard((s) => s.selectedIds.length);
  const zoom = useViewport((s) => s.zoom);

  const showHandles = selected && selectionCount === 1 && !editing;

  const family: FontFamily = item.fontFamily ?? "sans";
  const textClasses = [
    "break-words whitespace-pre-wrap",
    FAMILY_CLASS[family],
    item.italic ? "italic" : "",
    item.underline ? "underline" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.div
      className="absolute sticky-paper"
      data-item={item.id}
      style={{
        left: item.x,
        top: item.y,
        width: item.w,
        height: item.h,
        rotate: item.rotation,
        cursor: editing ? "text" : "default",
      }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      <div
        className="relative h-full w-full rounded-[var(--r-sm)] p-4"
        style={{ background: item.color, color: item.textColor }}
      >
        <EditableText
          editing={editing}
          value={item.text}
          onCommit={(text) => {
            updateText(item.id, text);
            stopEdit();
          }}
          onCancel={() => stopEdit()}
          className={textClasses}
          style={{
            fontSize: item.fontSize ?? 15,
            fontWeight: item.fontWeight ?? 500,
            lineHeight: 1.35,
            textAlign: item.align ?? "left",
          }}
        />
      </div>

      {selected && !editing && (
        <span
          className="pointer-events-none absolute rounded-[var(--r-sm)] border-2"
          style={{
            inset: -4 / zoom,
            borderWidth: 2 / zoom,
            borderColor: "var(--accent)",
            borderRadius: (4 + 4) / zoom,
          }}
          aria-hidden
        />
      )}

      {showHandles && <ResizeHandles item={item} set="corners" zoom={zoom} />}

      {item.locked && selected && !editing && <LockBadge zoom={zoom} />}
    </motion.div>
  );
}
