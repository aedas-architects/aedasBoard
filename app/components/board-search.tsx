"use client";

import { Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { itemBBox, useBoard, type Item } from "../lib/board-store";
import { useUI } from "../lib/ui-store";
import { useViewport } from "../lib/viewport-store";

type Hit = {
  id: string;
  type: Item["type"];
  label: string;
  snippet: string;
};

function labelOf(type: Item["type"]) {
  switch (type) {
    case "sticky":
      return "Sticky";
    case "text":
      return "Text";
    case "shape":
      return "Shape";
    case "frame":
      return "Frame";
    case "comment":
      return "Comment";
    case "connector":
      return "Connector";
    case "stroke":
      return "Stroke";
    case "image":
      return "Image";
  }
}

function textOf(item: Item): string {
  switch (item.type) {
    case "sticky":
    case "text":
    case "shape":
      return item.text ?? "";
    case "frame":
      return item.title ?? "";
    case "connector":
      return item.label ?? "";
    case "comment":
      return item.thread.map((m) => m.text).join(" ");
    case "image":
      return item.alt ?? "";
    case "stroke":
      return "";
  }
}

function highlight(text: string, query: string): string {
  if (!query) return text.slice(0, 120);
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx < 0) return text.slice(0, 120);
  const start = Math.max(0, idx - 20);
  const end = Math.min(text.length, idx + query.length + 40);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

export function BoardSearch() {
  const open = useUI((s) => s.searchOpen);
  const setOpen = useUI((s) => s.setSearch);
  const items = useBoard((s) => s.items);
  const setSelection = useBoard((s) => s.setSelection);
  const fitToBBox = useViewport((s) => s.fitToBBox);

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [flashId, setFlashId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hits: Hit[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: Hit[] = [];
    for (const it of items) {
      const text = textOf(it);
      if (!text) continue;
      if (text.toLowerCase().includes(q)) {
        out.push({
          id: it.id,
          type: it.type,
          label: labelOf(it.type),
          snippet: highlight(text, q),
        });
      }
    }
    return out;
  }, [items, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const jumpTo = (id: string) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const b = itemBBox(it);
    // Pad out so the item is visible with breathing room.
    const pad = 80;
    fitToBBox({
      minX: b.minX - pad,
      minY: b.minY - pad,
      maxX: b.maxX + pad,
      maxY: b.maxY + pad,
    });
    setSelection([id]);
    setFlashId(id);
    window.setTimeout(() => setFlashId((v) => (v === id ? null : v)), 1400);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(hits.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const hit = hits[active];
        if (hit) jumpTo(hit.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hits, active]);

  // Flash a temporary accent glow on the jumped item.
  useEffect(() => {
    if (!flashId) return;
    const el = document.querySelector<HTMLElement>(
      `[data-item="${CSS.escape(flashId)}"]`,
    );
    if (!el) return;
    el.animate(
      [
        { boxShadow: "0 0 0 0 rgba(217,74,56,0)" },
        { boxShadow: "0 0 0 6px rgba(217,74,56,0.35)" },
        { boxShadow: "0 0 0 0 rgba(217,74,56,0)" },
      ],
      { duration: 1200, easing: "ease-out" },
    );
  }, [flashId]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16 }}
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto absolute left-1/2 top-[78px] z-40 flex w-[420px] max-w-[92vw] -translate-x-1/2 flex-col overflow-hidden rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel shadow-[var(--shadow-md)]"
        >
          <div className="flex items-center gap-2 border-b border-[var(--line)] px-3 py-2.5">
            <Search size={14} strokeWidth={1.8} className="text-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find on board"
              className="flex-1 bg-transparent text-[13.5px] text-ink placeholder:text-muted focus:outline-none"
            />
            <kbd className="font-mono text-[10px] text-muted">ESC</kbd>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-6 w-6 items-center justify-center rounded-[var(--r-sm)] text-muted hover:bg-panel-soft hover:text-ink"
              aria-label="Close"
            >
              <X size={12} strokeWidth={1.8} />
            </button>
          </div>

          {query.trim() && (
            <div className="max-h-[320px] overflow-y-auto p-1">
              {hits.length === 0 ? (
                <div className="px-3 py-5 text-center">
                  <p className="font-serif text-[16px] italic text-muted">
                    No matches.
                  </p>
                </div>
              ) : (
                hits.map((h, i) => (
                  <button
                    key={h.id}
                    type="button"
                    data-hit-idx={i}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => jumpTo(h.id)}
                    className={`flex w-full flex-col gap-0.5 rounded-[var(--r-md)] px-2 py-1.5 text-left ${
                      i === active ? "bg-panel-soft" : "hover:bg-panel-soft"
                    }`}
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                      {h.label}
                    </span>
                    <span className="truncate text-[13px] text-ink">
                      {h.snippet}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
