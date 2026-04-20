"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ConnectorVariant } from "../lib/board-store";
import { useTool } from "../lib/tool-store";

type Entry = {
  id: ConnectorVariant;
  label: string;
  shortcut?: string;
};

const ENTRIES: Entry[] = [
  { id: "line", label: "Line", shortcut: "L" },
  { id: "arrow", label: "Arrow" },
  { id: "elbow", label: "Elbow arrow" },
  { id: "block", label: "Block arrow" },
];

const CONNECTOR_COLORS = [
  "#3a3a3a",
  "#1a1a1a",
  "#D94A38",
  "#2E6FDB",
  "#2E8B57",
  "#C97A1F",
  "#7A4DB8",
  "#8a8578",
];

function Glyph({ variant }: { variant: ConnectorVariant }) {
  const stroke = "currentColor";
  switch (variant) {
    case "line":
      return (
        <svg width="18" height="18" viewBox="0 0 18 18">
          <line x1="3" y1="14" x2="15" y2="4" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "arrow":
      return (
        <svg width="18" height="18" viewBox="0 0 18 18">
          <line x1="3" y1="14" x2="14" y2="5" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
          <polygon points="14,5 11,5 14,8" fill={stroke} stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      );
    case "elbow":
      return (
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path d="M3 14 L3 5 L14 5" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <polygon points="14,5 11,3.5 11,6.5" fill={stroke} />
        </svg>
      );
    case "block":
      return (
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path d="M3 11.5 L11 11.5 L11 9 L15 13 L11 17 L11 14.5 L3 14.5 Z" transform="rotate(-40 9 9)" fill={stroke} />
        </svg>
      );
  }
}

export function ConnectorPicker() {
  const activeTool = useTool((s) => s.active);
  const variant = useTool((s) => s.connectorVariant);
  const setVariant = useTool((s) => s.setConnectorVariant);
  const color = useTool((s) => s.connectorColor);
  const setColor = useTool((s) => s.setConnectorColor);

  const visible = activeTool === "connector";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="connector-picker"
          initial={{ opacity: 0, x: -8, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -8, scale: 0.96 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto absolute left-[72px] top-1/2 z-30 -translate-y-1/2 flex flex-col gap-2 rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel p-1.5 shadow-[var(--shadow-md)]"
          style={{ width: 192 }}
        >
          <div className="flex flex-col gap-0.5">
            {ENTRIES.map((e) => {
              const active = variant === e.id;
              return (
                <motion.button
                  key={e.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setVariant(e.id)}
                  className={`group flex items-center gap-2 rounded-[var(--r-md)] px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-panel-soft text-ink"
                      : "text-ink-soft hover:bg-panel-soft"
                  }`}
                >
                  <span className={active ? "text-[var(--accent)]" : "text-ink-soft"}>
                    <Glyph variant={e.id} />
                  </span>
                  <span className="flex-1 text-left">{e.label}</span>
                  {e.shortcut && (
                    <kbd className="font-mono text-[10px] text-muted">
                      {e.shortcut}
                    </kbd>
                  )}
                </motion.button>
              );
            })}
          </div>

          <span className="mx-1 h-px bg-[var(--line)]" />

          <div className="px-1.5 pb-1">
            <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              Color
            </span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(8, 1fr)",
                gap: 4,
              }}
            >
              {CONNECTOR_COLORS.map((c) => (
                <motion.button
                  key={c}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  onClick={() => setColor(c)}
                  className="h-4 w-4 rounded-full border border-[var(--line)]"
                  style={{
                    background: c,
                    boxShadow: c === color ? "0 0 0 2px var(--accent)" : undefined,
                  }}
                  aria-label={`Connector color ${c}`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
