"use client";

import {
  ArrowUpToLine,
  ArrowDownToLine,
  ChevronUp,
  ChevronDown,
  Copy,
  Lock,
  Scissors,
  ClipboardPaste,
  MousePointer2,
  Trash2,
  Unlock,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { getClipboard, useBoard } from "../lib/board-store";

export type ContextTarget =
  | { kind: "item"; id: string; clientX: number; clientY: number }
  | { kind: "canvas"; clientX: number; clientY: number; worldX: number; worldY: number };

type Props = {
  target: ContextTarget | null;
  onClose: () => void;
};

export function ContextMenu({ target, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

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

  // Clamp menu inside the viewport after mounting.
  useLayoutEffect(() => {
    if (!target) {
      setPos(null);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = Math.min(target.clientX, window.innerWidth - w - 8);
    const top = Math.min(target.clientY, window.innerHeight - h - 8);
    setPos({ left: Math.max(8, left), top: Math.max(8, top) });
  }, [target]);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, onClose]);

  if (!target) return null;

  // If the right-click targets an item that wasn't already selected, select it.
  if (target.kind === "item" && !selectedIds.includes(target.id)) {
    setSelection([target.id]);
  }

  const hasSelection =
    (target.kind === "item" && target.id) || selectedIds.length > 0;

  const anyLocked = items
    .filter((it) => selectedIds.includes(it.id))
    .some((it) => it.locked);

  const hasClipboard = !!getClipboard() && getClipboard()!.length > 0;

  const doPaste = () => {
    if (target.kind === "canvas") {
      pasteClipboard({ x: target.worldX, y: target.worldY });
    } else {
      pasteClipboard();
    }
  };

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
            className="fixed z-[70] min-w-[210px] rounded-[var(--r-xl)] border border-[var(--line)] bg-panel p-1 shadow-[var(--shadow-md)]"
          >
            {hasSelection ? (
              <>
                <MenuItem
                  icon={<Copy size={13} strokeWidth={1.8} />}
                  label="Copy"
                  shortcut="⌘C"
                  onClick={() => {
                    copySelection();
                    onClose();
                  }}
                />
                <MenuItem
                  icon={<Scissors size={13} strokeWidth={1.8} />}
                  label="Cut"
                  shortcut="⌘X"
                  onClick={() => {
                    cutSelection();
                    onClose();
                  }}
                />
                <MenuItem
                  icon={<ClipboardPaste size={13} strokeWidth={1.8} />}
                  label="Paste"
                  shortcut="⌘V"
                  disabled={!hasClipboard}
                  onClick={() => {
                    doPaste();
                    onClose();
                  }}
                />
                <MenuItem
                  icon={<Copy size={13} strokeWidth={1.8} />}
                  label="Duplicate"
                  shortcut="⌘D"
                  onClick={() => {
                    duplicateSelected();
                    onClose();
                  }}
                />
                <Divider />
                <MenuItem
                  icon={<ArrowUpToLine size={13} strokeWidth={1.8} />}
                  label="Bring to front"
                  shortcut="⌘⇧]"
                  onClick={() => {
                    bringToFront();
                    onClose();
                  }}
                />
                <MenuItem
                  icon={<ChevronUp size={13} strokeWidth={1.8} />}
                  label="Bring forward"
                  shortcut="⌘]"
                  onClick={() => {
                    bringForward();
                    onClose();
                  }}
                />
                <MenuItem
                  icon={<ChevronDown size={13} strokeWidth={1.8} />}
                  label="Send backward"
                  shortcut="⌘["
                  onClick={() => {
                    sendBackward();
                    onClose();
                  }}
                />
                <MenuItem
                  icon={<ArrowDownToLine size={13} strokeWidth={1.8} />}
                  label="Send to back"
                  shortcut="⌘⇧["
                  onClick={() => {
                    sendToBack();
                    onClose();
                  }}
                />
                <Divider />
                <MenuItem
                  icon={
                    anyLocked ? (
                      <Unlock size={13} strokeWidth={1.8} />
                    ) : (
                      <Lock size={13} strokeWidth={1.8} />
                    )
                  }
                  label={anyLocked ? "Unlock" : "Lock"}
                  shortcut="⌘L"
                  onClick={() => {
                    toggleLockSelected();
                    onClose();
                  }}
                />
                <MenuItem
                  icon={<Trash2 size={13} strokeWidth={1.8} />}
                  label="Delete"
                  shortcut="Del"
                  destructive
                  onClick={() => {
                    deleteSelected();
                    onClose();
                  }}
                />
              </>
            ) : (
              <>
                <MenuItem
                  icon={<ClipboardPaste size={13} strokeWidth={1.8} />}
                  label="Paste here"
                  shortcut="⌘V"
                  disabled={!hasClipboard}
                  onClick={() => {
                    doPaste();
                    onClose();
                  }}
                />
                <MenuItem
                  icon={<MousePointer2 size={13} strokeWidth={1.8} />}
                  label="Select all"
                  shortcut="⌘A"
                  onClick={() => {
                    const all = useBoard.getState().items.map((it) => it.id);
                    setSelection(all);
                    onClose();
                  }}
                />
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function MenuItem({
  icon,
  label,
  shortcut,
  onClick,
  disabled = false,
  destructive = false,
}: {
  icon?: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 rounded-[var(--r-md)] px-2 py-1.5 text-left text-[13px] ${
        disabled
          ? "text-muted opacity-50 cursor-not-allowed"
          : destructive
          ? "text-[var(--accent)] hover:bg-[var(--accent-soft)]"
          : "text-ink hover:bg-panel-soft"
      }`}
    >
      <span className={`flex w-4 items-center justify-center ${destructive ? "" : "text-ink-soft"}`}>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {shortcut && (
        <kbd className="font-mono text-[10px] text-muted">{shortcut}</kbd>
      )}
    </button>
  );
}

function Divider() {
  return <span className="my-1 block h-px bg-[var(--line)]" />;
}
