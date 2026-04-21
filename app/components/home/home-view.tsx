"use client";

import { LayoutGrid, LayoutList, LogOut, Plus, Search, Sparkles, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { type BoardMeta, useBoards } from "../../lib/boards-store";
import { Wordmark } from "../wordmark";
import { BoardCard } from "./board-card";

type Filter = "all" | "starred";

export function HomeView() {
  const router = useRouter();
  const { data: session } = useSession();
  const hydrated = useBoards((s) => s.hydrated);
  const boards = useBoards((s) => s.boards);
  const starred = useBoards((s) => s.starred);
  const createBoard = useBoards((s) => s.createBoard);

  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const shown = useMemo<BoardMeta[]>(() => {
    let list = boards;
    if (filter === "starred") list = list.filter((b) => starred.includes(b.id));
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((b) => b.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [boards, starred, filter, query]);

  async function onCreate() {
    const board = await createBoard();
    router.push(`/board/${board.id}`);
  }

  // Close user menu on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <main className="relative min-h-screen bg-bg">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-[var(--line)] bg-bg/90 px-8 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Wordmark size={26} />
          <span className="hidden rounded-full bg-panel-soft px-2 py-[2px] text-[10px] font-medium uppercase tracking-[0.08em] text-muted sm:inline">
            Studio
          </span>
        </div>

        <div className="flex max-w-md flex-1 items-center gap-2 rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel px-3 py-2 shadow-[var(--shadow-sm)]">
          <Search size={15} strokeWidth={1.8} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search boards"
            className="flex-1 bg-transparent text-[13.5px] text-ink placeholder:text-muted focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={onCreate}
            className="flex items-center gap-1.5 rounded-[var(--r-2xl)] bg-ink px-3.5 py-2 text-[13px] font-semibold text-[var(--panel-soft)] shadow-[var(--shadow-md)] hover:bg-[#0e0e0e]"
          >
            <Plus size={15} strokeWidth={2.2} />
            New board
          </motion.button>

          {/* User avatar + dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--line)] bg-panel text-[12px] font-semibold text-ink shadow-[var(--shadow-sm)] hover:border-[var(--accent)] transition-colors"
              title={session?.user?.name ?? session?.user?.email ?? "Account"}
            >
              {userInitials(session?.user?.name ?? session?.user?.email ?? "?")}
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-11 z-30 w-56 rounded-[var(--r-xl)] border border-[var(--line)] bg-panel p-1 shadow-[var(--shadow-lg)]"
                >
                  <div className="px-3 py-2 border-b border-[var(--line)] mb-1">
                    <p className="text-[13px] font-medium text-ink truncate">
                      {session?.user?.name ?? "Signed in"}
                    </p>
                    <p className="text-[11.5px] text-muted truncate">
                      {session?.user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex w-full items-center gap-2 rounded-[var(--r-md)] px-3 py-2 text-[13px] text-ink-soft hover:bg-panel-soft hover:text-red-500 transition-colors"
                  >
                    <LogOut size={14} strokeWidth={1.8} />
                    Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-8 py-10">
        {/* Hero */}
        <section className="mb-10">
          <h1 className="font-serif text-[44px] leading-[1.1] italic text-ink">
            A quiet place to think,
            <br />
            <span className="text-muted">in pencil.</span>
          </h1>
          <p className="mt-3 max-w-xl text-[14px] text-ink-soft">
            Your boards live on this device. Sketch, pin, move — nothing
            syncs, nothing rushes.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={onCreate}
              className="group flex items-center gap-2 rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel px-4 py-2.5 text-[13.5px] font-medium text-ink shadow-[var(--shadow-sm)] hover:bg-panel-soft"
            >
              <Sparkles size={14} strokeWidth={1.8} className="text-[var(--accent)]" />
              Start a blank board
            </motion.button>
            <span className="text-[12px] text-muted">
              {boards.length} board{boards.length === 1 ? "" : "s"} saved locally
            </span>
          </div>
        </section>

        {/* Filters + view toggle */}
        <section className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-[var(--r-xl)] border border-[var(--line)] bg-panel p-1">
            <FilterTab
              label="All boards"
              active={filter === "all"}
              onClick={() => setFilter("all")}
            />
            <FilterTab
              label="Starred"
              active={filter === "starred"}
              onClick={() => setFilter("starred")}
              icon={<Star size={12} strokeWidth={2} />}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-muted">
              {shown.length} {shown.length === 1 ? "board" : "boards"}
            </span>
            <div className="flex items-center gap-0.5 rounded-[var(--r-lg)] border border-[var(--line)] bg-panel p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Grid view"
                className={`flex h-7 w-7 items-center justify-center rounded-[var(--r-md)] transition-colors ${
                  viewMode === "grid" ? "bg-ink text-white" : "text-ink-soft hover:bg-panel-soft"
                }`}
              >
                <LayoutGrid size={14} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                title="List view"
                className={`flex h-7 w-7 items-center justify-center rounded-[var(--r-md)] transition-colors ${
                  viewMode === "list" ? "bg-ink text-white" : "text-ink-soft hover:bg-panel-soft"
                }`}
              >
                <LayoutList size={14} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </section>

        {/* Boards */}
        {!hydrated ? (
          <div className="py-20 text-center text-[13px] text-muted">Loading…</div>
        ) : shown.length === 0 ? (
          <EmptyState onCreate={onCreate} filtered={filter !== "all" || !!query} />
        ) : viewMode === "list" && shown.length > 0 ? (
          <div className="overflow-hidden rounded-[var(--r-xl)] border border-[var(--line)] bg-panel">
            {/* Header row */}
            <div
              className="grid gap-4 border-b border-[var(--line)] bg-panel-soft px-3 py-2"
              style={{ gridTemplateColumns: "minmax(0,2fr) 1fr 1fr 1fr auto" }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Name</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Online users</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Last opened</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">Owner</span>
              <span className="w-16" />
            </div>
            {shown.map((b) => (
              <BoardCard key={b.id} board={b} view="list" />
            ))}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((b) => (
              <BoardCard key={b.id} board={b} view="grid" />
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function FilterTab({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-[var(--r-md)] px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
        active ? "bg-ink text-white" : "text-ink-soft hover:bg-panel-soft"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState({
  onCreate,
  filtered,
}: {
  onCreate: () => void;
  filtered: boolean;
}) {
  return (
    <div className="rounded-[var(--r-2xl)] border border-dashed border-[var(--line)] bg-panel/60 py-20 text-center">
      <p className="font-serif text-[26px] italic text-muted">
        {filtered ? "Nothing matches." : "A blank page."}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-[13px] text-ink-soft">
        {filtered
          ? "Try a different filter or search term."
          : "No boards yet. Start one — it saves as you go."}
      </p>
      {!filtered && (
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={onCreate}
          className="mt-6 inline-flex items-center gap-1.5 rounded-[var(--r-2xl)] bg-ink px-3.5 py-2 text-[13px] font-semibold text-[var(--panel-soft)] shadow-[var(--shadow-md)] hover:bg-[#0e0e0e]"
        >
          <Plus size={15} strokeWidth={2.2} />
          Create board
        </motion.button>
      )}
    </div>
  );
}

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
