"use client";

import { useBoard, type ConnectorEnd, type ConnectorItem, type Item } from "../../lib/board-store";
import { useGesture } from "../../lib/gesture-store";
import { useTool } from "../../lib/tool-store";
import { useViewport } from "../../lib/viewport-store";
import { buildDragTargets } from "./selectable";

export function resolveEnd(end: ConnectorEnd, items: Item[]): { x: number; y: number } | null {
  if (end.kind === "point") return { x: end.x, y: end.y };
  const it = items.find((i) => i.id === end.itemId);
  if (!it) return null;
  return { x: it.x + it.w / 2, y: it.y + it.h / 2 };
}

function clipToRect(
  rect: { x: number; y: number; w: number; h: number },
  toward: { x: number; y: number },
): { x: number; y: number } {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const hx = rect.w / 2;
  const hy = rect.h / 2;
  const tx = hx / Math.abs(dx || 1);
  const ty = hy / Math.abs(dy || 1);
  const t = Math.min(tx, ty);
  return { x: cx + dx * t, y: cy + dy * t };
}

function endAnchor(
  end: ConnectorEnd,
  toward: { x: number; y: number },
  items: Item[],
): { x: number; y: number } | null {
  if (end.kind === "point") return { x: end.x, y: end.y };
  const it = items.find((i) => i.id === end.itemId);
  if (!it) return null;
  return clipToRect({ x: it.x, y: it.y, w: it.w, h: it.h }, toward);
}

/** Build an SVG path: straight line or orthogonal elbow through a mid-point. */
function buildPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  variant: "line" | "arrow" | "elbow" | "block",
): { d: string; tailDir: { x: number; y: number } } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (variant === "elbow") {
    // Route with a single elbow along the dominant axis.
    const mid =
      Math.abs(dx) >= Math.abs(dy)
        ? { x: to.x, y: from.y }
        : { x: from.x, y: to.y };
    const d = `M ${from.x} ${from.y} L ${mid.x} ${mid.y} L ${to.x} ${to.y}`;
    const tailDx = to.x - mid.x;
    const tailDy = to.y - mid.y;
    const len = Math.hypot(tailDx, tailDy) || 1;
    return { d, tailDir: { x: tailDx / len, y: tailDy / len } };
  }

  const d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  const len = Math.hypot(dx, dy) || 1;
  return { d, tailDir: { x: dx / len, y: dy / len } };
}

export function Connector({ item, selected }: { item: ConnectorItem; selected: boolean }) {
  const items = useBoard((s) => s.items);
  const select = useBoard((s) => s.select);
  const setActive = useTool((s) => s.setActive);
  const zoom = useViewport((s) => s.zoom);

  const variant = item.variant ?? (item.arrowEnd ? "arrow" : "line");

  const fromCenter = resolveEnd(item.from, items);
  const toCenter = resolveEnd(item.to, items);
  if (!fromCenter || !toCenter) return null;

  const from = endAnchor(item.from, toCenter, items) ?? fromCenter;
  const to = endAnchor(item.to, fromCenter, items) ?? toCenter;

  const stroke = selected ? "var(--accent)" : item.stroke;
  const baseWidth = selected ? item.strokeWidth + 0.5 : item.strokeWidth;
  const strokeWidth = variant === "block" ? baseWidth + 4 : baseWidth;

  const { d, tailDir } = buildPath(from, to, variant);

  const pad = 20;
  const minX = Math.min(from.x, to.x) - pad;
  const minY = Math.min(from.y, to.y) - pad;
  const maxX = Math.max(from.x, to.x) + pad;
  const maxY = Math.max(from.y, to.y) + pad;
  const w = maxX - minX;
  const h = maxY - minY;

  function onPointerDown(e: React.PointerEvent) {
    const { spaceHeld, active } = useTool.getState();
    if (spaceHeld || e.button === 1 || e.button === 2) return;
    if (active === "eraser" || active === "connector") return;
    e.stopPropagation();
    setActive("select");
    select(item.id, e.shiftKey);

    // Start a drag covering the whole current selection (which now includes
    // this connector). Item-anchored endpoints stay put; free-point endpoints
    // translate with the drag.
    const fresh = useBoard.getState();
    const targets = buildDragTargets(fresh.selectedIds, fresh.items);
    if (targets.length === 0) return;
    useGesture.getState().startDrag({
      pointerId: e.pointerId,
      clientStart: { x: e.clientX, y: e.clientY },
      targets,
    });
  }

  const showArrowEnd = variant !== "line" && (item.arrowEnd ?? true);
  const showArrowStart = item.arrowStart ?? false;

  // Arrow polygon at the end, pointing along tailDir.
  const headLen = variant === "block" ? 18 : 12;
  const headW = variant === "block" ? 14 : 8;
  const ang = Math.atan2(tailDir.y, tailDir.x);
  const endArrowPts = (() => {
    const ax = to.x - Math.cos(ang) * headLen;
    const ay = to.y - Math.sin(ang) * headLen;
    const lX = ax - Math.sin(ang) * (headW / 2);
    const lY = ay + Math.cos(ang) * (headW / 2);
    const rX = ax + Math.sin(ang) * (headW / 2);
    const rY = ay - Math.cos(ang) * (headW / 2);
    return `${to.x - minX},${to.y - minY} ${lX - minX},${lY - minY} ${rX - minX},${rY - minY}`;
  })();

  // Arrow pointing backward along -tailDir at the start.
  const startArrowPts = (() => {
    const ang2 = ang + Math.PI;
    const ax = from.x - Math.cos(ang2) * headLen;
    const ay = from.y - Math.sin(ang2) * headLen;
    const lX = ax - Math.sin(ang2) * (headW / 2);
    const lY = ay + Math.cos(ang2) * (headW / 2);
    const rX = ax + Math.sin(ang2) * (headW / 2);
    const rY = ay - Math.cos(ang2) * (headW / 2);
    return `${from.x - minX},${from.y - minY} ${lX - minX},${lY - minY} ${rX - minX},${rY - minY}`;
  })();

  // Shift the path into local svg coords by translating.
  const localD = d
    .replace(/M\s+([-\d.]+)\s+([-\d.]+)/, (_, x, y) => `M ${Number(x) - minX} ${Number(y) - minY}`)
    .replace(/L\s+([-\d.]+)\s+([-\d.]+)/g, (_, x, y) => `L ${Number(x) - minX} ${Number(y) - minY}`);

  return (
    <svg
      className="absolute overflow-visible"
      style={{ left: minX, top: minY, width: w, height: h, pointerEvents: "none" }}
      data-item={item.id}
    >
      {/* Invisible hit area */}
      <path
        d={localD}
        stroke="transparent"
        strokeWidth={Math.max(14, (strokeWidth + 10) / zoom)}
        fill="none"
        style={{ pointerEvents: "stroke", cursor: "pointer" }}
        onPointerDown={onPointerDown}
      />
      <path
        d={localD}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pointerEvents: "none" }}
      />
      {showArrowEnd && (
        <polygon
          points={endArrowPts}
          fill={stroke}
          style={{ pointerEvents: "none" }}
        />
      )}
      {showArrowStart && (
        <polygon
          points={startArrowPts}
          fill={stroke}
          style={{ pointerEvents: "none" }}
        />
      )}
    </svg>
  );
}
