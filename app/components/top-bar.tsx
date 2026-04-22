"use client";

import { Bell, Check, Cloud, MessageSquare, Play } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useBoard } from "../lib/board-store";
import { useBoards } from "../lib/boards-store";
import { useChat } from "../lib/chat-store";
import { getPeerColor, usePresence } from "../lib/presence-store";
import { useUI, type SaveStatus } from "../lib/ui-store";
import { InviteModal } from "./invite-modal";
import { MainMenu } from "./main-menu";
import { Wordmark } from "./wordmark";

const enterEase = [0.4, 0, 0.2, 1] as const;
const clusterEnter = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: enterEase },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function Avatar({
  name,
  color,
  delay,
}: {
  name: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      key={name}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7 }}
      transition={{ type: "spring", stiffness: 420, damping: 28, delay }}
      whileHover={{ y: -2, scale: 1.05 }}
      className="relative -mr-2 flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-panel shadow-[var(--shadow-sm)] text-[11px] font-semibold text-white cursor-pointer"
      style={{ background: color }}
      title={name}
    >
      {initials(name)}
    </motion.div>
  );
}

function BoardTitle({ boardId }: { boardId: string }) {
  const board = useBoards((s) => s.boards.find((b) => b.id === boardId));
  const renameBoard = useBoards((s) => s.renameBoard);
  const renameTitleToken = useUI((s) => s.renameTitleToken);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(board?.name ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(board?.name ?? "");
  }, [board?.name, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  // When the main menu requests a rename, flip into edit mode.
  const prevToken = useRef(renameTitleToken);
  useEffect(() => {
    if (renameTitleToken !== prevToken.current) {
      prevToken.current = renameTitleToken;
      setEditing(true);
    }
  }, [renameTitleToken]);

  function commit() {
    const next = draft.trim();
    if (next && board && next !== board.name) renameBoard(board.id, next);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(board?.name ?? "");
            setEditing(false);
          }
        }}
        className="min-w-[180px] rounded-[var(--r-md)] bg-panel-soft px-2 py-1 text-[13.5px] font-medium text-ink outline-none focus:ring-2 focus:ring-[var(--accent)]"
        spellCheck={false}
      />
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      onClick={() => setEditing(true)}
      className="group flex items-center rounded-[var(--r-md)] px-2 py-1 text-[13.5px] font-medium text-ink hover:bg-panel-soft"
      title="Click to rename"
    >
      <span>{board?.name ?? "Untitled board"}</span>
    </motion.button>
  );
}

