"use client";

import { LayoutGrid, LayoutList, Pencil, Plus, Trash2, Users } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { type BoardMeta, useBoards } from "../../lib/boards-store";
import { useSpaces } from "../../lib/spaces-store";
import { useTeams } from "../../lib/teams-store";
import { BoardCard } from "./board-card";
import { CreateTeamModal } from "./create-team-modal";
import { HomeSidebar, HomeUserMenu, type HomeView as ViewState } from "./home-sidebar";
import { Wordmark } from "../wordmark";

const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function HomeView() {
  const router = useRouter();
  const hydrated = useBoards((s) => s.hydrated);
  const boards = useBoards((s) => s.boards);
  const starred = useBoards((s) => s.starred);
  const createBoard = useBoards((s) => s.createBoard);
  const spaces = useSpaces((s) => s.spaces);
  const boardSpace = useSpaces((s) => s.boardSpace);
  const teams = useTeams((s) => s.teams);
  const deleteTeam = useTeams((s) => s.deleteTeam);

  const [view, setView] = useState<ViewState>({ type: "home" });
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  const openCreateTeam = () => { setEditingTeamId(null); setTeamModalOpen(true); };
  const openEditTeam = (id: string) => { setEditingTeamId(id); setTeamModalOpen(true); };

  // Counts for sidebar badges.
  const { allCount, recentCount, starredCount, spaceBoardCount } = useMemo(() => {
    const now = Date.now();
    const spaceBoardCount: Record<string, number> = {};
    let recent = 0;
    for (const b of boards) {
      const sp = boardSpace[b.id];
      if (sp) spaceBoardCount[sp] = (spaceBoardCount[sp] ?? 0) + 1;
      if (now - b.updatedAt <= RECENT_WINDOW_MS) recent++;
    }
    return {
      allCount: boards.length,
      recentCount: recent,
      starredCount: boards.filter((b) => starred.includes(b.id)).length,
      spaceBoardCount,
    };
  }, [boards, starred, boardSpace]);

  const shown = useMemo<BoardMeta[]>(() => {
    let list = boards;
    if (view.type === "starred") {
      list = list.filter((b) => starred.includes(b.id));
    } else if (view.type === "recent") {
      const cutoff = Date.now() - RECENT_WINDOW_MS;
      list = list.filter((b) => b.updatedAt >= cutoff);
    } else if (view.type === "space") {
      const sid = view.id;
      list = list.filter((b) => boardSpace[b.id] === sid);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((b) => b.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [boards, starred, view, query, boardSpace]);

  async function onCreate() {
    const board = await createBoard();
    // If viewing a space, auto-assign the new board to it.
    if (view.type === "space") {
      useSpaces.getState().setBoardSpace(board.id, view.id);
    }
    router.push(`/board/${board.id}`);
  }

  const currentSpace =
    view.type === "space" ? spaces.find((s) => s.id === view.id) : null;
  const currentTeam =
    view.type === "team" ? teams.find((t) => t.id === view.id) : null;

  const pageTitle =
    view.type === "home"
      ? "All boards"
      : view.type === "recent"
        ? "Recent"
        : view.type === "starred"
          ? "Starred"
          : view.type === "team"
            ? (currentTeam?.name ?? "Team")
            : (currentSpace?.name ?? "Space");

  return (
    // `zoom` scales every pixel value (padding, font-size, icon-size, widths)
    // by the same factor — a single-knob adjustment for the whole homepage.
    <main className="flex h-screen bg-bg">
      <HomeSidebar
        view={view}
        onViewChange={setView}
        query={query}
        onQueryChange={setQuery}
        allCount={allCount}
        recentCount={recentCount}
        starredCount={starredCount}
        spaceBoardCount={spaceBoardCount}
        onCreateTeam={openCreateTeam}
        onEditTeam={openEditTeam}
      />

      {/* Main content */}
      <section className="flex-1 overflow-y-auto">
        {/* Top bar — logo on the left (moved out of the sidebar, Miro-style),
            user menu on the right. No upgrade / commercial buttons. */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-2 bg-bg/90 px-10 py-4 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <Wordmark size={22} />
            {/* <span className="rounded-full bg-panel-soft px-2 py-[2px] font-mono text-[9.5px] uppercase tracking-[0.08em] text-muted">
              Studio
            </span> */}
          </div>
          <HomeUserMenu />
        </div>

        <div className="mx-auto max-w-[1180px] px-10 pb-10 pt-2">
          {/* Page header */}
          <div className="flex items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
            <div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted">
                {view.type === "space"
                  ? "Space"
                  : view.type === "team"
                    ? "Team"
                    : "Your boards"}
              </div>
              <h1 className="mt-1 font-serif text-[34px] leading-[1.1] italic text-ink">
                {pageTitle}
              </h1>
              {view.type === "home" && (
                <p className="mt-1.5 text-[13px] text-ink-soft">
                  A quiet place to think, in pencil.
                </p>
              )}
              {view.type === "space" && (
                <p className="mt-1.5 text-[13px] text-ink-soft">
                  {shown.length} {shown.length === 1 ? "board" : "boards"} in this space
                </p>
              )}
              {view.type === "team" && currentTeam && (
                <p className="mt-1.5 text-[13px] text-ink-soft">
                  {currentTeam.members.length}{" "}
                  {currentTeam.members.length === 1 ? "member" : "members"}
                </p>
              )}
            </div>

            {view.type === "team" && currentTeam ? (
              <div className="flex items-center gap-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => openEditTeam(currentTeam.id)}
                  className="flex items-center gap-1.5 rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel px-3 py-1.5 text-[12.5px] font-medium text-ink shadow-[var(--shadow-sm)] hover:bg-panel-soft"
                >
                  <Pencil size={13} strokeWidth={1.8} />
                  Edit team
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (confirm(`Delete "${currentTeam.name}"?`)) {
                      deleteTeam(currentTeam.id);
                      setView({ type: "home" });
                    }
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-[var(--r-2xl)] border border-[var(--line)] bg-panel text-ink-soft shadow-[var(--shadow-sm)] hover:bg-panel-soft hover:text-red-500"
                  aria-label="Delete team"
                  title="Delete team"
                >
                  <Trash2 size={13} strokeWidth={1.8} />
                </motion.button>
              </div>
            ) : (
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={onCreate}
                className="flex items-center gap-1.5 rounded-[var(--r-2xl)] bg-ink px-3.5 py-2 text-[13px] font-semibold text-[var(--panel-soft)] shadow-[var(--shadow-md)] hover:bg-[#0e0e0e]"
              >
                <Plus size={15} strokeWidth={2.2} />
                New board
              </motion.button>
            )}
          </div>

          {view.type === "team" && currentTeam ? (
            <TeamDetail team={currentTeam} />
          ) : (
            <>
              {/* Filter + view toggle */}
              <div className="mb-4 mt-5 flex items-center justify-between">
                <div className="font-mono text-[11px] text-muted">
                  {shown.length} {shown.length === 1 ? "board" : "boards"}
                  {view.type !== "home" && ` · ${view.type === "starred" ? "Starred" : view.type === "recent" ? "Last 7 days" : currentSpace?.name}`}
                </div>
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

              {/* Boards list */}
              {!hydrated ? (
                <div className="py-20 text-center text-[13px] text-muted">Loading…</div>
              ) : shown.length === 0 ? (
                <EmptyState
                  onCreate={onCreate}
                  view={view}
                  filtered={!!query.trim()}
                  spaceName={currentSpace?.name}
                />
              ) : viewMode === "list" ? (
                <div className="overflow-hidden rounded-[var(--r-xl)] border border-[var(--line)] bg-panel">
                  <div
                    className="grid gap-4 border-b border-[var(--line)] bg-panel-soft px-3 py-2"
                    style={{ gridTemplateColumns: "minmax(0,2fr) 1fr 1fr 1fr auto" }}
                  >
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">Name</span>
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">Online</span>
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">Last opened</span>
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">Owner</span>
                    <span className="w-16" />
                  </div>
                  {shown.map((b) => (
                    <BoardCard key={b.id} board={b} view="list" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {shown.map((b) => (
                    <BoardCard key={b.id} board={b} view="grid" />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <CreateTeamModal
        open={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        editingTeamId={editingTeamId}
      />
    </main>
  );
}

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function TeamDetail({ team }: { team: { id: string; name: string; members: { userId: string; name: string; email: string; addedAt: number }[] } }) {
  if (team.members.length === 0) {
    return (
      <div className="mt-8 rounded-[var(--r-2xl)] border border-dashed border-[var(--line)] bg-panel/60 py-16 text-center">
        <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-panel-soft text-ink-soft">
          <Users size={16} strokeWidth={1.6} />
        </div>
        <p className="font-serif text-[22px] italic text-muted">Nobody here yet.</p>
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-ink-soft">
          Open this team from the sidebar menu and click &quot;Edit team&quot; to add people.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[11px] text-muted">
          {team.members.length} {team.members.length === 1 ? "member" : "members"}
        </span>
      </div>
      <div className="overflow-hidden rounded-[var(--r-xl)] border border-[var(--line)] bg-panel">
        <div
          className="grid gap-4 border-b border-[var(--line)] bg-panel-soft px-4 py-2"
          style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,2fr) auto" }}
        >
          <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">Name</span>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">Email</span>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">Added</span>
        </div>
        {team.members.map((m) => (
          <div
            key={m.userId}
            className="grid items-center gap-4 border-b border-[var(--line)] px-4 py-2.5 last:border-b-0 hover:bg-panel-soft"
            style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,2fr) auto" }}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-ink text-[10.5px] font-semibold text-white">
                {userInitials(m.name)}
              </div>
              <span className="truncate text-[13px] font-medium text-ink">{m.name}</span>
            </div>
            <span className="truncate font-mono text-[11.5px] text-ink-soft">{m.email}</span>
            <span className="font-mono text-[11px] text-muted">
              {new Date(m.addedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  onCreate,
  view,
  filtered,
  spaceName,
}: {
  onCreate: () => void;
  view: ViewState;
  filtered: boolean;
  spaceName?: string;
}) {
  let title = "A blank page.";
  let body = "No boards yet. Start one — it saves as you go.";
  if (filtered) {
    title = "Nothing matches.";
    body = "Try a different search term.";
  } else if (view.type === "starred") {
    title = "Nothing starred yet.";
    body = "Star a board to pin it here for quick access.";
  } else if (view.type === "recent") {
    title = "Nothing recent.";
    body = "Boards you've opened in the last 7 days show up here.";
  } else if (view.type === "space") {
    title = `${spaceName ?? "This space"} is empty.`;
    body = "Create a board to add it to this space.";
  }
  return (
    <div className="rounded-[var(--r-2xl)] border border-dashed border-[var(--line)] bg-panel/60 py-20 text-center">
      <p className="font-serif text-[26px] italic text-muted">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-[13px] text-ink-soft">{body}</p>
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
