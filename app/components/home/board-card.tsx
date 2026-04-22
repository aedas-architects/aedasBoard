"use client";

import { Check, Folder, FolderInput, LayoutGrid, MoreHorizontal, Star, User, Workflow } from "lucide-react";
import { motion } from "motion/react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { boardItemsKey, type BoardMeta, useBoards } from "../../lib/boards-store";
import type { Item } from "../../lib/board-store";
import { useSpaces } from "../../lib/spaces-store";

const ICONS: Record<BoardMeta["icon"], React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  folder: Folder,
  user: User,
  flow: Workflow,
  grid: LayoutGrid,
};

const ICON_TINT: Record<BoardMeta["icon"], string> = {
  folder: "#c97a1f",
  user: "#7C3AED",
  flow: "#d94a38",
  grid: "#7C3AED",
};

function formatRelative(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  const days = Math.floor(diff / 86_400_000);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function formatDay(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 86_400_000) return "Today";
  if (diff < 172_800_000) return "Yesterday";
  return new Date(ts).toLocaleDateString();
}

function ThumbnailPreview({ boardId }: { boardId: string }) {
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(boardItemsKey(boardId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as { items?: Item[] };
      if (Array.isArray(parsed.items)) setItems(parsed.items);
    } catch {
      /* ignore */
    }
  }, [boardId]);

  if (!items || items.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-bg">
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-8 w-10 rounded-[6px]"
              style={{ background: "var(--line)", opacity: 0.5 + i * 0.06 }}
            />
          ))}
        </div>
      </div>
    );
  }

  const pad = 20;
  const minX = Math.min(...items.map((i) => i.x));
  const minY = Math.min(...items.map((i) => i.y));
  const maxX = Math.max(...items.map((i) => i.x + i.w));
  const maxY = Math.max(...items.map((i) => i.y + i.h));
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const scale = Math.min((260 - pad * 2) / w, (140 - pad * 2) / h, 0.25);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="absolute"
        style={{
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center center",
          width: w,
          height: h,
        }}
      >
        {items.map((it) => {
          const x = it.x - minX;
          const y = it.y - minY;
          if (it.type === "sticky") {
            return (
              <div key={it.id} className="absolute rounded-[4px]"
                style={{ left: x, top: y, width: it.w, height: it.h, background: it.color, boxShadow: "0 2px 6px rgba(0,0,0,0.08)" }} />
            );
          }
          if (it.type === "shape") {
            return (
              <div key={it.id} className="absolute border-2"
                style={{ left: x, top: y, width: it.w, height: it.h, background: it.fill, borderColor: it.stroke, borderRadius: it.kind === "oval" ? "50%" : 8 }} />
            );
          }
          if (it.type === "text") {
            return (
              <div key={it.id} className="absolute"
                style={{ left: x, top: y, width: it.w, fontSize: it.fontSize, color: it.color ?? "var(--ink)", fontWeight: it.fontWeight ?? 500, fontStyle: it.italic ? "italic" : "normal", whiteSpace: "pre-wrap" }}>
                {it.text}
              </div>
            );
          }
          if (it.type === "frame") {
            return (
              <div key={it.id} className="absolute rounded-[4px] border border-[var(--line)] bg-panel"
                style={{ left: x, top: y, width: it.w, height: it.h }} />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

function CardMenu({ boardId, boardName }: { boardId: string; boardName: string }) {
  const deleteBoard = useBoards((s) => s.deleteBoard);
  const spaces = useSpaces((s) => s.spaces);
  const currentSpaceId = useSpaces((s) => s.boardSpace[boardId]);
  const setBoardSpace = useSpaces((s) => s.setBoardSpace);
  const [open, setOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // mousedown beats click — fires before click bubbles through a zoomed ancestor.
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        (ref.current && ref.current.contains(t)) ||
        (menuRef.current && menuRef.current.contains(t))
      ) {
        return;
      }
      setOpen(false);
      setMoveOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (open) {
      setOpen(false);
      setMoveOpen(false);
      return;
    }
    // Anchor the menu below the trigger using fixed positioning (survives
    // parent `overflow-hidden` and the page-level `zoom` scale).
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    setOpen(true);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        className={`flex h-7 w-7 items-center justify-center rounded-[var(--r-md)] transition-colors ${
          open
            ? "bg-panel-soft text-ink"
            : "text-muted hover:bg-panel-soft hover:text-ink"
        }`}
        aria-label="More"
        aria-expanded={open}
      >
        <MoreHorizontal size={14} strokeWidth={1.8} />
      </button>
      {open && pos && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] min-w-[180px] rounded-[var(--r-lg)] border border-[var(--line)] bg-panel p-1 shadow-[var(--shadow-md)]"
          style={{ top: pos.top, right: pos.right }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Move to space (expands inline rather than a flyout to keep position math simple) */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setMoveOpen((v) => !v); }}
            className="flex w-full items-center justify-between rounded-[var(--r-md)] px-2 py-1.5 text-left text-[13px] text-ink-soft hover:bg-panel-soft hover:text-ink"
          >
            <span className="flex items-center gap-2">
              <FolderInput size={13} strokeWidth={1.8} />
              Move to space
            </span>
            <span className="font-mono text-[10px] text-muted">{moveOpen ? "▾" : "▸"}</span>
          </button>
          {moveOpen && (
            <div className="mb-1 ml-2 mr-1 flex flex-col gap-0.5 border-l border-[var(--line)] pl-2">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setBoardSpace(boardId, null); setOpen(false); setMoveOpen(false); }}
                className="flex items-center justify-between rounded-[var(--r-sm)] px-2 py-1 text-left text-[12.5px] text-ink-soft hover:bg-panel-soft hover:text-ink"
              >
                <span>No space</span>
                {!currentSpaceId && <Check size={12} strokeWidth={2} className="text-[var(--accent)]" />}
              </button>
              {spaces.length === 0 ? (
                <span className="px-2 py-1 text-[11.5px] text-muted">No spaces yet. Create one in the sidebar.</span>
              ) : (
                spaces.map((sp) => (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={(e) => { e.preventDefault(); setBoardSpace(boardId, sp.id); setOpen(false); setMoveOpen(false); }}
                    className="flex items-center justify-between rounded-[var(--r-sm)] px-2 py-1 text-left text-[12.5px] text-ink-soft hover:bg-panel-soft hover:text-ink"
                  >
                    <span className="truncate">{sp.name}</span>
                    {currentSpaceId === sp.id && <Check size={12} strokeWidth={2} className="text-[var(--accent)]" />}
                  </button>
                ))
              )}
            </div>
          )}

          <div className="my-1 h-px bg-[var(--line)]" />

          <button
            type="button"
            onClick={(e) => { e.preventDefault(); if (confirm(`Delete "${boardName}"?`)) deleteBoard(boardId); setOpen(false); }}
            className="w-full rounded-[var(--r-md)] px-2 py-1.5 text-left text-[13px] text-[var(--accent)] hover:bg-[var(--accent-soft)]"
          >
            Delete board
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}

export function BoardCard({ board, view = "grid" }: { board: BoardMeta; view?: "grid" | "list" }) {
  const Icon = ICONS[board.icon];
  const starred = useBoards((s) => s.starred.includes(board.id));
  const toggleStar = useBoards((s) => s.toggleStar);

  // Resolve the owner label for display:
  //  1. Prefer the name stamped on the board doc at create time.
  //  2. For legacy docs without that field, if this user IS the owner,
  //     show their own session name — avoids hardcoding anyone else.
  //  3. Otherwise fall back to "Collaborator" so we never falsely
  //     attribute a board to a specific person.
  const { data: session } = useSession();
  const sessionUid = session?.user?.id;
  const isSelfOwner = board.userId ? board.userId === sessionUid : sessionUid != null;
  const ownerLabel =
    board.ownerName
      ?? (isSelfOwner ? (session?.user?.name ?? session?.user?.email ?? "You") : "Collaborator");

  const starBtn = (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); toggleStar(board.id); }}
      className="flex h-7 w-7 items-center justify-center rounded-[var(--r-md)] text-muted opacity-0 transition-opacity hover:bg-panel-soft hover:text-ink group-hover:opacity-100 data-[on=true]:opacity-100"
      data-on={starred}
      aria-label={starred ? "Unstar" : "Star"}
    >
      <Star size={13} strokeWidth={1.8} fill={starred ? "var(--accent)" : "none"} color={starred ? "var(--accent)" : "currentColor"} />
    </button>
  );

  if (view === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
        className="group grid items-center gap-4 border-b border-[var(--line)] px-3 py-2.5 hover:bg-panel-soft"
        style={{ gridTemplateColumns: "minmax(0,2fr) 1fr 1fr 1fr auto" }}
      >
        {/* Name */}
        <Link href={`/board/${board.id}`} className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center" style={{ color: ICON_TINT[board.icon] }}>
            <Icon size={18} strokeWidth={1.6} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-ink">{board.name}</div>
            <div className="truncate text-[11px] text-muted">
              Modified by {ownerLabel}, {formatDay(board.updatedAt)}
            </div>
          </div>
        </Link>

        {/* Online users — placeholder */}
        <div />

        {/* Last opened */}
        <span className="text-[12.5px] text-ink-soft">{formatDay(board.updatedAt)}</span>

        {/* Owner */}
        <span className="text-[12.5px] text-ink-soft">{ownerLabel}</span>

        {/* Actions */}
        <div className="flex items-center gap-0.5">
          {starBtn}
          <CardMenu boardId={board.id} boardName={board.name} />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -2 }}
      className="group relative flex flex-col overflow-hidden rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]"
    >
      <Link href={`/board/${board.id}`} className="relative block h-[140px] border-b border-[var(--line)] bg-bg">
        <ThumbnailPreview boardId={board.id} />
        <span
          className="absolute bottom-2 left-2 flex h-6 w-6 items-center justify-center"
          style={{ color: ICON_TINT[board.icon] }}
        >
          <Icon size={16} strokeWidth={1.8} />
        </span>
      </Link>

      <div className="flex items-center gap-2 px-3 py-2.5">
        <Link href={`/board/${board.id}`} className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold text-ink">{board.name}</div>
          <div className="truncate text-[11px] text-muted">
            {formatDay(board.updatedAt)} by {ownerLabel}
          </div>
        </Link>
        <div className="flex items-center gap-0.5">
          {starBtn}
          <CardMenu boardId={board.id} boardName={board.name} />
        </div>
      </div>
    </motion.div>
  );
}
