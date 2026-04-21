"use client";

import { useBoard, type GroupItem } from "../../lib/board-store";
import { useViewport } from "../../lib/viewport-store";
import { useItemPointerHandler } from "./selectable";

export function GroupBox({ item, selected }: { item: GroupItem; selected: boolean }) {
  const onPointerDown = useItemPointerHandler(item.id);
  const zoom = useViewport((s) => s.zoom);
  const items = useBoard((s) => s.items);

  // Compute live bbox from children so the group outline tracks moves.
  const children = items.filter((it) => item.childIds.includes(it.id));
  const pad = 8;
  let x = item.x, y = item.y, w = item.w, h = item.h;
  if (children.length > 0) {
    const minX = Math.min(...children.map((it) => it.x)) - pad;
    const minY = Math.min(...children.map((it) => it.y)) - pad;
    const maxX = Math.max(...children.map((it) => it.x + it.w)) + pad;
    const maxY = Math.max(...children.map((it) => it.y + it.h)) + pad;
    x = minX; y = minY; w = maxX - minX; h = maxY - minY;
  }

  return (
    <div
      className="absolute"
      data-item={item.id}
      style={{ left: x, top: y, width: w, height: h, pointerEvents: "none" }}
      onPointerDown={onPointerDown}
    >
      {/* Subtle group outline — dashed when unselected, accent when selected */}
      <span
        className="pointer-events-auto absolute inset-0"
        style={{
          border: selected
            ? `${1.5 / zoom}px solid var(--accent)`
            : `${1 / zoom}px dashed rgba(168,160,142,0.5)`,
          borderRadius: 6 / zoom,
          cursor: "default",
        }}
        onPointerDown={onPointerDown}
      />
    </div>
  );
}
