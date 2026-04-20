"use client";

import { Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { newId, useBoard, type ShapeItem, type ShapeKind } from "../lib/board-store";
import { isStrokeOnly, shapeGeometry } from "../lib/shape-geom";
import { useTool } from "../lib/tool-store";
import { useUI } from "../lib/ui-store";
import { useViewport } from "../lib/viewport-store";

type ShapeEntry = {
  kind: ShapeKind;
  label: string;
  keywords?: string;
};

type Category = {
  id: string;
  label: string;
  entries: ShapeEntry[];
};

const CATEGORIES: Category[] = [
  {
    id: "basic",
    label: "Basic shapes",
    entries: [
      { kind: "rectangle", label: "Rectangle" },
      { kind: "rounded", label: "Rounded" },
      { kind: "oval", label: "Oval", keywords: "circle ellipse" },
      { kind: "triangle", label: "Triangle" },
      { kind: "rhombus", label: "Rhombus", keywords: "diamond" },
      { kind: "pentagon", label: "Pentagon" },
      { kind: "hexagon", label: "Hexagon" },
      { kind: "octagon", label: "Octagon" },
      { kind: "star", label: "Star" },
      { kind: "parallelogram", label: "Parallelogram" },
      { kind: "trapezoid", label: "Trapezoid" },
      { kind: "cross", label: "Cross", keywords: "plus" },
    ],
  },
  {
    id: "arrows",
    label: "Arrows",
    entries: [
      { kind: "arrow-right", label: "Arrow right" },
      { kind: "arrow-left", label: "Arrow left" },
      { kind: "double-arrow", label: "Double arrow" },
    ],
  },
  {
    id: "other",
    label: "Callouts & containers",
    entries: [
      { kind: "callout", label: "Callout", keywords: "speech bubble" },
      { kind: "cylinder", label: "Cylinder", keywords: "database" },
      { kind: "cloud", label: "Cloud" },
      { kind: "brace-left", label: "Left brace", keywords: "curly {" },
      { kind: "brace-right", label: "Right brace", keywords: "curly }" },
    ],
  },
];

function ShapeGlyph({ kind, size = 32 }: { kind: ShapeKind; size?: number }) {
  const geom = shapeGeometry(kind, size, size);
  const common = {
    fill: isStrokeOnly(kind) ? "none" : "var(--panel)",
    stroke: "currentColor",
    strokeWidth: 1.4,
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {geom.kind === "ellipse" && (
        <ellipse cx={geom.cx} cy={geom.cy} rx={geom.rx} ry={geom.ry} {...common} />
      )}
      {geom.kind === "polygon" && <polygon points={geom.points} {...common} />}
      {geom.kind === "path" && <path d={geom.d} {...common} />}
      {geom.kind === "rect" && (
        <rect x="1" y="1" width={size - 2} height={size - 2} rx={geom.rx} {...common} />
      )}
    </svg>
  );
}

export function ShapesLibrary() {
  const open = useUI((s) => s.shapesLibraryOpen);
  const setOpen = useUI((s) => s.setShapesLibrary);
  const pan = useViewport((s) => s.pan);
  const zoom = useViewport((s) => s.zoom);
  const addItem = useBoard((s) => s.addItem);
  const setSelection = useBoard((s) => s.setSelection);
  const startEdit = useBoard((s) => s.startEdit);
  const setShapeKind = useTool((s) => s.setShapeKind);
  const setActiveTool = useTool((s) => s.setActive);

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.map((c) => ({
      ...c,
      entries: c.entries.filter(
        (e) =>
          e.label.toLowerCase().includes(q) ||
          (e.keywords ?? "").toLowerCase().includes(q) ||
          e.kind.includes(q),
      ),
    })).filter((c) => c.entries.length > 0);
  }, [query]);

  const insertShape = (kind: ShapeKind) => {
    const cx = (window.innerWidth / 2 - pan.x) / zoom;
    const cy = (window.innerHeight / 2 - pan.y) / zoom;
    const isWide = kind === "rectangle" || kind === "rounded" || kind === "parallelogram";
    const tall = kind === "brace-left" || kind === "brace-right";
    const w = tall ? 60 : isWide ? 200 : 160;
    const h = tall ? 200 : isWide ? 120 : 140;
    const item: ShapeItem = {
      id: newId("shape"),
      type: "shape",
      x: cx - w / 2,
      y: cy - h / 2,
      w,
      h,
      rotation: 0,
      kind,
      text: "",
      fill: "#FFFFFF",
      stroke: "var(--ink)",
    };
    addItem(item);
    setShapeKind(kind);
    setSelection([item.id]);
    startEdit(item.id);
    setActiveTool("select");
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="shapes-library"
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -14 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto absolute left-[72px] top-[78px] bottom-[62px] z-30 flex w-[320px] flex-col rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel shadow-[var(--shadow-md)]"
        >
          <header className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-2.5">
            <div>
              <h3 className="text-[13.5px] font-semibold text-ink">
                Diagramming shapes
              </h3>
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                Click to place at center
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-[var(--r-md)] text-muted hover:bg-panel-soft hover:text-ink"
              aria-label="Close shapes library"
            >
              <X size={13} strokeWidth={1.8} />
            </button>
          </header>

          <div className="border-b border-[var(--line)] p-2">
            <div className="flex items-center gap-2 rounded-[var(--r-md)] border border-[var(--line)] bg-panel-soft px-2.5 py-1.5">
              <Search size={13} strokeWidth={1.8} className="text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search shapes"
                className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-muted focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="px-3 py-10 text-center">
                <p className="font-serif text-[18px] italic text-muted">
                  No shapes match.
                </p>
              </div>
            ) : (
              filtered.map((cat) => (
                <section key={cat.id} className="mb-3 last:mb-0">
                  <h4 className="mb-1 px-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                    {cat.label}
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(5, 1fr)",
                      gap: 4,
                    }}
                  >
                    {cat.entries.map((e) => (
                      <motion.button
                        key={e.kind}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.94 }}
                        transition={{ type: "spring", stiffness: 500, damping: 28 }}
                        onClick={() => insertShape(e.kind)}
                        title={e.label}
                        className="flex aspect-square items-center justify-center rounded-[var(--r-md)] text-ink-soft hover:bg-panel-soft hover:text-ink"
                      >
                        <ShapeGlyph kind={e.kind} size={28} />
                      </motion.button>
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
