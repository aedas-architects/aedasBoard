"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { useUI } from "../lib/ui-store";

type Row = { keys: string; label: string };
type Section = { title: string; rows: Row[] };

const SECTIONS: Section[] = [
  {
    title: "Tools",
    rows: [
      { keys: "V", label: "Select" },
      { keys: "N", label: "Sticky note" },
      { keys: "T", label: "Text" },
      { keys: "S", label: "Shape" },
      { keys: "P", label: "Pen" },
      { keys: "E", label: "Eraser" },
      { keys: "L", label: "Connector" },
      { keys: "F", label: "Frame" },
      { keys: "C", label: "Comment" },
      { keys: "Space", label: "Temporary pan" },
    ],
  },
  {
    title: "Edit",
    rows: [
      { keys: "⌘Z", label: "Undo" },
      { keys: "⌘⇧Z", label: "Redo" },
      { keys: "⌘C / ⌘X / ⌘V", label: "Copy / Cut / Paste" },
      { keys: "⌘D", label: "Duplicate" },
      { keys: "⌥ drag", label: "Duplicate while dragging" },
      { keys: "⌘A", label: "Select all" },
      { keys: "⌘L", label: "Lock / Unlock" },
      { keys: "Del / ⌫", label: "Delete selection" },
      { keys: "↑ ↓ ← →", label: "Nudge 1px (⇧ for 10px)" },
    ],
  },
  {
    title: "Arrange",
    rows: [
      { keys: "⌘]", label: "Bring forward" },
      { keys: "⌘⇧]", label: "Bring to front" },
      { keys: "⌘[", label: "Send backward" },
      { keys: "⌘⇧[", label: "Send to back" },
    ],
  },
  {
    title: "View",
    rows: [
      { keys: "⌘ scroll", label: "Zoom to cursor" },
      { keys: "⌘= / ⌘−", label: "Zoom in / out" },
      { keys: "1", label: "Zoom to 100%" },
      { keys: "3", label: "Fit to content" },
      { keys: "⌘F", label: "Find on board" },
      { keys: "⌘/ · ⌘K", label: "Command palette" },
      { keys: "?", label: "Show this sheet" },
    ],
  },
];

export function ShortcutsSheet() {
  const open = useUI((s) => s.shortcutsOpen);
  const setOpen = useUI((s) => s.setShortcuts);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

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
            className="fixed left-1/2 top-1/2 z-[90] w-[640px] max-w-[92vw] max-h-[86vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel shadow-[var(--shadow-lg)]"
          >
            <header className="flex items-start justify-between gap-6 border-b border-[var(--line)] px-6 py-5">
              <div>
                <h2 className="font-serif text-[28px] italic leading-none text-ink">
                  Shortcuts
                </h2>
                <p className="mt-1 text-[13px] text-ink-soft">
                  Everything with a key, laid out.
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

            <div
              className="grid gap-x-8 gap-y-6 overflow-y-auto p-6 md:grid-cols-2"
              style={{ maxHeight: "70vh" }}
            >
              {SECTIONS.map((section) => (
                <section key={section.title}>
                  <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                    {section.title}
                  </h3>
                  <ul className="flex flex-col gap-1">
                    {section.rows.map((row) => (
                      <li
                        key={row.label}
                        className="flex items-center justify-between gap-3 rounded-[var(--r-md)] px-1.5 py-1 text-[13px] text-ink-soft hover:bg-panel-soft"
                      >
                        <span className="flex-1">{row.label}</span>
                        <kbd className="font-mono text-[11px] text-ink">
                          {row.keys}
                        </kbd>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
