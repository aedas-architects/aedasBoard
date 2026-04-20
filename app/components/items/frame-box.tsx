"use client";

import { useEffect, useRef, useState } from "react";
import { useBoard, type FrameItem } from "../../lib/board-store";
import { useViewport } from "../../lib/viewport-store";
import { LockBadge } from "./lock-badge";
import { ResizeHandles } from "./resize-handles";
import { useItemDoubleClick, useItemPointerHandler } from "./selectable";

export function FrameBox({ item, selected }: { item: FrameItem; selected: boolean }) {
  const onPointerDown = useItemPointerHandler(item.id);
  const onDoubleClick = useItemDoubleClick(item.id);
  const editing = useBoard((s) => s.editingId === item.id);
  const updateItem = useBoard((s) => s.updateItem);
  const stopEdit = useBoard((s) => s.stopEdit);
  const selectionCount = useBoard((s) => s.selectedIds.length);
  const zoom = useViewport((s) => s.zoom);

  const showHandles = selected && selectionCount === 1 && !editing;

  return (
    <div
      className="absolute"
      data-item={item.id}
      style={{ left: item.x, top: item.y, width: item.w, height: item.h }}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      <FrameTitle
        title={item.title}
        editing={editing}
        zoom={zoom}
        onCommit={(title) => {
          updateItem(item.id, { title: title.trim() || "Frame" });
          stopEdit();
        }}
        onCancel={() => stopEdit()}
      />

      <div
        className="h-full w-full rounded-[var(--r-md)] border-2"
        style={{
          borderColor: selected ? "var(--accent)" : item.stroke ?? "#C4BDA8",
          background: item.fill ?? "#FFFFFF",
        }}
      />

      {showHandles && <ResizeHandles item={item} set="corners" zoom={zoom} />}
      {item.locked && selected && <LockBadge zoom={zoom} />}
    </div>
  );
}

function FrameTitle({
  title,
  editing,
  zoom,
  onCommit,
  onCancel,
}: {
  title: string;
  editing: boolean;
  zoom: number;
  onCommit: (t: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(title);
  }, [editing, title]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const style: React.CSSProperties = {
    position: "absolute",
    left: 0,
    top: -22 / zoom,
    fontSize: 14 / zoom,
    color: "var(--ink-soft)",
    fontWeight: 500,
    lineHeight: 1,
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onCommit(draft)}
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit(draft);
          if (e.key === "Escape") onCancel();
        }}
        className="rounded-[var(--r-xs)] bg-panel-soft outline-none focus:ring-2 focus:ring-[var(--accent)]"
        style={{
          ...style,
          padding: `${2 / zoom}px ${4 / zoom}px`,
          minWidth: 80 / zoom,
        }}
      />
    );
  }
  return <div style={style}>{title}</div>;
}
