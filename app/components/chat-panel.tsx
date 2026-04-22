"use client";

import { AnimatePresence, motion } from "motion/react";
import { MessageSquare, Send, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { broadcastOp, isCollabConnected } from "../lib/collab-bridge";
import { useChat, type ChatMessage } from "../lib/chat-store";
import { getPeerColor } from "../lib/presence-store";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatTime(at: number): string {
  const d = new Date(at);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Day divider threshold — show date label if message is >24h ago or crosses midnight. */
function shouldShowDateDivider(prev: ChatMessage | undefined, curr: ChatMessage): boolean {
  if (!prev) return false;
  const a = new Date(prev.at);
  const b = new Date(curr.at);
  return a.toDateString() !== b.toDateString();
}

function formatDateLabel(at: number): string {
  const d = new Date(at);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ChatPanel() {
  const open = useChat((s) => s.open);
  const messages = useChat((s) => s.messages);
  const setOpen = useChat((s) => s.setOpen);
  const addMessage = useChat((s) => s.addMessage);

  const { data: session } = useSession();
  const selfId = session?.user?.id ?? "self";
  const selfName = session?.user?.name ?? session?.user?.email ?? "You";
  const selfColor = getPeerColor(selfId);

  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const msg: ChatMessage = {
      id: `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      userId: selfId,
      userName: selfName,
      color: selfColor,
      text,
      at: Date.now(),
    };
    addMessage(msg);
    if (isCollabConnected()) {
      broadcastOp({ type: "chat:message", message: msg });
    }
    setDraft("");
  };

  const connected = isCollabConnected();

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="chat-panel"
          initial={{ opacity: 0, x: 12, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 12, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          className="pointer-events-auto absolute right-[14px] top-[68px] bottom-[14px] z-40 flex w-[320px] flex-col overflow-hidden rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel shadow-[var(--shadow-md)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-[var(--r-md)] bg-panel-soft text-ink-soft">
                <MessageSquare size={13} strokeWidth={1.8} />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[13px] font-semibold text-ink">Chat</span>
                {messages.length > 0 && (
                  <span className="font-mono text-[10.5px] text-muted">
                    {messages.length}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-[var(--r-md)] text-ink-soft transition-colors hover:bg-panel-soft hover:text-ink"
              aria-label="Close chat"
            >
              <X size={14} strokeWidth={1.8} />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-3"
            style={{ scrollbarWidth: "thin" }}
          >
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-panel-soft text-ink-soft">
                  <MessageSquare size={15} strokeWidth={1.6} />
                </div>
                <div className="text-[12.5px] font-medium text-ink-soft">
                  No messages yet
                </div>
                <div className="text-[11.5px] text-muted">
                  {connected ? "Say hi to your collaborators." : "Invite someone to start a conversation."}
                </div>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {messages.map((m, i) => {
                  const mine = m.userId === selfId;
                  const prev = messages[i - 1];
                  const showDate = shouldShowDateDivider(prev, m);
                  // Group consecutive messages from the same user within 2 min.
                  const sameAuthorAsPrev =
                    prev &&
                    prev.userId === m.userId &&
                    m.at - prev.at < 2 * 60 * 1000 &&
                    !showDate;
                  return (
                    <li key={m.id} className="flex flex-col gap-1">
                      {showDate && (
                        <div className="my-1 flex items-center gap-2">
                          <span className="h-px flex-1 bg-[var(--line)]" />
                          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                            {formatDateLabel(m.at)}
                          </span>
                          <span className="h-px flex-1 bg-[var(--line)]" />
                        </div>
                      )}
                      <div
                        className={`flex items-start gap-2 ${mine ? "flex-row-reverse" : ""}`}
                      >
                        {/* Avatar — reserve space for grouping even when hidden */}
                        <div className="w-7 flex-none">
                          {!sameAuthorAsPrev && (
                            <div
                              className="mt-[2px] flex h-7 w-7 items-center justify-center rounded-full border-2 border-panel text-[10.5px] font-semibold text-white shadow-[var(--shadow-sm)]"
                              style={{ background: m.color }}
                              title={m.userName}
                            >
                              {initials(m.userName)}
                            </div>
                          )}
                        </div>

                        <div
                          className={`flex max-w-[220px] flex-col ${mine ? "items-end" : "items-start"}`}
                        >
                          {!sameAuthorAsPrev && (
                            <div className="mb-0.5 flex items-baseline gap-1.5">
                              <span className="text-[11.5px] font-semibold text-ink-soft">
                                {mine ? "You" : m.userName}
                              </span>
                              <span className="font-mono text-[10px] text-muted">
                                {formatTime(m.at)}
                              </span>
                            </div>
                          )}
                          <div
                            className={`whitespace-pre-wrap break-words rounded-[var(--r-lg)] px-2.5 py-1.5 text-[13px] leading-snug ${
                              mine
                                ? "bg-ink text-white"
                                : "border border-[var(--line)] bg-panel-soft text-ink"
                            }`}
                          >
                            {m.text}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-[var(--line)] p-2">
            <div
              className={`flex items-center gap-1 rounded-[var(--r-xl)] border px-2.5 py-1.5 transition-colors ${
                connected
                  ? "border-[var(--line)] bg-[var(--panel-soft)] focus-within:border-ink/20 focus-within:bg-panel"
                  : "border-[var(--line)] bg-panel-soft/60"
              }`}
            >
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={connected ? "Message collaborators…" : "Share this board to chat"}
                disabled={!connected}
                className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-muted focus:outline-none disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={send}
                disabled={!draft.trim() || !connected}
                className={`flex h-7 w-7 flex-none items-center justify-center rounded-[var(--r-md)] transition-colors ${
                  draft.trim() && connected
                    ? "bg-ink text-white hover:bg-[#0e0e0e]"
                    : "text-muted/60"
                }`}
                aria-label="Send message"
              >
                <Send size={13} strokeWidth={1.8} />
              </button>
            </div>
            {connected ? (
              <div className="mt-1 px-1 font-mono text-[10px] text-muted">
                Enter to send · Esc to close
              </div>
            ) : null}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
