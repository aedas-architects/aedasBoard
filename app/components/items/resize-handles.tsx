"use client";

import type React from "react";
import { useBoard, type Item } from "../../lib/board-store";
import { useGesture, type ResizeHandle } from "../../lib/gesture-store";

type CornerSet = "corners" | "edges+corners" | "edges";

const HANDLE_SIZE = 12;

/**
 * Accent resize handles around an item. The handles render inside the item's
 * rotated frame so they follow its rotation naturally. Each handle dispatches
 * a resize gesture through the gesture store; the actual math lives in
 * canvas.tsx which listens on window pointer move/up.
 *
 * Handles are counter-scaled against the viewport zoom so they keep a
 * constant screen size.
 */
export function ResizeHandles({
  item,
  set = "corners",
  zoom,
}: {
  item: Item;
  set?: CornerSet;
  zoom: number;
}) {
  if (item.locked) return null;

  const handles: ResizeHandle[] =
    set === "corners"
      ? ["tl", "tr", "bl", "br"]
      : set === "edges"
      ? ["t", "b", "l", "r"]
      : ["tl", "tr", "bl", "br", "t", "b", "l", "r"];

  return (
    <>
      {handles.map((h) => (
        <Handle key={h} item={item} handle={h} zoom={zoom} />
      ))}
    </>
  );
}

function Handle({
  item,
  handle,
  zoom,
}: {
  item: Item;
  handle: ResizeHandle;
  zoom: number;
}) {
  function onPointerDown(e: React.PointerEvent<HTMLSpanElement>) {
    e.stopPropagation();
    useBoard.getState().setSelection([item.id]);
    useGesture.getState().startResize({
      pointerId: e.pointerId,
      itemId: item.id,
      handle,
      start: { x: item.x, y: item.y, w: item.w, h: item.h },
      clientStart: { x: e.clientX, y: e.clientY },
    });
  }

  const size = HANDLE_SIZE / zoom;
  const offset = size / 2;

  // Positioning within the item's own box (relative to its bounds).
  const pos: React.CSSProperties = {
    width: size,
    height: size,
    borderWidth: 2 / zoom,
    background: "var(--accent)",
    borderColor: "white",
    borderStyle: "solid",
    borderRadius: 3 / zoom,
    position: "absolute",
    boxShadow: `0 ${1 / zoom}px ${2 / zoom}px rgba(0,0,0,0.15)`,
  };

  const isTop = handle.includes("t");
  const isBot = handle.includes("b");
  const isLeft = handle.includes("l");
  const isRight = handle.includes("r");

  if (isTop) pos.top = -offset;
  if (isBot) pos.bottom = -offset;
  if (isLeft) pos.left = -offset;
  if (isRight) pos.right = -offset;
  // Edge handles center on the other axis
  if (handle === "t" || handle === "b") {
    pos.left = "50%";
    pos.marginLeft = -offset;
  }
  if (handle === "l" || handle === "r") {
    pos.top = "50%";
    pos.marginTop = -offset;
  }

  const cursor =
    handle === "tl" || handle === "br"
      ? "nwse-resize"
      : handle === "tr" || handle === "bl"
      ? "nesw-resize"
      : handle === "t" || handle === "b"
      ? "ns-resize"
      : "ew-resize";

  return <span style={{ ...pos, cursor }} onPointerDown={onPointerDown} />;
}
