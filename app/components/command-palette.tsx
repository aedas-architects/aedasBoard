"use client";

import {
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
  Download,
  Eraser,
  Frame,
  Grid3X3,
  HelpCircle,
  LayoutDashboard,
  LayoutTemplate,
  Lock,
  Map,
  MessageCircle,
  MousePointer2,
  Pencil,
  Play,
  Redo2,
  Search,
  Shapes,
  StickyNote,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useBoard } from "../lib/board-store";
import { useTool, type Tool } from "../lib/tool-store";
import { useUI } from "../lib/ui-store";
import { useViewport } from "../lib/viewport-store";

type Command = {
  id: string;
  label: string;
  group: "Tools" | "Edit" | "Arrange" | "View" | "Navigate";
  icon: React.ReactNode;
  shortcut?: string;
  keywords?: string;
  run: () => void;
};

function useCommands(onRun: () => void): Command[] {
  const setActive = useTool((s) => s.setActive);
  const setTemplates = useUI((s) => s.setTemplates);
  const setFramesPanel = useUI((s) => s.setFramesPanel);
  const setExport = useUI((s) => s.setExport);
  const setShortcuts = useUI((s) => s.setShortcuts);
  const setSearch = useUI((s) => s.setSearch);
  const startPresenting = useUI((s) => s.startPresenting);
  const toggleGrid = useViewport((s) => s.toggleGrid);
  const toggleMinimap = useViewport((s) => s.toggleMinimap);
  const zoomTo100 = useViewport((s) => s.zoomTo100);
  const fitToBBox = useViewport((s) => s.fitToBBox);

  return useMemo<Command[]>(() => {
    const tool = (t: Tool) => () => {
      setActive(t);
      onRun();
    };
    const boardAct = <K extends keyof ReturnType<typeof useBoard.getState>>(k: K) => () => {
      const state = useBoard.getState();
      const fn = state[k];
      if (typeof fn === "function") (fn as () => void)();
      onRun();
    };
    const wrap = (fn: () => void) => () => {
      fn();
      onRun();
    };

    return [
      { id: "tool.select", label: "Select tool", group: "Tools", shortcut: "V", keywords: "pointer arrow", icon: <MousePointer2 size={14} strokeWidth={1.8} />, run: tool("select") },
      { id: "tool.sticky", label: "Sticky note", group: "Tools", shortcut: "N", icon: <StickyNote size={14} strokeWidth={1.8} />, run: tool("sticky") },
      { id: "tool.text", label: "Text", group: "Tools", shortcut: "T", icon: <Type size={14} strokeWidth={1.8} />, run: tool("text") },
      { id: "tool.shape", label: "Shape", group: "Tools", shortcut: "S", icon: <Shapes size={14} strokeWidth={1.8} />, run: tool("shape") },
      { id: "tool.pen", label: "Pen", group: "Tools", shortcut: "P", keywords: "draw", icon: <Pencil size={14} strokeWidth={1.8} />, run: tool("pen") },
      { id: "tool.eraser", label: "Eraser", group: "Tools", shortcut: "E", icon: <Eraser size={14} strokeWidth={1.8} />, run: tool("eraser") },
      { id: "tool.frame", label: "Frame", group: "Tools", shortcut: "F", icon: <Frame size={14} strokeWidth={1.8} />, run: tool("frame") },
      { id: "tool.comment", label: "Comment", group: "Tools", shortcut: "C", icon: <MessageCircle size={14} strokeWidth={1.8} />, run: tool("comment") },

      { id: "edit.undo", label: "Undo", group: "Edit", shortcut: "⌘Z", icon: <Undo2 size={14} strokeWidth={1.8} />, run: boardAct("undo") },
      { id: "edit.redo", label: "Redo", group: "Edit", shortcut: "⌘⇧Z", icon: <Redo2 size={14} strokeWidth={1.8} />, run: boardAct("redo") },
      { id: "edit.dup", label: "Duplicate selection", group: "Edit", shortcut: "⌘D", icon: <Copy size={14} strokeWidth={1.8} />, run: boardAct("duplicateSelected") },
      { id: "edit.copy", label: "Copy selection", group: "Edit", shortcut: "⌘C", icon: <Copy size={14} strokeWidth={1.8} />, run: boardAct("copySelection") },
      { id: "edit.cut", label: "Cut selection", group: "Edit", shortcut: "⌘X", icon: <Copy size={14} strokeWidth={1.8} />, run: boardAct("cutSelection") },
      { id: "edit.paste", label: "Paste", group: "Edit", shortcut: "⌘V", icon: <Copy size={14} strokeWidth={1.8} />, run: () => { useBoard.getState().pasteClipboard(); onRun(); } },
      { id: "edit.delete", label: "Delete selection", group: "Edit", shortcut: "Del", icon: <Trash2 size={14} strokeWidth={1.8} />, run: boardAct("deleteSelected") },
      { id: "edit.selectAll", label: "Select all", group: "Edit", shortcut: "⌘A", icon: <MousePointer2 size={14} strokeWidth={1.8} />, run: () => { const all = useBoard.getState().items.map((it) => it.id); useBoard.getState().setSelection(all); onRun(); } },
      { id: "edit.lock", label: "Toggle lock", group: "Edit", shortcut: "⌘L", icon: <Lock size={14} strokeWidth={1.8} />, run: boardAct("toggleLockSelected") },

      { id: "arrange.front", label: "Bring to front", group: "Arrange", shortcut: "⌘⇧]", icon: <ArrowUpToLine size={14} strokeWidth={1.8} />, run: boardAct("bringToFront") },
      { id: "arrange.forward", label: "Bring forward", group: "Arrange", shortcut: "⌘]", icon: <ArrowUpToLine size={14} strokeWidth={1.8} />, run: boardAct("bringForward") },
      { id: "arrange.backward", label: "Send backward", group: "Arrange", shortcut: "⌘[", icon: <ArrowDownToLine size={14} strokeWidth={1.8} />, run: boardAct("sendBackward") },
      { id: "arrange.back", label: "Send to back", group: "Arrange", shortcut: "⌘⇧[", icon: <ArrowDownToLine size={14} strokeWidth={1.8} />, run: boardAct("sendToBack") },

      { id: "nav.zoom100", label: "Zoom to 100%", group: "Navigate", shortcut: "1", icon: <Search size={14} strokeWidth={1.8} />, run: wrap(zoomTo100) },
      { id: "nav.fit", label: "Fit to screen", group: "Navigate", shortcut: "3", icon: <Search size={14} strokeWidth={1.8} />, run: () => { const bbox = useBoard.getState().contentBBox(); if (bbox) fitToBBox(bbox); onRun(); } },

      { id: "view.grid", label: "Toggle grid", group: "View", icon: <Grid3X3 size={14} strokeWidth={1.8} />, run: wrap(toggleGrid) },
      { id: "view.minimap", label: "Toggle minimap", group: "View", icon: <Map size={14} strokeWidth={1.8} />, run: wrap(toggleMinimap) },
      { id: "view.frames", label: "Toggle frames panel", group: "View", icon: <LayoutDashboard size={14} strokeWidth={1.8} />, run: () => { setFramesPanel(!useUI.getState().framesPanelOpen); onRun(); } },
      { id: "view.templates", label: "Open templates gallery", group: "View", icon: <LayoutTemplate size={14} strokeWidth={1.8} />, run: () => { setTemplates(true); onRun(); } },
      { id: "view.present", label: "Start presentation", group: "View", keywords: "slideshow play", icon: <Play size={14} strokeWidth={1.8} />, run: () => { startPresenting(0); onRun(); } },
      { id: "view.export", label: "Export board", group: "View", keywords: "download png svg json", icon: <Download size={14} strokeWidth={1.8} />, run: () => { setExport(true); onRun(); } },
      { id: "nav.search", label: "Find on board", group: "Navigate", shortcut: "⌘F", icon: <Search size={14} strokeWidth={1.8} />, run: () => { setSearch(true); onRun(); } },
      { id: "view.shortcuts", label: "Show shortcuts", group: "View", shortcut: "?", icon: <HelpCircle size={14} strokeWidth={1.8} />, run: () => { setShortcuts(true); onRun(); } },
    ];
  }, [setActive, setTemplates, setFramesPanel, setExport, setShortcuts, setSearch, startPresenting, toggleGrid, toggleMinimap, zoomTo100, fitToBBox, onRun]);
}

