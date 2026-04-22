"use client";

import { create } from "zustand";
import { useSpaces } from "./spaces-store";
export type BoardMeta = {
  id: string;
  name: string;
  icon: "folder" | "user" | "flow" | "grid";
  createdAt: number;
  updatedAt: number;
  /** Set on boards that aren't owned by the current user. */
  userId?: string;
  /** User IDs the board is shared with; empty/undefined = solo board. */
  sharedWith?: string[];
  /** Space this board is filed under (owner-scoped). */
  spaceId?: string;
};

type BoardsState = {
  boards: BoardMeta[];
  starred: string[];
  hydrated: boolean;

  loadBoards: () => Promise<void>;
  createBoard: (init?: Partial<Pick<BoardMeta, "name" | "icon">>) => Promise<BoardMeta>;
  renameBoard: (id: string, name: string) => Promise<void>;
  touchBoard: (id: string) => void;
  deleteBoard: (id: string) => Promise<void>;
  duplicateBoard: (sourceId: string) => Promise<BoardMeta | null>;
  toggleStar: (id: string) => void;
};

function uid() {
  return `b_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
}

const DEFAULT_ICONS: BoardMeta["icon"][] = ["folder", "user", "flow", "grid"];

const JSON_HEADERS: HeadersInit = { "Content-Type": "application/json" };

// Starred boards are kept locally only — lightweight preference, not shared data.
const STARRED_KEY = "aedas.starred";

function loadStarred(): string[] {
  try { return JSON.parse(localStorage.getItem(STARRED_KEY) ?? "[]"); } catch { return []; }
}
function saveStarred(ids: string[]) {
  try { localStorage.setItem(STARRED_KEY, JSON.stringify(ids)); } catch { /* noop */ }
}

export const useBoards = create<BoardsState>((set, get) => ({
  boards: [],
  starred: [],
  hydrated: false,

  loadBoards: async () => {
    const starred = typeof window !== "undefined" ? loadStarred() : [];
    // Set hydrated immediately so the UI never hangs on a blank loading screen.
    set({ starred, hydrated: true });
    try {
      const res = await fetch("/api/boards");
      if (!res.ok) return; // 401 = not logged in yet, 500 = DB not configured
      const boards: BoardMeta[] = await res.json();
      set({ boards });
      // Push board → space assignments into the spaces store so the sidebar
      // and filters can key off spaceId without re-fetching per board.
      useSpaces.getState().syncBoardAssignments(
        boards.map((b) => ({ id: b.id, spaceId: b.spaceId })),
      );
    } catch {
      // Network error or DB not configured — boards stay empty.
    }
  },

  createBoard: async (init) => {
    const now = Date.now();
    const icon = init?.icon ?? DEFAULT_ICONS[get().boards.length % DEFAULT_ICONS.length];
    const board: BoardMeta = {
      id: uid(),
      name: init?.name ?? "Untitled board",
      icon,
      createdAt: now,
      updatedAt: now,
    };
    // Optimistic update first so navigation feels instant.
    set({ boards: [board, ...get().boards] });
    try {
      await fetch("/api/boards", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(board),
      });
    } catch { /* non-fatal */ }
    return board;
  },

  renameBoard: async (id, name) => {
    set({ boards: get().boards.map((b) => b.id === id ? { ...b, name, updatedAt: Date.now() } : b) });
    try {
      await fetch(`/api/boards/${id}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ name }),
      });
    } catch { /* non-fatal */ }
  },

  touchBoard: (id) =>
    set({ boards: get().boards.map((b) => b.id === id ? { ...b, updatedAt: Date.now() } : b) }),

  deleteBoard: async (id) => {
    set({
      boards: get().boards.filter((b) => b.id !== id),
      starred: get().starred.filter((s) => s !== id),
    });
    try {
      await fetch(`/api/boards/${id}`, { method: "DELETE", headers: JSON_HEADERS });
    } catch { /* non-fatal */ }
  },

  duplicateBoard: async (sourceId) => {
    const src = get().boards.find((b) => b.id === sourceId);
    if (!src) return null;
    const now = Date.now();
    // Carry spaceId so the copy stays filed in the same space as the original.
    const copy: BoardMeta = { id: uid(), name: `${src.name} (copy)`, icon: src.icon, createdAt: now, updatedAt: now, spaceId: src.spaceId };

    // Optimistic add.
    set({ boards: [copy, ...get().boards] });

    try {
      // Fetch source items then create the duplicate with them.
      const srcRes = await fetch(`/api/boards/${sourceId}`, { headers: JSON_HEADERS });
      const srcDoc = srcRes.ok ? await srcRes.json() as { items: unknown[] } : { items: [] };
      await fetch("/api/boards", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ ...copy, items: srcDoc.items }),
      });
    } catch { /* non-fatal */ }

    return copy;
  },

  toggleStar: (id) => {
    const s = get().starred;
    const next = s.includes(id) ? s.filter((x) => x !== id) : [...s, id];
    set({ starred: next });
    saveStarred(next);
  },
}));

export function boardItemsKey(id: string) {
  return `aedas.board.${id}`;
}
