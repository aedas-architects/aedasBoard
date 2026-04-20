"use client";

import { GripVertical, LayoutDashboard, Play, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import {
  itemBBox,
  useBoard,
  type FrameItem,
  type Item,
} from "../lib/board-store";
import { useUI } from "../lib/ui-store";
import { useViewport } from "../lib/viewport-store";

const THUMB_W = 184;
const THUMB_H = 108;
const THUMB_PAD = 8;

function itemsInsideFrame(frame: FrameItem, all: Item[]): Item[] {
  const fb = itemBBox(frame);
  return all.filter((it) => {
    if (it.id === frame.id) return false;
    if (it.type === "frame") return false;
    if (it.type === "connector") return false;
    const b = itemBBox(it);
    return b.minX >= fb.minX && b.minY >= fb.minY && b.maxX <= fb.maxX && b.maxY <= fb.maxY;
  });
}

function FrameThumb({ frame }: { frame: FrameItem }) {
  const items = useBoard((s) => s.items);
  const contents = useMemo(() => itemsInsideFrame(frame, items), [frame, items]);
  const fb = itemBBox(frame);
  const fw = Math.max(1, fb.maxX - fb.minX);
  const fh = Math.max(1, fb.maxY - fb.minY);
  const scale = Math.min(
    (THUMB_W - THUMB_PAD * 2) / fw,
    (THUMB_H - THUMB_PAD * 2) / fh,
  );
  const offX = THUMB_PAD + (THUMB_W - THUMB_PAD * 2 - fw * scale) / 2;
  const offY = THUMB_PAD + (THUMB_H - THUMB_PAD * 2 - fh * scale) / 2;

  const at = (x: number) => (x - fb.minX) * scale + offX;
  const aty = (y: number) => (y - fb.minY) * scale + offY;

  return (
    <svg
      width={THUMB_W}
      height={THUMB_H}
      className="block"
      style={{ background: frame.fill ?? "#FFFFFF" }}
    >
      {contents.map((it) => {
        if (it.type === "sticky") {
          return (
            <rect
              key={it.id}
              x={at(it.x)}
              y={aty(it.y)}
              width={Math.max(1, it.w * scale)}
              height={Math.max(1, it.h * scale)}
              rx={1}
              style={{ fill: it.color }}
            />
          );
        }
        if (it.type === "shape") {
          return (
            <rect
              key={it.id}
              x={at(it.x)}
              y={aty(it.y)}
              width={Math.max(1, it.w * scale)}
              height={Math.max(1, it.h * scale)}
              rx={it.kind === "rounded" ? 3 : 1}
              style={{ fill: it.fill, stroke: it.stroke }}
              strokeWidth={0.6}
            />
          );
        }
        if (it.type === "text") {
          return (
            <rect
              key={it.id}
              x={at(it.x)}
              y={aty(it.y)}
              width={Math.max(1, it.w * scale)}
              height={Math.max(1, it.h * scale)}
              style={{ fill: "transparent", stroke: "#3a3a3a" }}
              strokeWidth={0.4}
            />
          );
        }
        if (it.type === "image") {
          return (
            <rect
              key={it.id}
              x={at(it.x)}
              y={aty(it.y)}
              width={Math.max(1, it.w * scale)}
              height={Math.max(1, it.h * scale)}
              style={{ fill: "#C4BDA8" }}
            />
          );
        }
        if (it.type === "stroke") {
          const pts: string[] = [];
          for (let i = 0; i < it.points.length; i += 2) {
            pts.push(`${at(it.x + it.points[i])},${aty(it.y + it.points[i + 1])}`);
          }
          return (
            <polyline
              key={it.id}
              points={pts.join(" ")}
              fill="none"
              stroke={it.color}
              strokeWidth={Math.max(0.6, it.strokeWidth * scale)}
              strokeLinecap="round"
              opacity={it.tool === "highlighter" ? 0.4 : 1}
            />
          );
        }
        return null;
      })}
    </svg>
  );
}

export function FramesPanel() {
  const open = useUI((s) => s.framesPanelOpen);
  const setOpen = useUI((s) => s.setFramesPanel);
  const startPresenting = useUI((s) => s.startPresenting);

  const items = useBoard((s) => s.items);
  const setItems = useBoard((s) => s.snapshot);
  const updateItem = useBoard((s) => s.updateItem);
  const setSelection = useBoard((s) => s.setSelection);
  const fitToBBox = useViewport((s) => s.fitToBBox);

  const frames = useMemo(
    () => items.filter((it): it is FrameItem => it.type === "frame"),
    [items],
  );

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const jumpTo = (f: FrameItem) => {
    const b = itemBBox(f);
    const pad = 40;
    fitToBBox({
      minX: b.minX - pad,
      minY: b.minY - pad,
      maxX: b.maxX + pad,
      maxY: b.maxY + pad,
    });
    setSelection([f.id]);
  };

  const commitRename = () => {
    if (!renamingId) return;
    const next = renameDraft.trim() || "Frame";
    updateItem(renamingId, { title: next });
    setRenamingId(null);
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    setItems(); // snapshot for undo
    const frameOrder = frames.map((f) => f.id);
    const [moved] = frameOrder.splice(from, 1);
    frameOrder.splice(to, 0, moved);

    // Rebuild `items` so frames appear in the requested order (frames come
    // first in our z-layer sort anyway — other items keep their positions).
    const idToFrame = new Map(frames.map((f) => [f.id, f] as const));
    const newFrames = frameOrder.map((id) => idToFrame.get(id)!);
    const nonFrames = items.filter((it) => it.type !== "frame");

    useBoard.setState({ items: [...newFrames, ...nonFrames] });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="frames-panel"
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -14 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          onPointerDown={(e) => e.stopPropagation()}
          className="pointer-events-auto absolute left-[72px] top-[78px] bottom-[62px] z-30 flex w-[232px] flex-col rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel shadow-[var(--shadow-md)]"
        >
          <header className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2.5">
            <div>
              <h3 className="text-[13.5px] font-semibold text-ink">Frames</h3>
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                {frames.length} {frames.length === 1 ? "slide" : "slides"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {frames.length > 0 && (
                <button
                  type="button"
                  onClick={() => startPresenting(0)}
                  title="Present from first frame"
                  className="flex h-7 items-center gap-1 rounded-[var(--r-md)] bg-ink px-2 text-[11.5px] font-medium text-[var(--panel-soft)] hover:bg-[#0e0e0e]"
                >
                  <Play size={11} strokeWidth={2} />
                  Present
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-[var(--r-md)] text-muted hover:bg-panel-soft hover:text-ink"
                aria-label="Close frames panel"
              >
                <X size={13} strokeWidth={1.8} />
              </button>
            </div>
          </header>

          {frames.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <LayoutDashboard
                size={28}
                strokeWidth={1.4}
                className="mb-2 text-muted"
              />
              <p className="font-serif text-[18px] italic text-muted">
                No frames yet.
              </p>
              <p className="mt-1 text-[12px] leading-[1.4] text-ink-soft">
                Use the Frame tool (F) to add slides and organize your board.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-2">
              <ul className="flex flex-col gap-1.5">
                {frames.map((f, i) => {
                  const dropping = overIndex === i && dragIndex !== null && dragIndex !== i;
                  return (
                    <li
                      key={f.id}
                      draggable
                      onDragStart={(e) => {
                        setDragIndex(i);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setOverIndex(i);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragIndex !== null) reorder(dragIndex, i);
                        setDragIndex(null);
                        setOverIndex(null);
                      }}
                      onDragEnd={() => {
                        setDragIndex(null);
                        setOverIndex(null);
                      }}
                      className={`flex cursor-grab flex-col overflow-hidden rounded-[var(--r-lg)] border transition-colors ${
                        dropping
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : "border-[var(--line)] bg-panel hover:border-[#cfc8b6]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => jumpTo(f)}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setRenamingId(f.id);
                          setRenameDraft(f.title);
                        }}
                        className="relative block overflow-hidden"
                      >
                        <FrameThumb frame={f} />
                        <span className="absolute bottom-1 left-1 rounded-[var(--r-xs)] bg-panel/80 px-1.5 py-[1px] font-mono text-[10px] uppercase tracking-[0.08em] text-ink-soft backdrop-blur-sm">
                          {i + 1}
                        </span>
                      </button>
                      <div className="flex items-center gap-1 border-t border-[var(--line)] px-2 py-1.5">
                        <span className="text-muted">
                          <GripVertical size={12} strokeWidth={1.6} />
                        </span>
                        {renamingId === f.id ? (
                          <input
                            autoFocus
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRename();
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            className="flex-1 rounded-[var(--r-sm)] bg-panel-soft px-1.5 py-[2px] text-[12px] text-ink outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          />
                        ) : (
                          <button
                            type="button"
                            onDoubleClick={() => {
                              setRenamingId(f.id);
                              setRenameDraft(f.title);
                            }}
                            onClick={() => jumpTo(f)}
                            className="flex-1 truncate text-left text-[12.5px] font-medium text-ink"
                            title={f.title}
                          >
                            {f.title}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startPresenting(i)}
                          title="Present from here"
                          className="flex h-6 w-6 items-center justify-center rounded-[var(--r-sm)] text-muted hover:bg-panel-soft hover:text-ink"
                        >
                          <Play size={11} strokeWidth={2} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
