"use client";

import {
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardPaste,
  Copy,
  Eraser,
  ExternalLink,
  FileImage,
  FilePlus2,
  FileSpreadsheet,
  Frame,
  Info,
  Layers,
  Link,
  Link2,
  Lock,
  MessageSquarePlus,
  MousePointer2,
  Palette,
  Paintbrush,
  Save,
  Scissors,
  Trash2,
  Unlock,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  getClipboard,
  getStyleClipboard,
  newId,
  useBoard,
  type CommentItem,
  type Item,
} from "../lib/board-store";
import { copyItemsAsImage } from "../lib/export";

export type ContextTarget =
  | { kind: "item"; id: string; clientX: number; clientY: number }
  | {
      kind: "canvas";
      clientX: number;
      clientY: number;
      worldX: number;
      worldY: number;
    };

type Entry =
  | {
      kind: "item";
      label: string;
      shortcut?: string;
      icon?: React.ReactNode;
      onClick: () => void;
      disabled?: boolean;
      danger?: boolean;
    }
  | { kind: "divider" }
  | {
      kind: "submenu";
      label: string;
      icon?: React.ReactNode;
      entries: Entry[];
    };

type Props = {
  target: ContextTarget | null;
  onClose: () => void;
};

export function ContextMenu({ target, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [hoveredSub, setHoveredSub] = useState<string | null>(null);

  const selectedIds = useBoard((s) => s.selectedIds);
  const items = useBoard((s) => s.items);
  const bringToFront = useBoard((s) => s.bringToFront);
  const bringForward = useBoard((s) => s.bringForward);
  const sendBackward = useBoard((s) => s.sendBackward);
  const sendToBack = useBoard((s) => s.sendToBack);
  const duplicateSelected = useBoard((s) => s.duplicateSelected);
  const copySelection = useBoard((s) => s.copySelection);
  const cutSelection = useBoard((s) => s.cutSelection);
  const pasteClipboard = useBoard((s) => s.pasteClipboard);
  const deleteSelected = useBoard((s) => s.deleteSelected);
  const toggleLockSelected = useBoard((s) => s.toggleLockSelected);
  const setSelection = useBoard((s) => s.setSelection);
  const copyStyleFromSelection = useBoard((s) => s.copyStyleFromSelection);
  const pasteStyleToSelection = useBoard((s) => s.pasteStyleToSelection);
  const frameAroundSelection = useBoard((s) => s.frameAroundSelection);

  useLayoutEffect(() => {
    if (!target) {
      setPos(null);
      setHoveredSub(null);
      return;
    }
    // Seed position immediately so the menu mounts; we correct for overflow
    // on the next layout pass once the element has a measurable size.
    setPos({ left: target.clientX, top: target.clientY });
  }, [target]);

  useLayoutEffect(() => {
    if (!target || !pos) return;
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = Math.max(
      8,
      Math.min(target.clientX, window.innerWidth - w - 8),
    );
    const top = Math.max(
      8,
      Math.min(target.clientY, window.innerHeight - h - 8),
    );
    if (left !== pos.left || top !== pos.top) setPos({ left, top });
  }, [target, pos]);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, onClose]);

  // If the right-click targets an item that isn't selected, select just it.
  useEffect(() => {
    if (target?.kind === "item" && !selectedIds.includes(target.id)) {
      setSelection([target.id]);
    }
  }, [target, selectedIds, setSelection]);

  if (!target) return null;

  const hasSelection =
    (target.kind === "item" && !!target.id) || selectedIds.length > 0;
  const selected = items.filter((it) => selectedIds.includes(it.id));
  const anyLocked = selected.some((it) => it.locked);
  const hasClipboard = !!getClipboard() && getClipboard()!.length > 0;
  const hasStyleClipboard = !!getStyleClipboard();
  const firstSelected = selected[0];
  const pasteStyleEnabled =
    !!firstSelected &&
    !!getStyleClipboard() &&
    firstSelected.type === getStyleClipboard()!.type;

  const doPaste = () => {
    if (target.kind === "canvas") {
      pasteClipboard({ x: target.worldX, y: target.worldY });
    } else {
      pasteClipboard();
    }
  };

  const doCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* ignored */
    }
  };

  const doCopyAsImage = async () => {
    if (selected.length === 0) return;
    try {
      await copyItemsAsImage(selected, "var(--bg)");
    } catch (err) {
      alert((err as Error).message ?? "Couldn't copy as image.");
    }
  };

  const canClearContent = selected.some(
    (it) => it.type === "sticky" || it.type === "text" || it.type === "shape",
  );

  const doAddComment = () => {
    const anchor = firstSelected;
    const { addItem } = useBoard.getState();
    let cx: number;
    let cy: number;
    if (anchor) {
      cx = anchor.x + anchor.w + 8;
      cy = anchor.y;
    } else if (target.kind === "canvas") {
      cx = target.worldX;
      cy = target.worldY;
    } else {
      return;
    }
    const comment: CommentItem = {
      id: newId("comment"),
      type: "comment",
      x: cx,
      y: cy,
      w: 36,
      h: 36,
      rotation: 0,
      thread: [],
      resolved: false,
    };
    addItem(comment);
    setSelection([comment.id]);
  };

  const doClearContent = () => {
    const { updateItem } = useBoard.getState();
    for (const it of selected) {
      if (it.type === "sticky" || it.type === "text" || it.type === "shape") {
        updateItem(it.id, { text: "" } as Partial<Item>);
      }
    }
  };

  const doLinkTo = () => {
    if (selected.length === 0) return;
    const current = firstSelected?.link ?? "";
    const url = window.prompt("Link URL (leave empty to remove):", current);
    if (url === null) return;
    const trimmed = url.trim();
    const { updateItem } = useBoard.getState();
    for (const it of selected) {
      updateItem(it.id, { link: trimmed ? trimmed : undefined } as Partial<Item>);
    }
  };

  const doSaveAsTemplate = () => {
    if (selected.length === 0) return;
    const name = window.prompt("Template name:", "Untitled template");
    if (!name) return;
    try {
      const key = "aedas-board:templates";
      const raw = localStorage.getItem(key);
      const list: { id: string; name: string; createdAt: number; items: Item[] }[] =
        raw ? JSON.parse(raw) : [];
      list.push({
        id: newId("tpl"),
        name,
        createdAt: Date.now(),
        items: selected.map((it) => ({ ...it })),
      });
      localStorage.setItem(key, JSON.stringify(list));
    } catch (err) {
      alert((err as Error).message ?? "Couldn't save template.");
    }
  };

  const doExportCsv = () => {
    if (selected.length === 0) return;
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const textOf = (it: Item) =>
      it.type === "sticky" || it.type === "text" || it.type === "shape"
        ? it.text
        : it.type === "frame"
        ? it.title
        : "";
    const header = ["id", "type", "x", "y", "w", "h", "text", "link", "locked"];
    const rows = selected.map((it) => [
      it.id,
      it.type,
      Math.round(it.x),
      Math.round(it.y),
      Math.round(it.w),
      Math.round(it.h),
      textOf(it),
      it.link ?? "",
      it.locked ? "true" : "false",
    ]);
    const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `board-selection-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  type Template = {
    id: string;
    name: string;
    createdAt: number;
    items: Item[];
  };

  const templatesKey = "aedas-board:templates";

  const loadTemplates = (): Template[] => {
    try {
      const raw = localStorage.getItem(templatesKey);
      return raw ? (JSON.parse(raw) as Template[]) : [];
    } catch {
      return [];
    }
  };

  const linkedItem = selected.find((it) => !!it.link);

  const doOpenLink = () => {
    if (!linkedItem?.link) return;
    try {
      window.open(linkedItem.link, "_blank", "noopener,noreferrer");
    } catch {
      /* ignored */
    }
  };

  const doInsertTemplate = (tpl: Template) => {
    if (!tpl.items || tpl.items.length === 0) return;
    const { addItem, setSelection: setSel } = useBoard.getState();

    // Compute original bbox so we can translate to the insertion point.
    let minX = Infinity;
    let minY = Infinity;
    for (const it of tpl.items) {
      minX = Math.min(minX, it.x);
      minY = Math.min(minY, it.y);
    }
    if (!isFinite(minX)) return;

    let insertX: number;
    let insertY: number;
    if (target.kind === "canvas") {
      insertX = target.worldX;
      insertY = target.worldY;
    } else {
      insertX = (firstSelected?.x ?? 0) + 20;
      insertY = (firstSelected?.y ?? 0) + 20;
    }
    const dx = insertX - minX;
    const dy = insertY - minY;

    const idMap = new Map<string, string>();
    for (const it of tpl.items) idMap.set(it.id, newId(it.type));

    const inserted: Item[] = tpl.items.map((it) => {
      const clone: Item = { ...it, id: idMap.get(it.id)!, x: it.x + dx, y: it.y + dy };
      if (clone.type === "connector") {
        const remap = (end: typeof clone.from) =>
          end.kind === "item" && idMap.has(end.itemId)
            ? { kind: "item" as const, itemId: idMap.get(end.itemId)! }
            : end;
        (clone as typeof clone).from = remap(clone.from);
        (clone as typeof clone).to = remap(clone.to);
      }
      return clone;
    });

    for (const it of inserted) addItem(it);
    setSel(inserted.map((it) => it.id));
  };

  const doDeleteTemplate = (tpl: Template) => {
    if (!window.confirm(`Delete template "${tpl.name}"?`)) return;
    try {
      const list = loadTemplates().filter((t) => t.id !== tpl.id);
      localStorage.setItem(templatesKey, JSON.stringify(list));
    } catch {
      /* ignored */
    }
  };

  const templates = loadTemplates();

  const templateSubmenu: Entry = {
    kind: "submenu",
    label: "Insert template",
    icon: <FilePlus2 size={13} strokeWidth={1.8} />,
    entries:
      templates.length === 0
        ? [
            {
              kind: "item",
              label: "No saved templates",
              icon: <FilePlus2 size={13} strokeWidth={1.8} />,
              disabled: true,
              onClick: () => {},
            },
          ]
        : templates.map(
            (tpl) =>
              ({
                kind: "item",
                label: tpl.name,
                icon: <FilePlus2 size={13} strokeWidth={1.8} />,
                onClick: () => {
                  doInsertTemplate(tpl);
                  onClose();
                },
              }) as Entry,
          ),
  };

  const doInfo = () => {
    if (!firstSelected) return;
    const lines = [
      `ID: ${firstSelected.id}`,
      `Type: ${firstSelected.type}`,
      `Position: ${Math.round(firstSelected.x)}, ${Math.round(firstSelected.y)}`,
      `Size: ${Math.round(firstSelected.w)} × ${Math.round(firstSelected.h)}`,
      firstSelected.locked ? "Locked" : "",
    ]
      .filter(Boolean)
      .join("\n");
    alert(lines);
  };

  const itemEntries: Entry[] = [
    {
      kind: "item",
      label: "Copy",
      shortcut: "⌘C",
      icon: <Copy size={13} strokeWidth={1.8} />,
      onClick: () => {
        copySelection();
        onClose();
      },
    },
    {
      kind: "item",
      label: "Copy link",
      shortcut: "⌘⌥⇧C",
      icon: <Link2 size={13} strokeWidth={1.8} />,
      onClick: () => {
        void doCopyLink();
        onClose();
      },
    },
    {
      kind: "item",
      label: "Copy as image",
      shortcut: "⌘⇧C",
      icon: <FileImage size={13} strokeWidth={1.8} />,
      onClick: () => {
        void doCopyAsImage();
        onClose();
      },
    },
    {
      kind: "item",
      label: "Cut",
      shortcut: "⌘X",
      icon: <Scissors size={13} strokeWidth={1.8} />,
      onClick: () => {
        cutSelection();
        onClose();
      },
    },
    {
      kind: "item",
      label: "Paste",
      shortcut: "⌘V",
      icon: <ClipboardPaste size={13} strokeWidth={1.8} />,
      disabled: !hasClipboard,
      onClick: () => {
        doPaste();
        onClose();
      },
    },
    {
      kind: "item",
      label: "Duplicate",
      shortcut: "⌘D",
      icon: <Copy size={13} strokeWidth={1.8} />,
      onClick: () => {
        duplicateSelected();
        onClose();
      },
    },
    {
      kind: "item",
      label: "Delete",
      shortcut: "Del",
      icon: <Trash2 size={13} strokeWidth={1.8} />,
      danger: true,
      onClick: () => {
        deleteSelected();
        onClose();
      },
    },
    { kind: "divider" },
    {
      kind: "item",
      label: "Add comment",
      icon: <MessageSquarePlus size={13} strokeWidth={1.8} />,
      onClick: () => {
        doAddComment();
        onClose();
      },
    },
    {
      kind: "item",
      label: "Copy style",
      shortcut: "⌘⌥C",
      icon: <Palette size={13} strokeWidth={1.8} />,
      disabled: !firstSelected,
      onClick: () => {
        copyStyleFromSelection();
        onClose();
      },
    },
    {
      kind: "item",
      label: "Paste style",
      shortcut: "⌘⌥V",
      icon: <Paintbrush size={13} strokeWidth={1.8} />,
      disabled: !pasteStyleEnabled,
      onClick: () => {
        pasteStyleToSelection();
        onClose();
      },
    },
    {
      kind: "item",
      label: "Clear content",
      shortcut: "⌘⌫",
      icon: <Eraser size={13} strokeWidth={1.8} />,
      disabled: !canClearContent,
      onClick: () => {
        doClearContent();
        onClose();
      },
    },
    { kind: "divider" },
    {
      kind: "submenu",
      label: "Arrange",
      icon: <Layers size={13} strokeWidth={1.8} />,
      entries: [
        {
          kind: "item",
          label: "Bring to front",
          shortcut: "⌘⇧]",
          icon: <ArrowUpToLine size={13} strokeWidth={1.8} />,
          onClick: () => {
            bringToFront();
            onClose();
          },
        },
        {
          kind: "item",
          label: "Bring forward",
          shortcut: "⌘]",
          icon: <ChevronUp size={13} strokeWidth={1.8} />,
          onClick: () => {
            bringForward();
            onClose();
          },
        },
        {
          kind: "item",
          label: "Send backward",
          shortcut: "⌘[",
          icon: <ChevronDown size={13} strokeWidth={1.8} />,
          onClick: () => {
            sendBackward();
            onClose();
          },
        },
        {
          kind: "item",
          label: "Send to back",
          shortcut: "⌘⇧[",
          icon: <ArrowDownToLine size={13} strokeWidth={1.8} />,
          onClick: () => {
            sendToBack();
            onClose();
          },
        },
      ],
    },
    {
      kind: "item",
      label: "Link to",
      shortcut: "⌥⌘K",
      icon: <Link size={13} strokeWidth={1.8} />,
      disabled: !firstSelected,
      onClick: () => {
        doLinkTo();
        onClose();
      },
    },
    ...(linkedItem
      ? ([
          {
            kind: "item",
            label: "Open link",
            icon: <ExternalLink size={13} strokeWidth={1.8} />,
            onClick: () => {
              doOpenLink();
              onClose();
            },
          },
        ] as Entry[])
      : []),
    {
      kind: "item",
      label: anyLocked ? "Unlock" : "Lock",
      shortcut: "⌘L",
      icon: anyLocked ? (
        <Unlock size={13} strokeWidth={1.8} />
      ) : (
        <Lock size={13} strokeWidth={1.8} />
      ),
      onClick: () => {
        toggleLockSelected();
        onClose();
      },
    },
    {
      kind: "item",
      label: "Create frame",
      icon: <Frame size={13} strokeWidth={1.8} />,
      onClick: () => {
        frameAroundSelection();
        onClose();
      },
    },
    { kind: "divider" },
    {
      kind: "item",
      label: "Save as template",
      icon: <Save size={13} strokeWidth={1.8} />,
      disabled: selected.length === 0,
      onClick: () => {
        doSaveAsTemplate();
        onClose();
      },
    },
    templateSubmenu,
    {
      kind: "item",
      label: "Export to CSV (Excel)",
      icon: <FileSpreadsheet size={13} strokeWidth={1.8} />,
      disabled: selected.length === 0,
      onClick: () => {
        doExportCsv();
        onClose();
      },
    },
    {
      kind: "item",
      label: "Info",
      icon: <Info size={13} strokeWidth={1.8} />,
      disabled: !firstSelected,
      onClick: () => {
        doInfo();
        onClose();
      },
    },
  ];

  const canvasEntries: Entry[] = [
    {
      kind: "item",
      label: "Paste here",
      shortcut: "⌘V",
      icon: <ClipboardPaste size={13} strokeWidth={1.8} />,
      disabled: !hasClipboard,
      onClick: () => {
        doPaste();
        onClose();
      },
    },
    {
      kind: "item",
      label: "Paste style",
      shortcut: "⌘⌥V",
      icon: <Paintbrush size={13} strokeWidth={1.8} />,
      disabled: !hasStyleClipboard,
      onClick: () => {
        pasteStyleToSelection();
        onClose();
      },
    },
    {
      kind: "item",
      label: "Select all",
      shortcut: "⌘A",
      icon: <MousePointer2 size={13} strokeWidth={1.8} />,
      onClick: () => {
        const all = useBoard.getState().items.map((it) => it.id);
        setSelection(all);
        onClose();
      },
    },
    { kind: "divider" },
    templateSubmenu,
  ];

  const entries = hasSelection ? itemEntries : canvasEntries;

  return (
    <AnimatePresence>
      {pos && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            onPointerDown={onClose}
            onContextMenu={(e) => {
              e.preventDefault();
              onClose();
            }}
          />
          <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
            style={{ left: pos.left, top: pos.top }}
            className="fixed z-[70] min-w-[240px] rounded-[var(--r-xl)] border border-[var(--line)] bg-panel p-1 shadow-[var(--shadow-md)]"
            // Swallow pointer events inside the menu so they don't bubble to
            // the canvas root (which would otherwise start a pan gesture and
            // then clearSelection() on release, breaking every menu action).
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            {entries.map((entry, idx) => {
              if (entry.kind === "divider") {
                return (
                  <span
                    key={`div-${idx}`}
                    className="my-1 block h-px bg-[var(--line)]"
                  />
                );
              }
              if (entry.kind === "submenu") {
                const open = hoveredSub === entry.label;
                return (
                  <SubmenuRow
                    key={`sub-${entry.label}`}
                    entry={entry}
                    open={open}
                    onHover={() => setHoveredSub(entry.label)}
                  />
                );
              }
              return <MenuButton key={`b-${idx}`} entry={entry} />;
            })}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SubmenuRow({
  entry,
  open,
  onHover,
}: {
  entry: Extract<Entry, { kind: "submenu" }>;
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
        <span className="flex w-4 items-center justify-center text-ink-soft">
          {entry.icon}
        </span>
        <span className="flex-1">{entry.label}</span>
        <ChevronRight size={13} strokeWidth={1.8} className="text-muted" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: -4, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: [0.4, 0, 0.2, 1] }}
            className="absolute left-[calc(100%+4px)] top-0 z-[80] min-w-[220px] rounded-[var(--r-xl)] border border-[var(--line)] bg-panel p-1 shadow-[var(--shadow-md)]"
          >
            {entry.entries.map((child, idx) => {
              if (child.kind === "divider") {
                return (
                  <span
                    key={`cdiv-${idx}`}
                    className="my-1 block h-px bg-[var(--line)]"
                  />
                );
              }
              if (child.kind === "submenu") return null;
              return <MenuButton key={`c-${idx}`} entry={child} />;
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuButton({ entry }: { entry: Extract<Entry, { kind: "item" }> }) {
  return (
    <button
      type="button"
      onClick={entry.disabled ? undefined : entry.onClick}
      disabled={entry.disabled}
      className={`flex w-full items-center gap-2 rounded-[var(--r-md)] px-2 py-1.5 text-left text-[13px] ${
        entry.disabled
          ? "text-muted opacity-50 cursor-not-allowed"
          : entry.danger
          ? "text-[var(--accent)] hover:bg-[var(--accent-soft)]"
          : "text-ink hover:bg-panel-soft"
      }`}
    >
      <span
        className={`flex w-4 items-center justify-center ${
          entry.disabled
            ? "text-muted"
            : entry.danger
            ? "text-[var(--accent)]"
            : "text-ink-soft"
        }`}
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
