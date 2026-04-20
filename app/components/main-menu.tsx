"use client";

import {
  Braces,
  ChevronRight,
  Copy,
  Download,
  Eye,
  FileEdit,
  FileImage,
  FileText,
  FileType,
  Frame,
  Grid3X3,
  Home,
  LayoutDashboard,
  LayoutTemplate,
  Map,
  MonitorCog,
  MoreVertical,
  Pencil,
  Play,
  Redo2,
  Scissors,
  Search,
  Settings2,
  Sparkles,
  Square,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useBoard } from "../lib/board-store";
import { useBoards } from "../lib/boards-store";
import { exportJSON, exportPDF, exportPNG, exportSVG } from "../lib/export";
import { useUI } from "../lib/ui-store";
import { useViewport } from "../lib/viewport-store";

const BG = "var(--bg)";

type MenuEntry =
  | {
      kind: "item";
      label: string;
      shortcut?: string;
      icon: React.ReactNode;
      onClick: () => void;
      danger?: boolean;
      disabled?: boolean;
    }
  | { kind: "divider" };

type Submenu = {
  id: string;
  label: string;
  icon: React.ReactNode;
  entries: MenuEntry[];
};

export function MainMenu({ boardId }: { boardId: string }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const board = useBoards((s) => s.boards.find((b) => b.id === boardId));
  const duplicateBoard = useBoards((s) => s.duplicateBoard);
  const deleteBoard = useBoards((s) => s.deleteBoard);

  const requestRenameTitle = useUI((s) => s.requestRenameTitle);
  const setTemplates = useUI((s) => s.setTemplates);
  const setFramesPanel = useUI((s) => s.setFramesPanel);
  const setExportOpen = useUI((s) => s.setExport);
  const setCommandPalette = useUI((s) => s.setCommandPalette);
  const setSearch = useUI((s) => s.setSearch);
  const setShortcuts = useUI((s) => s.setShortcuts);
  const startPresenting = useUI((s) => s.startPresenting);

  const gridVisible = useViewport((s) => s.gridVisible);
  const toggleGrid = useViewport((s) => s.toggleGrid);
  const minimapVisible = useViewport((s) => s.minimapVisible);
  const toggleMinimap = useViewport((s) => s.toggleMinimap);
  const zoomStep = useViewport((s) => s.zoomStep);
  const zoomTo100 = useViewport((s) => s.zoomTo100);
  const fitToBBox = useViewport((s) => s.fitToBBox);

  const selectedCount = useBoard((s) => s.selectedIds.length);
  const historyLen = useBoard((s) => s.history.length);
  const futureLen = useBoard((s) => s.future.length);
  const undo = useBoard((s) => s.undo);
  const redo = useBoard((s) => s.redo);
  const copySelection = useBoard((s) => s.copySelection);
  const cutSelection = useBoard((s) => s.cutSelection);
  const pasteClipboard = useBoard((s) => s.pasteClipboard);
  const duplicateSelected = useBoard((s) => s.duplicateSelected);
  const deleteSelected = useBoard((s) => s.deleteSelected);
  const setSelection = useBoard((s) => s.setSelection);

  // Close on click-outside + Esc.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setHovered(null);
  };

  const run = (fn: () => void) => () => {
    fn();
    close();
  };

  const selectAll = () => {
    const all = useBoard.getState().items.map((it) => it.id);
    setSelection(all);
  };

  const onFitAll = () => {
    const bbox = useBoard.getState().contentBBox();
    if (bbox) fitToBBox(bbox);
  };

  const onPresent = () => {
    const hasFrames = useBoard
      .getState()
      .items.some((it) => it.type === "frame");
    if (!hasFrames) {
      setFramesPanel(true);
      return;
    }
    startPresenting(0);
  };

  const onDuplicateBoard = () => {
    const copy = duplicateBoard(boardId);
    if (copy) router.push(`/board/${copy.id}`);
  };

  const onDeleteBoard = () => {
    if (!board) return;
    const ok = confirm(`Delete "${board.name}"? This cannot be undone.`);
    if (!ok) return;
    deleteBoard(boardId);
    router.push("/");
  };

  const boardName = board?.name ?? "Untitled board";
  const boardItems = useBoard.getState().items;
  const hasContent = boardItems.some(
    (it) => it.type !== "connector" && it.type !== "comment",
  );

  const runExport = (format: "pdf" | "png" | "svg" | "json") => async () => {
    const items = useBoard.getState().items;
    try {
      if (format === "pdf") exportPDF(boardName, items, BG);
      else if (format === "png") await exportPNG(boardName, items, BG);
      else if (format === "svg") exportSVG(boardName, items, BG);
      else exportJSON(boardName, items);
    } catch (err) {
      alert((err as Error).message ?? "Export failed.");
    }
  };

  const submenus: Submenu[] = [
    {
      id: "board",
      label: "Board",
      icon: <MonitorCog size={14} strokeWidth={1.8} />,
      entries: [
        {
          kind: "item",
          label: "Rename board",
          icon: <FileEdit size={13} strokeWidth={1.8} />,
          onClick: run(requestRenameTitle),
        },
        {
          kind: "item",
          label: "Duplicate board",
          icon: <Copy size={13} strokeWidth={1.8} />,
          onClick: run(onDuplicateBoard),
        },
        { kind: "divider" },
        {
          kind: "item",
          label: "Back to boards",
          icon: <Home size={13} strokeWidth={1.8} />,
          onClick: run(() => router.push("/")),
        },
        { kind: "divider" },
        {
          kind: "item",
          label: "Delete board",
          icon: <Trash2 size={13} strokeWidth={1.8} />,
          onClick: run(onDeleteBoard),
          danger: true,
        },
      ],
    },
    {
      id: "export",
      label: "Export this board",
      icon: <Download size={14} strokeWidth={1.8} />,
      entries: [
        {
          kind: "item",
          label: "PDF",
          icon: <FileText size={13} strokeWidth={1.8} />,
          onClick: run(runExport("pdf")),
          disabled: !hasContent,
        },
        {
          kind: "item",
          label: "PNG image",
          icon: <FileImage size={13} strokeWidth={1.8} />,
          onClick: run(runExport("png")),
          disabled: !hasContent,
        },
        {
          kind: "item",
          label: "SVG vector",
          icon: <FileType size={13} strokeWidth={1.8} />,
          onClick: run(runExport("svg")),
          disabled: !hasContent,
        },
        { kind: "divider" },
        {
          kind: "item",
          label: "JSON backup",
          icon: <Braces size={13} strokeWidth={1.8} />,
          onClick: run(runExport("json")),
        },
        { kind: "divider" },
        {
          kind: "item",
          label: "More options…",
          icon: <Download size={13} strokeWidth={1.8} />,
          onClick: run(() => setExportOpen(true)),
        },
      ],
    },
    {
      id: "edit",
      label: "Edit",
      icon: <Pencil size={14} strokeWidth={1.8} />,
      entries: [
        {
          kind: "item",
          label: "Undo",
          shortcut: "⌘Z",
          icon: <Undo2 size={13} strokeWidth={1.8} />,
          onClick: run(undo),
          disabled: historyLen === 0,
        },
        {
          kind: "item",
          label: "Redo",
          shortcut: "⌘⇧Z",
          icon: <Redo2 size={13} strokeWidth={1.8} />,
          onClick: run(redo),
          disabled: futureLen === 0,
        },
        { kind: "divider" },
        {
          kind: "item",
          label: "Cut",
          shortcut: "⌘X",
          icon: <Scissors size={13} strokeWidth={1.8} />,
          onClick: run(cutSelection),
          disabled: selectedCount === 0,
        },
        {
          kind: "item",
          label: "Copy",
          shortcut: "⌘C",
          icon: <Copy size={13} strokeWidth={1.8} />,
          onClick: run(copySelection),
          disabled: selectedCount === 0,
        },
        {
          kind: "item",
          label: "Paste",
          shortcut: "⌘V",
          icon: <Copy size={13} strokeWidth={1.8} />,
          onClick: run(() => pasteClipboard()),
        },
        {
          kind: "item",
          label: "Duplicate",
          shortcut: "⌘D",
          icon: <Copy size={13} strokeWidth={1.8} />,
          onClick: run(duplicateSelected),
          disabled: selectedCount === 0,
        },
        { kind: "divider" },
        {
          kind: "item",
          label: "Select all",
          shortcut: "⌘A",
          icon: <Square size={13} strokeWidth={1.8} />,
          onClick: run(selectAll),
        },
        {
          kind: "item",
          label: "Delete",
          shortcut: "Del",
          icon: <Trash2 size={13} strokeWidth={1.8} />,
          onClick: run(deleteSelected),
          disabled: selectedCount === 0,
          danger: true,
        },
        { kind: "divider" },
        {
          kind: "item",
          label: "Find on board",
          shortcut: "⌘F",
          icon: <Search size={13} strokeWidth={1.8} />,
          onClick: run(() => setSearch(true)),
        },
        {
          kind: "item",
          label: "Command palette",
          shortcut: "⌘/",
          icon: <Sparkles size={13} strokeWidth={1.8} />,
          onClick: run(() => setCommandPalette(true)),
        },
      ],
    },
    {
      id: "view",
      label: "View",
      icon: <Eye size={14} strokeWidth={1.8} />,
      entries: [
        {
          kind: "item",
          label: "Zoom in",
          shortcut: "⌘=",
          icon: <ZoomIn size={13} strokeWidth={1.8} />,
          onClick: run(() => zoomStep(1)),
        },
        {
          kind: "item",
          label: "Zoom out",
          shortcut: "⌘−",
          icon: <ZoomOut size={13} strokeWidth={1.8} />,
          onClick: run(() => zoomStep(-1)),
        },
        {
          kind: "item",
          label: "Zoom to 100%",
          shortcut: "1",
          icon: <Square size={13} strokeWidth={1.8} />,
          onClick: run(zoomTo100),
        },
        {
          kind: "item",
          label: "Fit to content",
          shortcut: "3",
          icon: <Square size={13} strokeWidth={1.8} />,
          onClick: run(onFitAll),
        },
        { kind: "divider" },
        {
          kind: "item",
          label: `${gridVisible ? "Hide" : "Show"} grid`,
          icon: <Grid3X3 size={13} strokeWidth={1.8} />,
          onClick: run(toggleGrid),
        },
        {
          kind: "item",
          label: `${minimapVisible ? "Hide" : "Show"} minimap`,
          icon: <Map size={13} strokeWidth={1.8} />,
          onClick: run(toggleMinimap),
        },
        {
          kind: "item",
          label: "Frames panel",
          icon: <LayoutDashboard size={13} strokeWidth={1.8} />,
          onClick: run(() => setFramesPanel(true)),
        },
        {
          kind: "item",
          label: "Templates gallery",
          icon: <LayoutTemplate size={13} strokeWidth={1.8} />,
          onClick: run(() => setTemplates(true)),
        },
        { kind: "divider" },
        {
          kind: "item",
          label: "Present",
          icon: <Play size={13} strokeWidth={1.8} />,
          onClick: run(onPresent),
        },
      ],
    },
    {
      id: "preferences",
      label: "Preferences",
      icon: <Settings2 size={14} strokeWidth={1.8} />,
      entries: [
        {
          kind: "item",
          label: "Keyboard shortcuts",
          shortcut: "?",
          icon: <Frame size={13} strokeWidth={1.8} />,
          onClick: run(() => setShortcuts(true)),
        },
      ],
    },
    {
      id: "accessibility",
      label: "Accessibility",
      icon: <Eye size={14} strokeWidth={1.8} />,
      entries: [
        {
          kind: "item",
          label: "Show keyboard shortcuts",
          icon: <Frame size={13} strokeWidth={1.8} />,
          onClick: run(() => setShortcuts(true)),
        },
      ],
    },
  ];

  return (
    <div ref={rootRef} className="relative">
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Main menu"
        title="Main menu"
        className={`flex h-8 w-8 items-center justify-center rounded-[var(--r-md)] ${
          open ? "bg-panel-soft text-ink" : "text-ink-soft hover:bg-panel-soft"
        }`}
      >
        <MoreVertical size={15} strokeWidth={1.8} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute left-0 top-[calc(100%+8px)] z-50 min-w-[224px] rounded-[var(--r-xl)] border border-[var(--line)] bg-panel p-1 shadow-[var(--shadow-md)]"
          >
            {submenus.map((sm, i) => (
              <div key={sm.id}>
                {i > 0 && i === submenus.length - 2 && (
                  <span className="my-1 block h-px bg-[var(--line)]" />
                )}
                <SubmenuRow
                  submenu={sm}
                  open={hovered === sm.id}
                  onHover={() => setHovered(sm.id)}
                />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SubmenuRow({
  submenu,
  open,
  onHover,
}: {
  submenu: Submenu;
  open: boolean;
  onHover: () => void;
}) {
  return (
    <div className="relative" onMouseEnter={onHover}>
      <button
        type="button"
        className={`flex w-full items-center gap-2 rounded-[var(--r-md)] px-2 py-1.5 text-left text-[13px] ${
          open ? "bg-panel-soft text-ink" : "text-ink hover:bg-panel-soft"
        }`}
      >
        <span className="text-ink-soft">{submenu.icon}</span>
        <span className="flex-1">{submenu.label}</span>
        <ChevronRight size={13} strokeWidth={1.8} className="text-muted" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: -4, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
            className="absolute left-[calc(100%+4px)] top-0 z-50 min-w-[240px] rounded-[var(--r-xl)] border border-[var(--line)] bg-panel p-1 shadow-[var(--shadow-md)]"
          >
            {submenu.entries.map((entry, idx) =>
              entry.kind === "divider" ? (
                <span
                  key={`div-${idx}`}
                  className="my-1 block h-px bg-[var(--line)]"
                />
              ) : (
                <MenuButton key={`${submenu.id}-${idx}`} entry={entry} />
              ),
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuButton({
  entry,
}: {
  entry: Extract<MenuEntry, { kind: "item" }>;
}) {
  return (
    <button
      type="button"
      disabled={entry.disabled}
      onClick={entry.disabled ? undefined : entry.onClick}
      className={`flex w-full items-center gap-2 rounded-[var(--r-md)] px-2 py-1.5 text-left text-[13px] ${
        entry.disabled
          ? "text-muted opacity-50 cursor-not-allowed"
          : entry.danger
          ? "text-[var(--accent)] hover:bg-[var(--accent-soft)]"
          : "text-ink hover:bg-panel-soft"
      }`}
    >
      <span
        className={
          entry.disabled
            ? "text-muted"
            : entry.danger
            ? "text-[var(--accent)]"
            : "text-ink-soft"
        }
      >
        {entry.icon}
      </span>
      <span className="flex-1">{entry.label}</span>
      {entry.shortcut && (
        <kbd className="font-mono text-[10px] text-muted">{entry.shortcut}</kbd>
      )}
    </button>
  );
}
