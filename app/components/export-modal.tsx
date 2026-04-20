"use client";

import { Braces, FileImage, FileType, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useBoard } from "../lib/board-store";
import { useBoards } from "../lib/boards-store";
import { exportJSON, exportPNG, exportSVG } from "../lib/export";
import { useUI } from "../lib/ui-store";

const BG = "var(--bg)";

type Status = { kind: "idle" } | { kind: "working"; format: "png" | "svg" | "json" } | { kind: "error"; message: string };

export function ExportModal({ boardId }: { boardId: string }) {
  const open = useUI((s) => s.exportOpen);
  const setOpen = useUI((s) => s.setExport);
  const items = useBoard((s) => s.items);
  const board = useBoards((s) => s.boards.find((b) => b.id === boardId));

  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const boardName = board?.name ?? "Untitled board";
  const hasContent = items.filter((it) => it.type !== "connector" && it.type !== "comment").length > 0;

  async function run(format: "png" | "svg" | "json") {
    try {
      setStatus({ kind: "working", format });
      if (format === "json") exportJSON(boardName, items);
      else if (format === "svg") exportSVG(boardName, items, BG);
      else await exportPNG(boardName, items, BG);
      setStatus({ kind: "idle" });
      setOpen(false);
    } catch (err) {
      setStatus({
        kind: "error",
        message: (err as Error).message ?? "Export failed.",
      });
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[80] bg-ink/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="fixed left-1/2 top-1/2 z-[90] w-[520px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel shadow-[var(--shadow-lg)]"
          >
            <header className="flex items-start justify-between gap-6 border-b border-[var(--line)] px-6 py-5">
              <div>
                <h2 className="font-serif text-[28px] italic leading-none text-ink">
                  Export board
                </h2>
                <p className="mt-1 text-[13px] text-ink-soft">
                  A snapshot of {boardName}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-[var(--r-md)] text-ink-soft hover:bg-panel-soft"
                aria-label="Close"
              >
                <X size={16} strokeWidth={1.8} />
              </button>
            </header>

            <div className="flex flex-col gap-2 p-4">
              <Option
                icon={<FileImage size={16} strokeWidth={1.8} />}
                title="PNG image"
                description="Rasterized, 2× for crisp viewing."
                format="png"
                status={status}
                disabled={!hasContent}
                onClick={() => run("png")}
              />
              <Option
                icon={<FileType size={16} strokeWidth={1.8} />}
                title="SVG vector"
                description="Editable vector file, fonts inlined."
                format="svg"
                status={status}
                disabled={!hasContent}
                onClick={() => run("svg")}
              />
              <Option
                icon={<Braces size={16} strokeWidth={1.8} />}
                title="JSON backup"
                description="Everything on the board, machine-readable."
                format="json"
                status={status}
                onClick={() => run("json")}
              />

              {status.kind === "error" && (
                <p className="mt-1 rounded-[var(--r-md)] bg-[var(--accent-soft)] px-3 py-2 text-[12px] text-[var(--accent)]">
                  {status.message}
                </p>
              )}
              {!hasContent && (
                <p className="mt-1 rounded-[var(--r-md)] bg-panel-soft px-3 py-2 text-[12px] text-ink-soft">
                  PNG and SVG need content on the canvas. JSON works either way.
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Option({
  icon,
  title,
  description,
  format,
  status,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  format: "png" | "svg" | "json";
  status: Status;
  onClick: () => void;
  disabled?: boolean;
}) {
  const working = status.kind === "working" && status.format === format;
  const anyWorking = status.kind === "working";
  return (
    <motion.button
      type="button"
      whileHover={disabled || anyWorking ? undefined : { y: -1 }}
      whileTap={disabled || anyWorking ? undefined : { scale: 0.99 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      onClick={disabled || anyWorking ? undefined : onClick}
      disabled={disabled || anyWorking}
      className={`flex items-center gap-3 rounded-[var(--r-xl)] border border-[var(--line)] px-3.5 py-3 text-left transition-colors ${
        disabled
          ? "bg-panel-soft opacity-50 cursor-not-allowed"
          : "bg-panel hover:bg-panel-soft"
      }`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-[var(--r-md)] bg-panel-soft text-ink-soft">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-[14px] font-semibold text-ink">{title}</span>
        <span className="block text-[12px] text-ink-soft">{description}</span>
      </span>
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
        {working ? "…" : format.toUpperCase()}
      </span>
    </motion.button>
  );
}
