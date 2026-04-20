"use client";

import { useEffect, useRef } from "react";

type Props = {
  editing: boolean;
  value: string;
  onCommit: (text: string) => void;
  onCancel?: () => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  /** If false, Enter commits instead of inserting a newline. */
  multiline?: boolean;
};

/**
 * Minimal, uncontrolled contentEditable wrapper for in-canvas text editing.
 *
 * - When entering edit mode, the initial value is pushed imperatively via
 *   innerText so React won't touch the DOM children (avoiding cursor jumps).
 * - On blur, the final innerText is committed upstream.
 * - Escape cancels without committing. Enter can be bound to commit when
 *   `multiline` is false (text widgets on a single line, etc).
 */
export function EditableText({
  editing,
  value,
  onCommit,
  onCancel,
  className,
  style,
  placeholder,
  multiline = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) return;
    const el = ref.current;
    if (!el) return;
    el.innerText = value;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    // Dependency intentionally only on `editing` — we do NOT reset text when
    // `value` changes while editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  if (!editing) {
    return (
      <div className={className} style={style}>
        {value || (placeholder ? <span className="text-muted">{placeholder}</span> : null)}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={`${className ?? ""} outline-none`}
      style={style}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onBlur={(e) => onCommit(e.currentTarget.innerText)}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel?.();
          ref.current?.blur();
          return;
        }
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          ref.current?.blur();
        }
      }}
    />
  );
}
