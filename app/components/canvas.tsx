"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  itemBBox,
  newId,
  rectsIntersect,
  useBoard,
  type Item,
} from "../lib/board-store";
import { GRID_SIZE } from "../lib/constants";
import { ingestClipboard, ingestFiles } from "../lib/image-ingest";
import { RESIZE_CURSOR, useGesture, type ResizeHandle } from "../lib/gesture-store";
import { TOOL_SHORTCUTS, type Tool, useTool } from "../lib/tool-store";
import { useUI } from "../lib/ui-store";
import { useViewport } from "../lib/viewport-store";
import { AlignBar } from "./align-bar";
import { ConnectorPicker } from "./connector-picker";
import { ContextMenu, type ContextTarget } from "./context-menu";
import { FramePicker } from "./frame-picker";
import { ItemRenderer, useSortedItems } from "./items/item-renderer";
import { PenPicker } from "./pen-picker";
import { ShapePicker } from "./shape-picker";
import { ShapesLibrary } from "./shapes-library";
import { StickersPanel } from "./stickers-panel";
import { StickyPicker } from "./sticky-picker";
import { StyleBar } from "./style-bar";

/* -------- Marquee helpers -------- */

type Marquee = { startX: number; startY: number; endX: number; endY: number };

function marqueeRect(m: Marquee) {
  return {
    left: Math.min(m.startX, m.endX),
    top: Math.min(m.startY, m.endY),
    width: Math.abs(m.endX - m.startX),
    height: Math.abs(m.endY - m.startY),
  };
}

function screenToWorld(
  screen: { x: number; y: number },
  pan: { x: number; y: number },
  zoom: number,
) {
  return { x: (screen.x - pan.x) / zoom, y: (screen.y - pan.y) / zoom };
}

/** Build an SVG path from flat [x1,y1,x2,y2,...] world-space points. */
function pointsToPath(points: number[]) {
  if (points.length < 2) return "";
  let d = `M ${points[0].toFixed(1)} ${points[1].toFixed(1)}`;
  for (let i = 2; i < points.length; i += 2) {
    d += ` L ${points[i].toFixed(1)} ${points[i + 1].toFixed(1)}`;
  }
  return d;
}

/**
 * Place a new item centered (or top-left, for text) at a world point.
 * Selects it, enters edit mode, and reverts the active tool to Select
 * (§2.3–2.5 "single-use" creation behavior).
 */
function createItemFromDrag(
  tool: Tool,
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const { addItem, startEdit } = useBoard.getState();
  const { setActive, stickyColor, shapeKind } = useTool.getState();

  const dragX = Math.abs(end.x - start.x);
  const dragY = Math.abs(end.y - start.y);
  const dragged = dragX > 4 || dragY > 4;

  const rect = {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    w: Math.max(1, dragX),
    h: Math.max(1, dragY),
  };

  if (tool === "frame") {
    const w = dragged ? Math.max(rect.w, 80) : 720;
    const h = dragged ? Math.max(rect.h, 80) : 420;
    const frame: Item = {
      id: newId("frame"),
      type: "frame",
      x: dragged ? rect.x : start.x - w / 2,
      y: dragged ? rect.y : start.y - h / 2,
      w,
      h,
      rotation: 0,
      title: "Frame",
    };
    addItem(frame);
    startEdit(frame.id);
    setActive("select");
    return;
  }

  if (tool === "comment") {
    const comment: Item = {
      id: newId("comment"),
      type: "comment",
      x: start.x,
      y: start.y,
      w: 36,
      h: 36,
      rotation: 0,
      thread: [],
      resolved: false,
    };
    addItem(comment);
    setActive("select");
    useBoard.getState().setSelection([comment.id]);
    return;
  }

  let item: Item | null = null;

  if (tool === "sticky") {
    const size = dragged ? Math.max(rect.w, rect.h, 80) : 220;
    item = {
      id: newId("sticky"),
      type: "sticky",
      x: dragged ? rect.x : start.x - size / 2,
      y: dragged ? rect.y : start.y - size / 2,
      w: size,
      h: size,
      rotation: 0,
      text: "",
      color: stickyColor,
      textColor: stickyColor === "var(--sticky-ink)" ? "#F5F2EC" : "var(--ink)",
    };
  } else if (tool === "text") {
    item = {
      id: newId("text"),
      type: "text",
      x: dragged ? rect.x : start.x,
      y: dragged ? rect.y : start.y - 12,
      w: dragged ? Math.max(rect.w, 100) : 120,
      h: dragged ? Math.max(rect.h, 28) : 28,
      rotation: 0,
      text: "",
      fontSize: 20,
      autoSize: !dragged,
      align: "left",
      fontFamily: "sans",
      fontWeight: 500,
    };
  } else if (tool === "shape") {
    const isWide = shapeKind === "rectangle" || shapeKind === "rounded";
    const defW = isWide ? 180 : 140;
    const defH = isWide ? 120 : 140;
    item = {
      id: newId("shape"),
      type: "shape",
      x: dragged ? rect.x : start.x - defW / 2,
      y: dragged ? rect.y : start.y - defH / 2,
      w: dragged ? Math.max(rect.w, 20) : defW,
      h: dragged ? Math.max(rect.h, 20) : defH,
      rotation: 0,
      kind: shapeKind,
      text: "",
      fill: "#FFFFFF",
      stroke: "var(--ink)",
    };
  }

  if (!item) return;
  addItem(item);
  startEdit(item.id);
  setActive("select");
}

