"use client";

import { motion } from "motion/react";
import { useBoard, type ShapeItem } from "../../lib/board-store";
import { isPathShape, isStrokeOnly, shapeGeometry, STROKE_W } from "../../lib/shape-geom";
import { useViewport } from "../../lib/viewport-store";
import { EditableText } from "./editable-text";
import { LockBadge } from "./lock-badge";
import { ResizeHandles } from "./resize-handles";
import { useItemDoubleClick, useItemPointerHandler } from "./selectable";

function ShapeSVG({ item }: { item: ShapeItem }) {
  const { kind, w, h, fill, stroke, strokeDash } = item;
  const geom = shapeGeometry(kind, w, h);
  const strokeOnly = isStrokeOnly(kind);
  const dashArray =
    strokeDash === "dashed" ? "8 5" :
    strokeDash === "dotted" ? "2 4" :
    undefined;
  const common = {
    fill: strokeOnly ? "none" : fill,
    stroke,
    strokeWidth: STROKE_W,
    vectorEffect: "non-scaling-stroke" as const,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
    ...(dashArray ? { strokeDasharray: dashArray } : {}),
  };

  return (
    <svg
      className="absolute inset-0"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
    >
      {geom.kind === "ellipse" && (
        <ellipse cx={geom.cx} cy={geom.cy} rx={geom.rx} ry={geom.ry} {...common} />
      )}
      {geom.kind === "polygon" && <polygon points={geom.points} {...common} />}
      {geom.kind === "path" && <path d={geom.d} {...common} />}
      {geom.kind === "rect" && (
        <rect x={0} y={0} width={w} height={h} rx={geom.rx} ry={geom.rx} {...common} />
      )}
    </svg>
  );
}

export function Shape({ item, selected }: { item: ShapeItem; selected: boolean }) {
  const onPointerDown = useItemPointerHandler(item.id);
  const onDoubleClick = useItemDoubleClick(item.id);
  const editing = useBoard((s) => s.editingId === item.id);
  const updateText = useBoard((s) => s.updateText);
  const stopEdit = useBoard((s) => s.stopEdit);
  const selectionCount = useBoard((s) => s.selectedIds.length);
  const zoom = useViewport((s) => s.zoom);

  const pathy = isPathShape(item.kind);
  const showHandles = selected && selectionCount === 1 && !editing;

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
        cursor: editing ? "text" : "default",
      }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      {pathy ? (
        <div className="relative h-full w-full">
          <ShapeSVG item={item} />
          <div className="absolute inset-0 flex items-center justify-center p-2">
            <EditableText
              editing={editing}
              value={item.text}
              onCommit={(text) => {
                updateText(item.id, text);
                stopEdit();
              }}
              onCancel={() => stopEdit()}
              className="text-[14px] font-medium text-ink text-center break-words whitespace-pre-wrap"
            />
          </div>
        </div>
      ) : (
        <div
          className="flex h-full w-full items-center justify-center border-2"
          style={{
            borderColor: item.stroke,
            background: item.fill,
            borderStyle:
              item.strokeDash === "dashed" ? "dashed" :
              item.strokeDash === "dotted" ? "dotted" :
              "solid",
            borderRadius:
              item.kind === "rounded"
                ? Math.min(item.w, item.h) * 0.22
                : 0,
          }}
        >
          <EditableText
            editing={editing}
            value={item.text}
            onCommit={(text) => {
              updateText(item.id, text);
              stopEdit();
            }}
            onCancel={() => stopEdit()}
            className="text-[14px] font-medium text-ink text-center px-2 break-words whitespace-pre-wrap"
          />
        </div>
      )}

      {selected && !editing && (
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
      {item.locked && selected && !editing && <LockBadge zoom={zoom} />}
    </motion.div>
  );
}
