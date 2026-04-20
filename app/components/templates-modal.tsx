"use client";

import { Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { useBoard } from "../lib/board-store";
import { TEMPLATES, type TemplateDef } from "../lib/templates";
import { useUI } from "../lib/ui-store";
import { useViewport } from "../lib/viewport-store";

type Filter = "All" | TemplateDef["category"];
const FILTERS: Filter[] = ["All", "Architecture", "Design", "Strategy", "Agile"];

export function TemplatesModal() {
  const open = useUI((s) => s.templatesOpen);
  const setOpen = useUI((s) => s.setTemplates);
  const pan = useViewport((s) => s.pan);
  const zoom = useViewport((s) => s.zoom);
  const addItem = useBoard((s) => s.addItem);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");

  const shown = useMemo(() => {
    let list = TEMPLATES;
    if (filter !== "All") list = list.filter((t) => t.category === filter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q),
      );
    }
    return list;
  }, [query, filter]);

  const insert = (t: TemplateDef) => {
    const cx = (window.innerWidth / 2 - pan.x) / zoom;
    const cy = (window.innerHeight / 2 - pan.y) / zoom;
    const items = t.build({ x: cx, y: cy });
    for (const it of items) addItem(it);
    // Select the inserted cluster.
    useBoard.getState().setSelection(items.map((it) => it.id));
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[80] bg-ink/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="fixed left-1/2 top-1/2 z-[90] w-[880px] max-w-[94vw] max-h-[86vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel shadow-[var(--shadow-lg)]"
          >
            <header className="flex items-start justify-between gap-6 border-b border-[var(--line)] px-6 py-5">
              <div>
                <h2 className="font-serif text-[28px] italic leading-none text-ink">
                  Templates
                </h2>
                <p className="mt-1 text-[13px] text-ink-soft">
                  Drop a starter layout onto your board. Everything stays editable.
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

            <div className="flex items-center gap-3 border-b border-[var(--line)] px-6 py-3">
              <div className="flex flex-1 items-center gap-2 rounded-[var(--r-xl)] border border-[var(--line)] bg-panel-soft px-3 py-1.5">
                <Search size={14} strokeWidth={1.8} className="text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search templates"
                  className="flex-1 bg-transparent text-[13.5px] text-ink placeholder:text-muted focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1 rounded-[var(--r-xl)] border border-[var(--line)] bg-panel p-1">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`rounded-[var(--r-md)] px-2.5 py-1 text-[12.5px] font-medium ${
                      filter === f
                        ? "bg-ink text-white"
                        : "text-ink-soft hover:bg-panel-soft"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: "60vh" }}>
              {shown.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="font-serif text-[22px] italic text-muted">
                    Nothing matches.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  {shown.map((t) => (
                    <TemplateCard key={t.id} template={t} onUse={insert} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function TemplateCard({
  template,
  onUse,
}: {
  template: TemplateDef;
  onUse: (t: TemplateDef) => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="group flex flex-col overflow-hidden rounded-[var(--r-xl)] border border-[var(--line)] bg-panel shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]"
    >
      <div
        className="relative h-[110px] border-b border-[var(--line)]"
        style={{ background: template.cover }}
      >
        <span className="absolute bottom-2 left-2 rounded-full bg-panel/80 px-2 py-[2px] font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft backdrop-blur-sm">
          {template.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-[14px] font-semibold text-ink">{template.name}</h3>
        <p className="mt-1 flex-1 text-[12.5px] leading-[1.4] text-ink-soft">
          {template.description}
        </p>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => onUse(template)}
            className="rounded-[var(--r-md)] bg-ink px-3 py-1.5 text-[12px] font-semibold text-[var(--panel-soft)] hover:bg-[#0e0e0e]"
          >
            Use template
          </button>
        </div>
      </div>
    </motion.div>
  );
}
