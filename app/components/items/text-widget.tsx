"use client";

import { useBoard, type FontFamily, type TextItem } from "../../lib/board-store";
import { fontFamilyProps } from "../../lib/font-family";
import { useViewport } from "../../lib/viewport-store";
import { EditableText } from "./editable-text";
import { LockBadge } from "./lock-badge";
import { ResizeHandles } from "./resize-handles";
import { useItemDoubleClick, useItemPointerHandler } from "./selectable";

export function TextWidget({ item, selected }: { item: TextItem; selected: boolean }) {
  const onPointerDown = useItemPointerHandler(item.id);
  const onDoubleClick = useItemDoubleClick(item.id);
  const editing = useBoard((s) => s.editingId === item.id);
  const updateText = useBoard((s) => s.updateText);
  const stopEdit = useBoard((s) => s.stopEdit);
  const selectionCount = useBoard((s) => s.selectedIds.length);
  const zoom = useViewport((s) => s.zoom);

  const autoSize = item.autoSize !== false;
  const showHandles = selected && selectionCount === 1;

  const widthStyle: React.CSSProperties = autoSize
    ? { width: "max-content", maxWidth: 600, minWidth: 100 }
    : { width: item.w, minWidth: 100 };

  const outlineVisible = editing || selected;

  const family: FontFamily = item.fontFamily ?? (item.serif ? "serif" : "sans");
  const familyProps = fontFamilyProps(family);
  const textClasses = [
    "text-ink whitespace-pre-wrap break-words",
    familyProps.className,
    item.italic ? "italic" : "",
    item.underline ? "underline" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className="absolute"
      data-item={item.id}
      style={{
        left: item.x,
        top: item.y,
        cursor: editing ? "text" : "default",
        ...widthStyle,
      }}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      <div
        className="relative"
        style={{
          padding: outlineVisible ? 6 / zoom : 0,
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
          placeholder="Type…"
          className={textClasses}
          style={{
            fontSize: item.fontSize,
            fontWeight: item.fontWeight ?? 500,
            lineHeight: 1.2,
            textAlign: item.align ?? "left",
            color: item.color,
            ...(familyProps.style ?? {}),
          }}
        />

        {outlineVisible && (
          <span
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              inset: 0,
              border: `${1 / zoom}px ${editing ? "dashed" : "solid"} var(--accent)`,
              borderRadius: 2 / zoom,
            }}
          />
        )}

        {showHandles && <ResizeHandles item={item} set="edges" zoom={zoom} />}
        {item.locked && selected && !editing && <LockBadge zoom={zoom} />}
      </div>
    </div>
  );
}