function SaveChip() {
  const status = useUI((s) => s.saveStatus);

  const label: Record<SaveStatus, string> = {
    idle: "",
    saving: "Saving…",
    saved: "Saved",
    error: "Save failed",
  };

  return (
    <AnimatePresence mode="wait">
      {status !== "idle" && (
        <motion.div
          key={status}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
          className="pointer-events-none flex items-center gap-1.5 rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel px-3 py-1.5 shadow-[var(--shadow-md)]"
        >
          {status === "saving" ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              className="flex"
            >
              <Cloud size={13} strokeWidth={1.8} className="text-muted" />
            </motion.span>
          ) : status === "error" ? (
            <span className="text-red-500">✕</span>
          ) : (
            <Check size={13} strokeWidth={2.2} className="text-[var(--accent)]" />
          )}
          <span className={`font-mono text-[11px] font-medium ${status === "error" ? "text-red-500" : "text-muted"}`}>
            {label[status]}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ChatButton() {
  const open = useChat((s) => s.open);
  const unread = useChat((s) => s.unread);
  const toggleOpen = useChat((s) => s.toggleOpen);

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={toggleOpen}
      aria-pressed={open}
      className={`relative flex h-8 w-8 items-center justify-center rounded-[var(--r-md)] transition-colors ${
        open ? "bg-ink text-white" : "text-ink-soft hover:bg-panel-soft"
      }`}
      title="Chat"
    >
      <MessageSquare size={16} strokeWidth={1.8} />
      {unread > 0 && !open && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-0.5 -right-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-accent px-1 font-mono text-[9px] font-semibold text-white"
        >
          {unread > 9 ? "9+" : unread}
        </motion.span>
      )}
    </motion.button>
  );
}

export function TopBar({ boardId }: { boardId: string }) {
  const startPresenting = useUI((s) => s.startPresenting);
  const setExportOpen = useUI((s) => s.setExport);
  const items = useBoard((s) => s.items);
  const hasFrames = items.some((it) => it.type === "frame");
  const peersRecord = usePresence((s) => s.peers);
  const peers = Object.values(peersRecord);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Current user — shown first in the avatar stack (Miro-style).
  const { data: session } = useSession();
  const selfName = session?.user?.name ?? session?.user?.email ?? "You";
  const selfId = session?.user?.id ?? "self";
  const selfColor = getPeerColor(selfId);

  const onPresent = () => {
    if (!hasFrames) {
      setExportOpen(false);
      // Open frames panel as a gentle nudge since presentation needs frames.
      useUI.getState().setFramesPanel(true);
      return;
    }
    startPresenting(0);
  };

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between px-[14px] pt-[14px]">
      {/* Center cluster — save status */}
      <motion.div
        {...clusterEnter}
        className="pointer-events-none absolute left-1/2 top-[14px] -translate-x-1/2"
      >
        <SaveChip />
      </motion.div>

      {/* Left cluster */}
      <motion.div
        {...clusterEnter}
        className="pointer-events-auto flex items-center gap-2 rounded-[var(--r-2xl)] bg-panel pl-3 pr-1.5 py-1.5 shadow-[var(--shadow-md)] border border-[var(--line)]"
      >
        <Link href="/" aria-label="Back to home">
          <Wordmark size={22} />
        </Link>
        <span className="mx-2 h-5 w-px bg-[var(--line)]" />
        <BoardTitle boardId={boardId} />
        <span className="mx-1 h-5 w-px bg-[var(--line)]" />
        <MainMenu boardId={boardId} />
      </motion.div>

      {/* Right cluster */}
      <div className="pointer-events-auto flex items-center gap-2">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: enterEase, delay: 0.04 }}
          className="flex items-center rounded-[var(--r-2xl)] bg-panel pl-3 pr-3 py-1.5 shadow-[var(--shadow-md)] border border-[var(--line)]"
        >
          <AnimatePresence>
            <div className="flex items-center pr-2">
              {/* Current user first so the stack reads left-to-right as "you + others". */}
              <Avatar name={selfName} color={selfColor} delay={0.1} />
              {peers.map((p, i) => (
                <Avatar key={p.userId} name={p.userName} color={p.color} delay={0.1 + (i + 1) * 0.06} />
              ))}
            </div>
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: enterEase, delay: 0.1 }}
          className="flex items-center gap-1 rounded-[var(--r-2xl)] bg-panel p-1 shadow-[var(--shadow-md)] border border-[var(--line)]"
        >
          <ChatButton />
          <motion.button
            whileTap={{ scale: 0.92 }}
            className="relative flex h-8 w-8 items-center justify-center rounded-[var(--r-md)] text-ink-soft hover:bg-panel-soft"
            title="Notifications"
          >
            <Bell size={16} strokeWidth={1.8} />
            <motion.span
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1.5 right-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent"
            />
          </motion.button>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: enterEase, delay: 0.14 }}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={onPresent}
          title={hasFrames ? "Present from first frame" : "Add a frame to present"}
          className="flex items-center gap-1.5 rounded-[var(--r-2xl)] bg-panel px-3 py-2 text-[13px] font-medium text-ink shadow-[var(--shadow-md)] border border-[var(--line)] hover:bg-panel-soft"
        >
          <Play size={14} strokeWidth={1.8} />
          Present
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: enterEase, delay: 0.18 }}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setInviteOpen(true)}
          title="Invite collaborators"
          className="rounded-[var(--r-2xl)] bg-ink px-4 py-2 text-[13px] font-semibold text-[var(--panel-soft)] shadow-[var(--shadow-md)] hover:bg-[#0e0e0e]"
        >
          Share
        </motion.button>
      </div>

      <InviteModal boardId={boardId} open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </header>
  );
}
