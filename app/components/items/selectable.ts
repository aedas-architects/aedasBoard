"use client";

import type React from "react";
import { itemBBox, rectsIntersect, useBoard, type GroupItem, type Item, type ItemId } from "../../lib/board-store";
import { useGesture } from "../../lib/gesture-store";
import { useTool } from "../../lib/tool-store";

/** Return the GroupItem that contains this itemId, if any. */
function findGroupOf(itemId: ItemId, items: Item[]): GroupItem | null {
  for (const it of items) {
    if (it.type === "group" && it.childIds.includes(itemId)) return it;
  }
  return null;
}

/** Build drag targets for every item in `ids`. Connector targets carry their
 *  endpoint snapshot so the drag handler can translate the line itself. */
export function buildDragTargets(ids: string[], items: Item[]) {
  return items
    .filter((it) => ids.includes(it.id) && !it.locked)
    .map((it) => {
      if (it.type === "connector") {
        return {
          id: it.id,
          x: it.x,
          y: it.y,
          connectorStart: { from: it.from, to: it.to },
        };
      }
      return { id: it.id, x: it.x, y: it.y };
    });
}

/** True if `b` is fully contained inside `a`. */
function contains(
  a: { minX: number; minY: number; maxX: number; maxY: number },
  b: { minX: number; minY: number; maxX: number; maxY: number },
) {
  return a.minX <= b.minX && a.minY <= b.minY && a.maxX >= b.maxX && a.maxY >= b.maxY;
}

/**
 * For every selected frame, pull in the items that geometrically sit inside it
 * so they move as a unit. Skip frames themselves and already-in-set items.
 */
function expandWithFrameChildren(
  selectedIds: string[],
  items: Item[],
): string[] {
  const out = new Set(selectedIds);
  const selectedFrames = items.filter(
    (it) => it.type === "frame" && selectedIds.includes(it.id),
  );
  if (selectedFrames.length === 0) return selectedIds;
  for (const frame of selectedFrames) {
    const fBox = itemBBox(frame);
    for (const it of items) {
      if (out.has(it.id)) continue;
      if (it.type === "frame") continue;
      if (it.type === "connector") continue; // connectors reroute automatically
      if (contains(fBox, itemBBox(it))) out.add(it.id);
    }
  }
  return [...out];
}

/** For every selected group, pull in its childIds so they move together. */
function expandWithGroupChildren(selectedIds: string[], items: Item[]): string[] {
  const out = new Set(selectedIds);
  for (const it of items) {
    if (it.type === "group" && selectedIds.includes(it.id)) {
      for (const cid of it.childIds) out.add(cid);
    }
  }
  return [...out];
}

export function useItemPointerHandler(id: ItemId) {
  return (e: React.PointerEvent<HTMLElement>) => {
    const { spaceHeld, setActive, active } = useTool.getState();
    const { editingId, items } = useBoard.getState();
    if (editingId === id) return;

    const isPanGesture = spaceHeld || e.button === 1 || e.button === 2;
    if (isPanGesture) return;

    // Cmd/Ctrl + click on a linked item → open its URL in a new tab.
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
      const live = useBoard.getState().items.find((it) => it.id === id);
      if (live?.link) {
        e.stopPropagation();
        try {
          window.open(live.link, "_blank", "noopener,noreferrer");
        } catch {
          /* ignored */
        }
        return;
      }
    }

    // Tools that work on items but don't select them — let the canvas root
    // handle the gesture by NOT stopping propagation.
    if (active === "eraser" || active === "connector") return;

    // Frames are containers — only select/hand modes interact with them.
    // Creation tools (sticky, text, shape, pen, etc.) fall through to place inside.
    const item = items.find((it) => it.id === id);
    const isNavigationMode = active === "select" || active === "hand";
    if (item?.type === "frame" && !isNavigationMode) return;

    e.stopPropagation();
    // In hand mode, select the item but stay in hand mode — don't switch tool.
    if (active !== "select" && active !== "hand") setActive("select");

    // If this item belongs to a group, redirect selection to the group —
    // unless the group is already selected (meaning we're drilling in).
    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    const prevSelected = useBoard.getState().selectedIds;
    const group = findGroupOf(id, useBoard.getState().items);
    const effectiveId =
      group && !prevSelected.includes(group.id) ? group.id : id;

    if (!(e.altKey && prevSelected.includes(effectiveId))) {
      useBoard.getState().select(effectiveId, additive);
    }

    // Alt / Option held → duplicate in place, drag the copies instead.
    if (e.altKey) {
      useBoard.getState().duplicateInPlace();
    }

    // Bring the picked-up selection to the top so it isn't obscured while
    // being moved (matches Miro / Figma behavior).
    useBoard.getState().bringToFront();

    const fresh = useBoard.getState();
    const withFrameChildren = expandWithFrameChildren(fresh.selectedIds, fresh.items);
    const withGroupChildren = expandWithGroupChildren(withFrameChildren, fresh.items);
    const targets = buildDragTargets(withGroupChildren, fresh.items);
    if (targets.length === 0) return;

    useGesture.getState().startDrag({
      pointerId: e.pointerId,
      clientStart: { x: e.clientX, y: e.clientY },
      targets,
    });
  };
}

export function useItemDoubleClick(id: ItemId) {
  return (e: React.MouseEvent) => {
    // Let frame double-clicks fall through when a non-select tool is active.
    const { active } = useTool.getState();
    const items = useBoard.getState().items;
    const item = items.find((it) => it.id === id);
    if (item?.type === "frame" && active !== "select") return;

    e.stopPropagation();
    useTool.getState().setActive("select");
    useBoard.getState().startEdit(id);
  };
}

// Re-exported for callers that want the same containment helper.
export { rectsIntersect };
