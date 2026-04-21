"use client";

import { Check, Copy, Download, Link, Loader, Trash2, Users, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useBoards } from "../lib/boards-store";

type Props = { boardId: string; open: boolean; onClose: () => void };

type Member = { userId: string; name: string; email: string; joinedAt: number };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const COLORS = ["#D94A38","#2E6FDB","#2E8B57","#C97A1F","#7B5EA7","#4ECDC4"];
function memberColor(userId: string): string {
  let n = 0;
  for (let i = 0; i < userId.length; i++) n += userId.charCodeAt(i);
  return COLORS[n % COLORS.length];
}

type InviteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; token: string; link: string; members: Member[] }
  | { status: "error"; message: string };

export function InviteModal({ boardId, open, onClose }: Props) {
  const board = useBoards((s) => s.boards.find((b) => b.id === boardId));
  const [state, setState] = useState<InviteState>({ status: "idle" });
  const [copied, setCopied] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!open || loadedRef.current) return;
    loadedRef.current = true;
    loadInvite();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadInvite() {
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/boards/${boardId}/invite`);
      if (!res.ok) { setState({ status: "idle" }); return; }
      const { inviteToken, members } = await res.json() as { inviteToken: string | null; members: Member[] };
      if (inviteToken) {
        setState({ status: "ready", token: inviteToken, link: buildLink(inviteToken), members: members ?? [] });
      } else {
        setState({ status: "idle" });
      }
    } catch {
      setState({ status: "idle" });
    }
  }

  async function generateLink() {
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/boards/${boardId}/invite`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate link");
      const { token } = await res.json() as { token: string };
      setState({ status: "ready", token, link: buildLink(token), members: state.status === "ready" ? state.members : [] });
    } catch (err) {
      setState({ status: "error", message: (err as Error).message });
    }
  }

  async function revokeLink() {
    await fetch(`/api/boards/${boardId}/invite`, { method: "DELETE" });
    loadedRef.current = false;
    setState({ status: "idle" });
  }

  async function copyLink() {
    if (state.status !== "ready") return;
    await navigator.clipboard.writeText(state.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function buildLink(token: string) {
    return `${window.location.origin}/invite/${token}`;
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-auto fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="pointer-events-auto fixed left-1/2 top-[80px] z-50 w-full max-w-md -translate-x-1/2 rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel p-5 shadow-[var(--shadow-lg)]"
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} strokeWidth={1.8} className="text-muted" />
                <h2 className="text-[14px] font-semibold text-ink">
                  Invite to <span className="text-accent">{board?.name ?? "this board"}</span>
                </h2>
              </div>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-[var(--r-md)] text-muted hover:bg-panel-soft"
              >
                <X size={15} />
              </button>
            </div>

            {/* Invite link section */}
            <div className="rounded-[var(--r-xl)] border border-[var(--line)] bg-panel-soft p-4">
              <p className="mb-3 text-[12.5px] font-medium text-ink">Invite link</p>

              {state.status === "loading" && (
                <div className="flex items-center gap-2 text-[13px] text-muted">
                  <Loader size={14} className="animate-spin" />
                  Loading…
                </div>
              )}

              {state.status === "idle" && (
                <div>
                  <p className="mb-3 text-[12.5px] text-muted">
                    Anyone at Aedas with the link can open this board.
                  </p>
                  <button
                    onClick={generateLink}
                    className="flex items-center gap-2 rounded-[var(--r-lg)] border border-[var(--line)] bg-panel px-3 py-2 text-[13px] font-medium text-ink shadow-[var(--shadow-sm)] hover:bg-panel-soft"
                  >
                    <Link size={13} strokeWidth={1.8} />
                    Generate invite link
                  </button>
                </div>
              )}

              {state.status === "ready" && (
                <div className="space-y-2">
                  {/* Link display */}
                  <div className="flex items-center gap-2 rounded-[var(--r-lg)] border border-[var(--line)] bg-panel px-3 py-2">
                    <span className="flex-1 truncate font-mono text-[11.5px] text-muted">
                      {state.link}
                    </span>
                    <button
                      onClick={copyLink}
                      className="flex shrink-0 items-center gap-1.5 rounded-[var(--r-md)] bg-ink px-2.5 py-1 text-[12px] font-medium text-white hover:bg-[#0e0e0e]"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11.5px] text-muted">Valid for 7 days · Aedas accounts only</p>
                    <button
                      onClick={revokeLink}
                      className="flex items-center gap-1 text-[11.5px] text-muted hover:text-red-500"
                    >
                      <Trash2 size={11} />
                      Revoke
                    </button>
                  </div>
                </div>
              )}

              {state.status === "error" && (
                <p className="text-[12.5px] text-red-500">{state.message}</p>
              )}
            </div>

            {/* Members list */}
            {state.status === "ready" && state.members.length > 0 && (
              <div className="mt-3 rounded-[var(--r-xl)] border border-[var(--line)] bg-panel-soft px-4 py-3">
                <p className="mb-2 text-[12.5px] font-medium text-ink">
                  Collaborators ({state.members.length})
                </p>
                <ul className="space-y-2">
                  {state.members.map((m) => (
                    <li key={m.userId} className="flex items-center gap-2">
                      <div
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                        style={{ background: memberColor(m.userId) }}
                      >
                        {initials(m.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-medium text-ink">{m.name}</p>
                        <p className="truncate text-[11px] text-muted">{m.email}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Export .ads */}
            <div className="mt-3 flex items-center justify-between rounded-[var(--r-xl)] border border-[var(--line)] bg-panel-soft px-4 py-3">
              <div>
                <p className="text-[12.5px] font-medium text-ink">Export as .ads file</p>
                <p className="text-[11.5px] text-muted">Download and share the board file</p>
              </div>
              <a
                href={`/api/boards/${boardId}/export`}
                download
                className="flex items-center gap-1.5 rounded-[var(--r-lg)] border border-[var(--line)] bg-panel px-3 py-1.5 text-[12.5px] font-medium text-ink shadow-[var(--shadow-sm)] hover:bg-panel-soft"
              >
                <Download size={13} strokeWidth={1.8} />
                Download
              </a>
            </div>

            <p className="mt-3 text-[11.5px] text-muted">
              Collaborators need a Microsoft Aedas account to open the board.
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