/**
 * Commit a finished pen/highlighter draft into the items store.
 * Normalizes coordinates so that `item.x`/`item.y` is the bounding-box
 * top-left and `points[]` are relative to that origin.
 */
function commitStroke(draft: {
  points: number[];
  color: string;
  width: number;
  tool: "pen" | "highlighter";
}) {
  const { points, color, width, tool } = draft;
  if (points.length < 4) return;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    minX = Math.min(minX, points[i]);
    maxX = Math.max(maxX, points[i]);
    minY = Math.min(minY, points[i + 1]);
    maxY = Math.max(maxY, points[i + 1]);
  }

  const local: number[] = new Array(points.length);
  for (let i = 0; i < points.length; i += 2) {
    local[i] = points[i] - minX;
    local[i + 1] = points[i + 1] - minY;
  }

  useBoard.getState().addItem({
    id: newId("stroke"),
    type: "stroke",
    x: minX,
    y: minY,
    w: Math.max(2, maxX - minX),
    h: Math.max(2, maxY - minY),
    rotation: 0,
    points: local,
    color,
    strokeWidth: width,
    tool,
  });
}

/* -------- Custom cursors (SVG data URLs, tip offset as hotspot) -------- */

// Lucide-ish pencil. Hotspot = tip near (3, 21).
const PEN_CURSOR =
  `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="#ffffff" stroke="#1a1a1a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>`,
  )}") 3 21, crosshair`;

// Flat marker tip for highlighter.
const HIGHLIGHTER_CURSOR =
  `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="#FFF3A8" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>`,
  )}") 3 21, crosshair`;

// Simple round eraser.
const ERASER_CURSOR =
  `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="#FDEBE8" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>`,
  )}") 11 11, crosshair`;

/* -------- Helpers -------- */

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

/** Walk up from the DOM element under the cursor to find an item id. */
function findItemIdAt(clientX: number, clientY: number): string | null {
  const els = document.elementsFromPoint(clientX, clientY);
  for (const el of els) {
    const item = (el as HTMLElement).closest?.("[data-item]");
    if (item) return (item as HTMLElement).dataset.item ?? null;
  }
  return null;
}

/** Is a world-space point within `dist` of any segment in `stroke`? */
function pointNearStroke(
  stroke: { x: number; y: number; points: number[] },
  p: { x: number; y: number },
  dist: number,
) {
  const pts = stroke.points;
  const d2 = dist * dist;
  for (let i = 0; i < pts.length - 2; i += 2) {
    const ax = stroke.x + pts[i];
    const ay = stroke.y + pts[i + 1];
    const bx = stroke.x + pts[i + 2];
    const by = stroke.y + pts[i + 3];
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.y - ay) * dy) / lenSq));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    const ex = p.x - cx;
    const ey = p.y - cy;
    if (ex * ex + ey * ey <= d2) return true;
  }
  return false;
}

/* -------- Canvas -------- */

