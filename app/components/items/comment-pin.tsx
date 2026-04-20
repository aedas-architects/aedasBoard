"use client";

import { Check, CornerDownLeft, MessageCircle, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useBoard, type CommentItem, type CommentMessage } from "../../lib/board-store";
import { useViewport } from "../../lib/viewport-store";
import { useTool } from "../../lib/tool-store";

const PIN_SIZE = 36;

const CURRENT_USER = {
  author: "You",
  initials: "Y",
  color: "#D94A38",
};

function newMessageId() {
  return `m_${Math.random().toString(36).slice(2, 10)}`;
}

function formatRelative(ts: number) {
  const d = Date.now() - ts;
  if (d < 60_000) return "just now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
  return `${Math.floor(d / 86_400_000)}d`;
}

export function CommentPin({ item, selected }: { item: CommentItem; selected: boolean }) {
  const zoom = useViewport((s) => s.zoom);
  const select = useBoard((s) => s.select);
  const updateItem = useBoard((s) => s.updateItem);
  const removeItem = useBoard((s) => s.removeItem);
  const setActive = useTool((s) => s.setActive);

  const [open, setOpen] = useState(item.thread.length === 0);

  // Counter-scale so the pin keeps a fixed screen size regardless of zoom.
  const inv = 1 / zoom;
  const pinSize = PIN_SIZE;

  function onPinDown(e: React.PointerEvent) {
    const { spaceHeld } = useTool.getState();
    if (spaceHeld || e.button === 1 || e.button === 2) return;
    e.stopPropagation();
    setActive("select");
    select(item.id, e.shiftKey);
    setOpen((v) => !v);
  }

  const addMessage = (text: string) => {
    const message: CommentMessage = {
      id: newMessageId(),
      author: CURRENT_USER.author,
      initials: CURRENT_USER.initials,
      color: CURRENT_USER.color,
      text,
      createdAt: Date.now(),
    };
    updateItem(item.id, { thread: [...item.thread, message] });
  };

  const resolve = () => {
    // Thread with no messages → delete the pin entirely (abandoned).
    if (item.thread.length === 0) {
      removeItem(item.id);
      return;
    }
    updateItem(item.id, { resolved: !item.resolved });
    setOpen(false);
  };

  return (
    <div
      className="absolute"
      data-item={item.id}
      style={{
        left: item.x,
        top: item.y,
        width: 0,
        height: 0,
      }}
    >
      <div
        style={{
          transform: `scale(${inv})`,
          transformOrigin: "top left",
        }}
      >
        {/* Offset so the pin's sharp bottom-left corner lands on (item.x, item.y). */}
        <div style={{ transform: `translate(0, -${pinSize}px)` }}>
          <motion.button
            type="button"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
            onPointerDown={onPinDown}
            className="flex items-center justify-center text-white"
            style={{
              width: pinSize,
              height: pinSize,
              background: item.resolved ? "var(--muted)" : "var(--accent)",
              borderRadius: "999px 999px 999px 4px",
              boxShadow: item.resolved
                ? "0 4px 12px rgba(138, 133, 120, 0.4)"
                : "var(--shadow-pin)",
              outline: selected ? "2px solid var(--ink)" : "none",
              outlineOffset: 2,
            }}
            aria-label="Comment thread"
          >
            <MessageCircle size={15} strokeWidth={2} />
          </motion.button>

          {open && (
            <CommentPanel
              item={item}
              onClose={() => setOpen(false)}
              onSubmit={addMessage}
              onResolve={resolve}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CommentPanel({
  item,
  onClose,
  onSubmit,
  onResolve,
}: {
  item: CommentItem;
  onClose: () => void;
  onSubmit: (text: string) => void;
  onResolve: () => void;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    const t = draft.trim();
    if (!t) return;
    onSubmit(t);
    setDraft("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -6, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute flex flex-col overflow-hidden rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel shadow-[var(--shadow-md)]"
      style={{
        left: 44,
        top: 0,
        width: 300,
        maxHeight: 420,
      }}
    >
      <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
            {item.resolved ? "Resolved" : "Thread"}
          </span>
          <span className="text-[11px] text-muted">
            · {item.thread.length} {item.thread.length === 1 ? "message" : "messages"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onResolve}
            className="flex h-7 items-center gap-1 rounded-[var(--r-md)] px-2 text-[11px] text-ink-soft hover:bg-panel-soft"
            title={item.resolved ? "Reopen" : "Resolve"}
          >
            <Check size={12} strokeWidth={2} />
            {item.resolved ? "Reopen" : "Resolve"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[var(--r-md)] text-muted hover:bg-panel-soft"
            aria-label="Close"
          >
            <X size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      {item.thread.length > 0 && (
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="flex flex-col gap-3">
            {item.thread.map((m) => (
              <li key={m.id} className="flex gap-2">
                <span
                  className="mt-[2px] flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                  style={{ background: m.color }}
                >
                  {m.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[12.5px] font-semibold text-ink">
                      {m.author}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                      {formatRelative(m.createdAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-[13px] text-ink-soft">
                    {m.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-[var(--line)] p-2">
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Add a comment…"
          rows={2}
          className="w-full resize-none rounded-[var(--r-md)] border border-[var(--line)] bg-panel-soft px-2 py-1.5 text-[13px] text-ink placeholder:text-muted focus:border-[var(--accent)] focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
            ⏎ Send · ⇧⏎ Newline
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim()}
            className="flex items-center gap-1 rounded-[var(--r-md)] bg-ink px-2.5 py-1.5 text-[12px] font-medium text-[var(--panel-soft)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CornerDownLeft size={12} strokeWidth={2} />
            Send
          </button>
        </div>
      </div>
    </motion.div>
  );
}
