"use client";

import { AnimatePresence, motion } from "motion/react";
import { RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { useBoard } from "../lib/board-store";
import { useActivity } from "../lib/activity-store";
import { useSnapshots } from "../lib/snapshot-store";
import { useUI } from "../lib/ui-store";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDay(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "TODAY";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "YESTERDAY";
  return d.toLocaleDateString([], { month: "short", day: "numeric" }).toUpperCase();
}

function formatRelative(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

function ActivityTab() {
  const entries = useActivity((s) => s.entries);

  const groups: { label: string; items: typeof entries }[] = [];
  for (const entry of entries) {
    const label = formatDay(entry.timestamp);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(entry);
    else groups.push({ label, items: [entry] });
  }

  const lastVisitIdx = (() => {
    for (let i = 1; i < entries.length; i++) {
      if (entries[i - 1].timestamp - entries[i].timestamp > 30_000) return i;
    }
    return entries.length;
  })();

  if (entries.length === 0) {
    return <p className="px-4 py-6 text-center text-[12px] text-muted">No activity yet.</p>;
  }

  return (
    <>
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1 pt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
            {group.label}
          </p>
          {group.items.map((entry, i) => {
            const isFirst = i === 0 && group === groups[0];
            return (
              <div key={entry.id}>
                {isFirst && (
                  <div className="mb-1 flex items-center gap-2 px-2 py-1">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ background: entry.color }}
                    >
                      {entry.initials}
                    </span>
                    <span className="text-[12.5px] font-medium text-ink">{entry.user}</span>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-[var(--r-md)] px-2 py-1.5 hover:bg-panel-soft">
                  <div className="flex items-center gap-2">
                    <span className="ml-8 w-1.5 shrink-0 self-stretch border-l-2 border-[var(--line)]" />
                    <span className="text-[12px] text-ink-soft">{entry.action}</span>
                  </div>
                  <span className="shrink-0 pl-2 font-mono text-[10px] text-muted">
                    {formatTime(entry.timestamp)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      {lastVisitIdx < entries.length && (
        <p className="mt-2 flex items-center gap-2 px-3 text-[11px] text-muted">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1" />
            <path d="M6 3v3l2 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          </svg>
          No changes since last visit
        </p>
      )}
    </>
  );
}

function VersionsTab() {
  const snapshots = useSnapshots((s) => s.snapshots);
  const takeSnapshot = useSnapshots((s) => s.takeSnapshot);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleRestore = (snapshotId: string) => {
    const snap = useSnapshots.getState().snapshots.find((s) => s.id === snapshotId);
    if (!snap) return;
    setRestoringId(snapshotId);
    // Take a snapshot of the current state before restoring (safety net)
    const current = useBoard.getState().items;
    if (current.length > 0) {
      takeSnapshot(current, "Before restore");
    }
    useBoard.getState().snapshot(); // push to undo stack
    useBoard.setState({ items: snap.items, selectedIds: [], editingId: null });
    setTimeout(() => setRestoringId(null), 600);
  };

  const handleSaveNow = () => {
    const items = useBoard.getState().items;
    takeSnapshot(items, "Manual save");
  };

  if (snapshots.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
        <p className="text-[12px] text-muted">No versions saved yet.</p>
        <p className="text-[11px] text-muted">Versions auto-save every 5 minutes.</p>
        <button
          type="button"
          onClick={handleSaveNow}
          className="mt-1 rounded-[var(--r-md)] bg-panel-soft px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-[var(--line)]"
        >
          Save version now
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-end px-3 pb-1 pt-2">
        <button
          type="button"
          onClick={handleSaveNow}
          className="rounded-[var(--r-md)] px-2 py-1 text-[11.5px] font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]"
        >
          + Save version
        </button>
      </div>
      {snapshots.map((snap, i) => (
        <div
          key={snap.id}
          className="group flex items-center justify-between rounded-[var(--r-md)] px-3 py-2 hover:bg-panel-soft"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium text-ink">
              {snap.label ?? (i === 0 ? "Latest" : `Version ${snapshots.length - i}`)}
            </p>
            <p className="font-mono text-[10px] text-muted">
              {formatRelative(snap.timestamp)} · {snap.itemCount} item{snap.itemCount !== 1 ? "s" : ""}
            </p>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => handleRestore(snap.id)}
            disabled={restoringId === snap.id}
            title="Restore this version"
            className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--r-md)] text-ink-soft opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] disabled:opacity-50"
          >
            {restoringId === snap.id ? (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 0.6, ease: "linear" }}
                className="flex"
              >
                <RotateCcw size={13} strokeWidth={1.8} />
              </motion.span>
            ) : (
              <RotateCcw size={13} strokeWidth={1.8} />
            )}
          </motion.button>
        </div>
      ))}
    </div>
  );
}

export function HistoryPanel() {
  const open = useUI((s) => s.historyPanelOpen);
  const setOpen = useUI((s) => s.setHistoryPanel);
  const [tab, setTab] = useState<"activity" | "versions">("activity");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="history-panel"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="pointer-events-auto absolute left-[72px] top-[70px] z-40 flex w-[300px] flex-col overflow-hidden rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel shadow-[var(--shadow-md)]"
          style={{ maxHeight: "calc(100vh - 100px)" }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
            <span className="text-[13.5px] font-semibold text-ink">History</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-[var(--r-md)] text-ink-soft hover:bg-panel-soft"
            >
              <X size={14} strokeWidth={1.8} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[var(--line)] px-3 pt-2 pb-0">
            {(["activity", "versions"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`mr-1 rounded-t-[var(--r-md)] px-3 py-1.5 text-[12.5px] font-medium capitalize transition-colors ${
                  tab === t
                    ? "border-b-2 border-[var(--accent)] text-ink"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-2 py-3">
            {tab === "activity" ? <ActivityTab /> : <VersionsTab />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