export function Canvas() {
  const rootRef = useRef<HTMLDivElement>(null);
  const panGestureRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  const pan = useViewport((s) => s.pan);
  const zoom = useViewport((s) => s.zoom);
  const gridVisible = useViewport((s) => s.gridVisible);
  const setPan = useViewport((s) => s.setPan);
  const panBy = useViewport((s) => s.panBy);
  const zoomAt = useViewport((s) => s.zoomAt);
  const zoomStep = useViewport((s) => s.zoomStep);
  const zoomTo100 = useViewport((s) => s.zoomTo100);
  const fitToBBox = useViewport((s) => s.fitToBBox);

  const activeTool = useTool((s) => s.active);
  const setActiveTool = useTool((s) => s.setActive);
  const spaceHeld = useTool((s) => s.spaceHeld);
  const setSpaceHeld = useTool((s) => s.setSpaceHeld);

  const presenting = useUI((s) => s.presenting);

  const items = useSortedItems();
  const [marquee, setMarquee] = useState<Marquee | null>(null);

  type PenDraft = {
    pointerId: number;
    points: number[];
    color: string;
    width: number;
    tool: "pen" | "highlighter";
  };
  const [penDraft, setPenDraft] = useState<PenDraft | null>(null);

  type CreationDraft = {
    pointerId: number;
    tool: Tool;
    startWorld: { x: number; y: number };
    endWorld: { x: number; y: number };
  };
  const [creationDraft, setCreationDraft] = useState<CreationDraft | null>(null);

  type ConnectorDraft = {
    pointerId: number;
    from: { itemId: string } | { x: number; y: number };
    fromWorld: { x: number; y: number };
    toWorld: { x: number; y: number };
  };
  const [connectorDraft, setConnectorDraft] = useState<ConnectorDraft | null>(null);

  type EraserDraft = {
    pointerId: number;
  };
  const [eraserDraft, setEraserDraft] = useState<EraserDraft | null>(null);

  const [contextTarget, setContextTarget] = useState<ContextTarget | null>(null);

  const drag = useGesture((s) => s.drag);
  const resize = useGesture((s) => s.resize);

  /* ----- Window-level drag listener ----- */
  useEffect(() => {
    if (!drag) return;
    document.body.style.cursor = "grabbing";

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== drag.pointerId) return;
      const { zoom } = useViewport.getState();
      const dx = (e.clientX - drag.clientStart.x) / zoom;
      const dy = (e.clientY - drag.clientStart.y) / zoom;
      const byId = new Map(drag.targets.map((t) => [t.id, t]));
      useBoard.setState((s) => ({
        items: s.items.map((it) => {
          const t = byId.get(it.id);
          if (!t) return it;
          // Connectors translate by moving each free-point endpoint; item-
          // anchored endpoints stay put (the shape they're attached to is
          // dragged separately — or not at all).
          if (it.type === "connector" && t.connectorStart) {
            const translate = (end: typeof t.connectorStart.from) =>
              end.kind === "point"
                ? ({ kind: "point", x: end.x + dx, y: end.y + dy } as const)
                : end;
            return {
              ...it,
              from: translate(t.connectorStart.from),
              to: translate(t.connectorStart.to),
            };
          }
          return { ...it, x: t.x + dx, y: t.y + dy };
        }),
      }));
    };
    const onUp = () => useGesture.getState().endDrag();

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.style.cursor = "";
    };
  }, [drag]);

  /* ----- Window-level resize listener ----- */
  useEffect(() => {
    if (!resize) return;
    document.body.style.cursor = RESIZE_CURSOR[resize.handle];

    const MIN = 40;

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== resize.pointerId) return;
      const { zoom } = useViewport.getState();
      const dx = (e.clientX - resize.clientStart.x) / zoom;
      const dy = (e.clientY - resize.clientStart.y) / zoom;
      const h: ResizeHandle = resize.handle;

      const hasLeft = h.includes("l");
      const hasRight = h.includes("r");
      const hasTop = h.includes("t");
      const hasBottom = h.includes("b");

      // Track each edge independently so the moving edge can cross the anchor
      // and the rect flips naturally (Miro / Figma behavior).
      let leftX = resize.start.x + (hasLeft ? dx : 0);
      let rightX = resize.start.x + resize.start.w + (hasRight ? dx : 0);
      let topY = resize.start.y + (hasTop ? dy : 0);
      let bottomY = resize.start.y + resize.start.h + (hasBottom ? dy : 0);

      // Min-size clamp: stop the moving edge MIN away from the anchor on the
      // same side of the anchor it's currently sitting on, so the rect can't
      // collapse through itself.
      const wRaw = rightX - leftX;
      if (Math.abs(wRaw) < MIN) {
        const dir = wRaw >= 0 ? 1 : -1;
        if (hasLeft && !hasRight) leftX = rightX - dir * MIN;
        else if (hasRight && !hasLeft) rightX = leftX + dir * MIN;
      }
      const hRaw = bottomY - topY;
      if (Math.abs(hRaw) < MIN) {
        const dir = hRaw >= 0 ? 1 : -1;
        if (hasTop && !hasBottom) topY = bottomY - dir * MIN;
        else if (hasBottom && !hasTop) bottomY = topY + dir * MIN;
      }

      const x = Math.min(leftX, rightX);
      const y = Math.min(topY, bottomY);
      const w = Math.abs(rightX - leftX);
      const hh = Math.abs(bottomY - topY);

      // For text widget: resizing horizontally locks autoSize off (Figma-style).
      const current = useBoard.getState().items.find((it) => it.id === resize.itemId);
      const patch: Record<string, unknown> = { x, y, w, h: hh };
      if (current?.type === "text") patch.autoSize = false;

      useBoard.getState().updateItem(resize.itemId, patch as Partial<Item>);
    };
    const onUp = () => useGesture.getState().endResize();

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.style.cursor = "";
    };
  }, [resize]);

  const cursor = useMemo(() => {
    if (spaceHeld) return "grab";
    if (activeTool === "pen") return PEN_CURSOR;
    if (activeTool === "highlighter") return HIGHLIGHTER_CURSOR;
    if (activeTool === "eraser") return ERASER_CURSOR;
    if (activeTool === "sticky" || activeTool === "text" || activeTool === "shape")
      return "crosshair";
    return "grab";
  }, [activeTool, spaceHeld]);

  /* Wheel — ctrl/cmd zooms to cursor, otherwise pans by delta. */
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      const root = rootRef.current;
      if (!root?.contains(e.target as Node)) return;

      // Walk up from the event target — if any ancestor is actually scrollable
      // in the direction of the wheel, let the browser handle it (popup
      // panels, modals, long lists, etc).
      let el: HTMLElement | null = e.target as HTMLElement;
      while (el && el !== root) {
        const style = window.getComputedStyle(el);
        const canScrollY =
          (style.overflowY === "auto" || style.overflowY === "scroll") &&
          el.scrollHeight > el.clientHeight;
        const canScrollX =
          (style.overflowX === "auto" || style.overflowX === "scroll") &&
          el.scrollWidth > el.clientWidth;
        if (
          (Math.abs(e.deltaY) >= Math.abs(e.deltaX) && canScrollY) ||
          (Math.abs(e.deltaX) > Math.abs(e.deltaY) && canScrollX)
        ) {
          return;
        }
        el = el.parentElement;
      }

      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.0015);
        const next = useViewport.getState().zoom * factor;
        zoomAt(e.clientX, e.clientY, next);
      } else {
        panBy(-e.deltaX, -e.deltaY);
      }
    },
    [panBy, zoomAt],
  );

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  /* Keyboard shortcuts */
  useEffect(() => {
    function keydown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;

      if (e.code === "Space" && !e.repeat) {
        setSpaceHeld(true);
        return;
      }

      // Cmd/Ctrl + / or Cmd/Ctrl + K → command palette
      if ((e.metaKey || e.ctrlKey) && (e.key === "/" || e.code === "KeyK")) {
        e.preventDefault();
        useUI.getState().setCommandPalette(true);
        return;
      }
      // Cmd/Ctrl + F → search on board
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyF") {
        e.preventDefault();
        useUI.getState().setSearch(true);
        return;
      }
      // Shift + ? → shortcut cheat sheet
      if (e.shiftKey && e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        useUI.getState().setShortcuts(true);
        return;
      }

      if (e.metaKey || e.ctrlKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          zoomStep(1);
          return;
        }
        if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          zoomStep(-1);
          return;
        }
        // Cmd/Ctrl+A: select all
        if (e.code === "KeyA") {
          e.preventDefault();
          const all = useBoard.getState().items.map((it) => it.id);
          useBoard.getState().setSelection(all);
          return;
        }
        // Cmd/Ctrl+Z: undo — Cmd/Ctrl+Shift+Z: redo
        if (e.code === "KeyZ") {
          e.preventDefault();
          if (e.shiftKey) useBoard.getState().redo();
          else useBoard.getState().undo();
          return;
        }
        // Cmd/Ctrl+Y: alternate redo
        if (e.code === "KeyY") {
          e.preventDefault();
          useBoard.getState().redo();
          return;
        }
        // Cmd/Ctrl+C / X / V
        if (e.code === "KeyC") {
          e.preventDefault();
          useBoard.getState().copySelection();
          return;
        }
        if (e.code === "KeyX") {
          e.preventDefault();
          useBoard.getState().cutSelection();
          return;
        }
        if (e.code === "KeyV") {
          e.preventDefault();
          useBoard.getState().pasteClipboard();
          return;
        }
        // Cmd/Ctrl+L: toggle lock on selection
        if (e.code === "KeyL") {
          e.preventDefault();
          useBoard.getState().toggleLockSelected();
          return;
        }
        // Cmd/Ctrl + ] / [: z-order nudge
        if (e.key === "]") {
          e.preventDefault();
          if (e.shiftKey) useBoard.getState().bringToFront();
          else useBoard.getState().bringForward();
          return;
        }
        if (e.key === "[") {
          e.preventDefault();
          if (e.shiftKey) useBoard.getState().sendToBack();
          else useBoard.getState().sendBackward();
          return;
        }
      }

      if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        if (e.key === "1") {
          zoomTo100();
          return;
        }
        if (e.key === "3") {
          const bbox = useBoard.getState().contentBBox();
          if (bbox) fitToBBox(bbox);
          return;
        }
        if (e.key === "Escape") {
          useBoard.getState().clearSelection();
          return;
        }
      }

      // Delete / Backspace: drop selection (skip while editing text).
      if (e.key === "Delete" || e.key === "Backspace") {
        const { editingId, selectedIds, deleteSelected } = useBoard.getState();
        // Always stop the browser's default (Backspace = history-back in some browsers)
        e.preventDefault();
        if (process.env.NODE_ENV !== "production") {
          console.debug(
            "[board] delete key",
            { editingId, selectedIds: selectedIds.slice() },
          );
        }
        if (editingId) return;
        if (selectedIds.length === 0) return;
        deleteSelected();
        return;
      }

      // Arrow keys: nudge selection. Shift = 10px.
      if (
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight"
      ) {
        const { editingId, selectedIds, nudgeSelected } = useBoard.getState();
        if (editingId) return;
        if (selectedIds.length === 0) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx =
          e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy =
          e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        nudgeSelected(dx, dy);
        return;
      }

      // Cmd/Ctrl + D → duplicate selection.
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyD") {
        const { editingId, selectedIds, duplicateSelected } = useBoard.getState();
        if (editingId) return;
        if (selectedIds.length === 0) return;
        e.preventDefault();
        duplicateSelected();
        return;
      }

      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        const tool = TOOL_SHORTCUTS[e.code];
        if (tool) {
          e.preventDefault();
          setActiveTool(tool);
        }
      }
    }

    function keyup(e: KeyboardEvent) {
      if (e.code === "Space") setSpaceHeld(false);
    }

    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
    };
  }, [fitToBBox, setActiveTool, setSpaceHeld, zoomStep, zoomTo100]);

  /* Clipboard paste — if it's an image or image URL, drop it at the viewport
   * center. Otherwise let the browser handle it (e.g., inside editable text). */
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const { pan: p, zoom: z } = useViewport.getState();
      const at = {
        x: (window.innerWidth / 2 - p.x) / z,
        y: (window.innerHeight / 2 - p.y) / z,
      };
      void ingestClipboard(e, at).then((handled) => {
        if (handled) e.preventDefault();
      });
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  /* Body cursor reflects space-held (overrides tool cursor while held) */
  useEffect(() => {
    document.body.style.cursor = spaceHeld && !panGestureRef.current ? "grab" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [spaceHeld]);

  /** Erase strokes whose segments pass near the given world point. */
  const eraseAt = useCallback((world: { x: number; y: number }) => {
    const all = useBoard.getState().items;
    const hits: string[] = [];
    for (const it of all) {
      if (it.type !== "stroke") continue;
      if (it.locked) continue;
      const dist = it.strokeWidth + 8;
      if (
        world.x < it.x - dist ||
        world.x > it.x + it.w + dist ||
        world.y < it.y - dist ||
        world.y > it.y + it.h + dist
      ) {
        continue;
      }
      if (pointNearStroke(it, world, dist)) hits.push(it.id);
    }
    if (hits.length === 0) return;
    const state = useBoard.getState();
    state.snapshot();
    useBoard.setState({
      items: state.items.filter((it) => !hits.includes(it.id)),
      selectedIds: state.selectedIds.filter((id) => !hits.includes(id)),
    });
  }, []);

  /* Pointer gestures:
   *  - Space / middle / right anywhere → pan
   *  - Select tool + empty canvas + no modifier → pan (Miro default)
   *  - Select tool + empty canvas + Shift → marquee
   *  - Sticky / Text / Shape tools + empty canvas → place item on up (§2.3–2.5)
   */
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // If a text edit is in progress, blur it by letting the click fall through
    // normally — the contentEditable's onBlur will commit.
    const middleOrRight = e.button === 1 || e.button === 2;

    const explicitPan = spaceHeld || middleOrRight;
    // Stickers is a passive "browsing" tool — treat it like Select so the user
    // can still pan the canvas while the panel is open.
    const passiveTool =
      activeTool === "select" || activeTool === "stickers";
    const defaultPan = passiveTool && !e.shiftKey;

    if (explicitPan || defaultPan) {
      e.currentTarget.setPointerCapture(e.pointerId);
      const { pan: p } = useViewport.getState();
      panGestureRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startPanX: p.x,
        startPanY: p.y,
      };
      document.body.style.cursor = "grabbing";
      return;
    }

    if (passiveTool && e.shiftKey) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setMarquee({
        startX: e.clientX,
        startY: e.clientY,
        endX: e.clientX,
        endY: e.clientY,
      });
      return;
    }

    if (
      activeTool === "sticky" ||
      activeTool === "text" ||
      activeTool === "shape" ||
      activeTool === "frame" ||
      activeTool === "comment"
    ) {
      e.currentTarget.setPointerCapture(e.pointerId);
      const world = screenToWorld(
        { x: e.clientX, y: e.clientY },
        pan,
        useViewport.getState().zoom,
      );
      setCreationDraft({
        pointerId: e.pointerId,
        tool: activeTool,
        startWorld: world,
        endWorld: world,
      });
      return;
    }

    // Connector tool: click-to-drag between items.
    if (activeTool === "connector") {
      e.currentTarget.setPointerCapture(e.pointerId);
      const world = screenToWorld(
        { x: e.clientX, y: e.clientY },
        pan,
        useViewport.getState().zoom,
      );
      const hitId = findItemIdAt(e.clientX, e.clientY);
      setConnectorDraft({
        pointerId: e.pointerId,
        from: hitId ? { itemId: hitId } : { x: world.x, y: world.y },
        fromWorld: world,
        toWorld: world,
      });
      return;
    }

    // Eraser tool: drag over strokes to delete them.
    if (activeTool === "eraser") {
      e.currentTarget.setPointerCapture(e.pointerId);
      setEraserDraft({ pointerId: e.pointerId });
      const world = screenToWorld(
        { x: e.clientX, y: e.clientY },
        pan,
        useViewport.getState().zoom,
      );
      eraseAt(world);
      return;
    }

    // Pen / Highlighter: start a draft stroke.
    if (activeTool === "pen" || activeTool === "highlighter") {
      e.currentTarget.setPointerCapture(e.pointerId);
      const { penColor, penWidth } = useTool.getState();
      const world = screenToWorld(
        { x: e.clientX, y: e.clientY },
        pan,
        useViewport.getState().zoom,
      );
      setPenDraft({
        pointerId: e.pointerId,
        points: [world.x, world.y],
        color: penColor,
        width: penWidth,
        tool: activeTool,
      });
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const g = panGestureRef.current;
    if (g && g.pointerId === e.pointerId) {
      setPan({
        x: g.startPanX + (e.clientX - g.startX),
        y: g.startPanY + (e.clientY - g.startY),
      });
      return;
    }
    if (penDraft && penDraft.pointerId === e.pointerId) {
      const { pan: p, zoom: z } = useViewport.getState();
      const world = screenToWorld({ x: e.clientX, y: e.clientY }, p, z);
      setPenDraft({ ...penDraft, points: [...penDraft.points, world.x, world.y] });
      return;
    }
    if (creationDraft && creationDraft.pointerId === e.pointerId) {
      const { pan: p, zoom: z } = useViewport.getState();
      const world = screenToWorld({ x: e.clientX, y: e.clientY }, p, z);
      setCreationDraft({ ...creationDraft, endWorld: world });
      return;
    }
    if (connectorDraft && connectorDraft.pointerId === e.pointerId) {
      const { pan: p, zoom: z } = useViewport.getState();
      const world = screenToWorld({ x: e.clientX, y: e.clientY }, p, z);
      setConnectorDraft({ ...connectorDraft, toWorld: world });
      return;
    }
    if (eraserDraft && eraserDraft.pointerId === e.pointerId) {
      const { pan: p, zoom: z } = useViewport.getState();
      const world = screenToWorld({ x: e.clientX, y: e.clientY }, p, z);
      eraseAt(world);
      return;
    }
    if (marquee) {
      setMarquee({ ...marquee, endX: e.clientX, endY: e.clientY });
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const g = panGestureRef.current;
    if (g && g.pointerId === e.pointerId) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      panGestureRef.current = null;
      document.body.style.cursor = "";

      const dragged =
        Math.abs(e.clientX - g.startX) > 3 || Math.abs(e.clientY - g.startY) > 3;
      const passiveUpTool =
        activeTool === "select" || activeTool === "stickers";
      if (!dragged && passiveUpTool && !e.shiftKey && !spaceHeld) {
        useBoard.getState().clearSelection();
      }
      return;
    }

    if (creationDraft && creationDraft.pointerId === e.pointerId) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      const { pan: p, zoom: z } = useViewport.getState();
      const endWorld = screenToWorld({ x: e.clientX, y: e.clientY }, p, z);
      const draft = creationDraft;
      setCreationDraft(null);
      createItemFromDrag(draft.tool, draft.startWorld, endWorld);
      return;
    }

    if (penDraft && penDraft.pointerId === e.pointerId) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      const draft = penDraft;
      setPenDraft(null);
      if (draft.points.length >= 4) commitStroke(draft);
      return;
    }

    if (connectorDraft && connectorDraft.pointerId === e.pointerId) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      const draft = connectorDraft;
      setConnectorDraft(null);

      const { pan: p, zoom: z } = useViewport.getState();
      const endWorld = screenToWorld({ x: e.clientX, y: e.clientY }, p, z);
      const endHitId = findItemIdAt(e.clientX, e.clientY);

      // Both ends are the same item, or endpoints coincide → discard.
      const fromItemId = "itemId" in draft.from ? draft.from.itemId : null;
      if (fromItemId && endHitId && fromItemId === endHitId) {
        useTool.getState().setActive("select");
        return;
      }
      const dx = endWorld.x - draft.fromWorld.x;
      const dy = endWorld.y - draft.fromWorld.y;
      if (!fromItemId && !endHitId && Math.hypot(dx, dy) < 6) {
        useTool.getState().setActive("select");
        return;
      }

      const fromEnd =
        fromItemId !== null
          ? ({ kind: "item", itemId: fromItemId } as const)
          : ({ kind: "point", x: draft.fromWorld.x, y: draft.fromWorld.y } as const);
      const toEnd =
        endHitId !== null
          ? ({ kind: "item", itemId: endHitId } as const)
          : ({ kind: "point", x: endWorld.x, y: endWorld.y } as const);

      const { connectorVariant, connectorColor } = useTool.getState();
      useBoard.getState().addItem({
        id: newId("conn"),
        type: "connector",
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        rotation: 0,
        from: fromEnd,
        to: toEnd,
        stroke: connectorColor,
        strokeWidth: connectorVariant === "block" ? 3 : 2,
        arrowEnd: connectorVariant !== "line",
        variant: connectorVariant,
      });
      useTool.getState().setActive("select");
      return;
    }

    if (eraserDraft && eraserDraft.pointerId === e.pointerId) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setEraserDraft(null);
      return;
    }

    if (marquee) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      // Resolve intersections in world space.
      const { pan: p, zoom: z } = useViewport.getState();
      const a = screenToWorld({ x: marquee.startX, y: marquee.startY }, p, z);
      const b = screenToWorld({ x: marquee.endX, y: marquee.endY }, p, z);
      const rect = {
        minX: Math.min(a.x, b.x),
        minY: Math.min(a.y, b.y),
        maxX: Math.max(a.x, b.x),
        maxY: Math.max(a.y, b.y),
      };

      // Only treat as marquee if there was meaningful drag; otherwise it's a click-empty.
      const dragged =
        Math.abs(marquee.endX - marquee.startX) > 3 ||
        Math.abs(marquee.endY - marquee.startY) > 3;

      if (dragged) {
        const hits = useBoard
          .getState()
          .items.filter((it) => it.type !== "frame") // frames pass through
          .filter((it) => rectsIntersect(itemBBox(it), rect))
          .map((it) => it.id);

        const existing = useBoard.getState().selectedIds;
        const next = e.shiftKey ? Array.from(new Set([...existing, ...hits])) : hits;
        useBoard.getState().setSelection(next);
      }
      setMarquee(null);
    }
  }

  const gridBackground = useMemo(() => {
    if (!gridVisible) return { image: "none", size: "auto", position: "0 0" };
    const minor = Math.max(6, GRID_SIZE * zoom);
    const major = Math.max(30, GRID_SIZE * 5 * zoom);
    // Keep the grid present but quiet — components should read louder than the
    // paper underneath (Miro has a very soft grid that doesn't compete).
    const minorAlpha = Math.max(0, Math.min(0.16, (zoom - 0.35) * 0.32));
    const minorLine = `rgba(168, 160, 142, ${minorAlpha.toFixed(3)})`;
    const majorLine = "rgba(168, 160, 142, 0.16)";
    return {
      image: [
        `linear-gradient(to right, ${majorLine} 1px, transparent 1px)`,
        `linear-gradient(to bottom, ${majorLine} 1px, transparent 1px)`,
        `linear-gradient(to right, ${minorLine} 1px, transparent 1px)`,
        `linear-gradient(to bottom, ${minorLine} 1px, transparent 1px)`,
      ].join(", "),
      size: `${major}px ${major}px, ${major}px ${major}px, ${minor}px ${minor}px, ${minor}px ${minor}px`,
      position: `${pan.x}px ${pan.y}px, ${pan.x}px ${pan.y}px, ${pan.x}px ${pan.y}px, ${pan.x}px ${pan.y}px`,
    };
  }, [gridVisible, zoom, pan.x, pan.y]);

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 overflow-hidden select-none"
      style={{
        cursor,
        backgroundColor: "var(--bg)",
        backgroundImage: gridBackground.image,
        backgroundSize: gridBackground.size,
        backgroundPosition: gridBackground.position,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDragOver={(e) => {
        if (e.dataTransfer?.types?.includes("Files")) {
          e.preventDefault();
        }
      }}
      onDrop={(e) => {
        if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) return;
        e.preventDefault();
        const { pan: p, zoom: z } = useViewport.getState();
        const at = screenToWorld({ x: e.clientX, y: e.clientY }, p, z);
        void ingestFiles(e.dataTransfer.files, at);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        const itemId = findItemIdAt(e.clientX, e.clientY);
        if (itemId) {
          setContextTarget({
            kind: "item",
            id: itemId,
            clientX: e.clientX,
            clientY: e.clientY,
          });
        } else {
          const world = screenToWorld(
            { x: e.clientX, y: e.clientY },
            pan,
            useViewport.getState().zoom,
          );
          setContextTarget({
            kind: "canvas",
            clientX: e.clientX,
            clientY: e.clientY,
            worldX: world.x,
            worldY: world.y,
          });
        }
      }}
    >
      {/* Chrome (screen-space) — hidden during presentation */}
      {!presenting && (
        <>
          <StyleBar />
          <AlignBar />
          <ShapePicker />
          <ShapesLibrary />
          <StickyPicker />
          <PenPicker />
          <ConnectorPicker />
          <FramePicker />
          <StickersPanel />
        </>
      )}

      {/* World layer — transformed by pan + zoom */}
      <div
        className="absolute left-0 top-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          willChange: "transform",
        }}
      >
        {/* Data-driven items */}
        {items.map((item) => (
          <ItemRenderer key={item.id} item={item} />
        ))}

        {/* In-flight pen stroke (world-space, follows pan/zoom) */}
        {penDraft && penDraft.points.length >= 4 && (
          <svg
            className="pointer-events-none absolute overflow-visible"
            style={{ left: 0, top: 0, width: 1, height: 1 }}
          >
            <path
              d={pointsToPath(penDraft.points)}
              stroke={penDraft.color}
              strokeWidth={penDraft.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={penDraft.tool === "highlighter" ? 0.4 : 1}
            />
          </svg>
        )}

        {/* In-flight creation preview (world-space) */}
        {creationDraft && (() => {
          const s = creationDraft.startWorld;
          const e = creationDraft.endWorld;
          const x = Math.min(s.x, e.x);
          const y = Math.min(s.y, e.y);
          const w = Math.max(1, Math.abs(e.x - s.x));
          const h = Math.max(1, Math.abs(e.y - s.y));
          const dragged = w > 4 || h > 4;
          if (!dragged) return null;
          return (
            <div
              className="pointer-events-none absolute"
              style={{
                left: x,
                top: y,
                width: w,
                height: h,
                border: `${1.5 / zoom}px dashed var(--accent)`,
                borderRadius: creationDraft.tool === "shape" ? 4 / zoom : 2 / zoom,
                background: "rgba(217, 74, 56, 0.06)",
              }}
            />
          );
        })()}

        {/* In-flight connector preview */}
        {connectorDraft && (
          <svg
            className="pointer-events-none absolute overflow-visible"
            style={{ left: 0, top: 0, width: 1, height: 1 }}
          >
            <line
              x1={connectorDraft.fromWorld.x}
              y1={connectorDraft.fromWorld.y}
              x2={connectorDraft.toWorld.x}
              y2={connectorDraft.toWorld.y}
              stroke="var(--accent)"
              strokeWidth={2}
              strokeDasharray="6 4"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      <ContextMenu target={contextTarget} onClose={() => setContextTarget(null)} />

      {/* Marquee rectangle (screen-space) */}
      <AnimatePresence>
        {marquee && (
          <motion.div
            key="marquee"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="pointer-events-none absolute rounded-[2px] border"
            style={{
              ...marqueeRect(marquee),
              borderColor: "var(--accent)",
              background: "rgba(217, 74, 56, 0.06)",
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