function fuzzyScore(query: string, cmd: Command): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const hay = `${cmd.label} ${cmd.group} ${cmd.keywords ?? ""}`.toLowerCase();
  if (hay.includes(q)) {
    // Rank label-start matches above group matches.
    if (cmd.label.toLowerCase().startsWith(q)) return 3;
    if (cmd.label.toLowerCase().includes(q)) return 2;
    return 1;
  }
  // Character-subsequence match.
  let qi = 0;
  for (let i = 0; i < hay.length && qi < q.length; i++) {
    if (hay[i] === q[qi]) qi++;
  }
  return qi === q.length ? 0.5 : 0;
}

export function CommandPalette() {
  const open = useUI((s) => s.commandPaletteOpen);
  const setOpen = useUI((s) => s.setCommandPalette);
  const [query, setQuery] = useState("");
  const [active, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useCommands(() => setOpen(false));

  const filtered = useMemo(() => {
    const scored = commands
      .map((c) => ({ c, score: fuzzyScore(query, c) }))
      .filter((x) => x.score > 0);
    scored.sort((a, b) => b.score - a.score);
    return scored.map((x) => x.c);
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[active];
        if (cmd) cmd.run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, active, setOpen]);

  // Keep active row visible.
  useEffect(() => {
    if (!listRef.current) return;
    const row = listRef.current.querySelector<HTMLElement>(`[data-cmd-idx="${active}"]`);
    if (row) row.scrollIntoView({ block: "nearest" });
  }, [active]);

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
            className="fixed inset-0 z-[80] bg-ink/30 backdrop-blur-sm"
          />
          <motion.div
            key="palette"
            initial={{ opacity: 0, scale: 0.98, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="fixed left-1/2 top-[18vh] z-[90] w-[520px] max-w-[92vw] -translate-x-1/2 overflow-hidden rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel shadow-[var(--shadow-lg)]"
          >
            <div className="flex items-center gap-2 border-b border-[var(--line)] px-3 py-2.5">
              <Search size={15} strokeWidth={1.8} className="text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Run a command…"
                className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-muted focus:outline-none"
              />
              <kbd className="font-mono text-[10px] text-muted">ESC</kbd>
            </div>

            <div
              ref={listRef}
              className="max-h-[320px] overflow-y-auto p-1"
            >
              {filtered.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="font-serif text-[18px] italic text-muted">
                    Nothing matches.
                  </p>
                </div>
              ) : (
                (() => {
                  const nodes: React.ReactNode[] = [];
                  let lastGroup = "";
                  filtered.forEach((cmd, idx) => {
                    if (cmd.group !== lastGroup) {
                      lastGroup = cmd.group;
                      nodes.push(
                        <div
                          key={`g-${cmd.group}`}
                          className="px-2 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted"
                        >
                          {cmd.group}
                        </div>,
                      );
                    }
                    const isActive = idx === active;
                    nodes.push(
                      <button
                        key={cmd.id}
                        type="button"
                        data-cmd-idx={idx}
                        onMouseEnter={() => setActiveIdx(idx)}
                        onClick={() => cmd.run()}
                        className={`flex w-full items-center gap-2 rounded-[var(--r-md)] px-2 py-1.5 text-left text-[13px] ${
                          isActive
                            ? "bg-panel-soft text-ink"
                            : "text-ink-soft hover:bg-panel-soft"
                        }`}
                      >
                        <span className="text-ink-soft">{cmd.icon}</span>
                        <span className="flex-1">{cmd.label}</span>
                        {cmd.shortcut && (
                          <kbd className="font-mono text-[10px] text-muted">
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </button>,
                    );
                  });
                  return nodes;
                })()
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
