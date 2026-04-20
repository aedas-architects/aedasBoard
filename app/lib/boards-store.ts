"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type BoardMeta = {
  id: string;
  name: string;
  icon: "folder" | "user" | "flow" | "grid";
  createdAt: number;
  updatedAt: number;
};

type BoardsState = {
  boards: BoardMeta[];
  starred: string[];
  hydrated: boolean;
  createBoard: (init?: Partial<Pick<BoardMeta, "name" | "icon">>) => BoardMeta;
  renameBoard: (id: string, name: string) => void;
  touchBoard: (id: string) => void;
  deleteBoard: (id: string) => void;
  duplicateBoard: (sourceId: string) => BoardMeta | null;
  toggleStar: (id: string) => void;
};

function uid() {
  return `b_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
}

const DEFAULT_ICONS: BoardMeta["icon"][] = ["folder", "user", "flow", "grid"];

export const useBoards = create<BoardsState>()(
  persist(
    (set, get) => ({
      boards: [],
      starred: [],
      hydrated: false,

      createBoard: (init) => {
        const now = Date.now();
        const icon =
          init?.icon ??
          DEFAULT_ICONS[get().boards.length % DEFAULT_ICONS.length];
        const board: BoardMeta = {
          id: uid(),
          name: init?.name ?? "Untitled board",
          icon,
          createdAt: now,
          updatedAt: now,
        };
        set({ boards: [board, ...get().boards] });
        return board;
      },

      renameBoard: (id, name) =>
        set({
          boards: get().boards.map((b) =>
            b.id === id ? { ...b, name, updatedAt: Date.now() } : b,
          ),
        }),

      touchBoard: (id) =>
        set({
          boards: get().boards.map((b) =>
            b.id === id ? { ...b, updatedAt: Date.now() } : b,
          ),
        }),

      deleteBoard: (id) => {
        set({
          boards: get().boards.filter((b) => b.id !== id),
          starred: get().starred.filter((s) => s !== id),
        });
        if (typeof window !== "undefined") {
          localStorage.removeItem(boardItemsKey(id));
        }
      },

      duplicateBoard: (sourceId) => {
        const src = get().boards.find((b) => b.id === sourceId);
        if (!src) return null;
        const now = Date.now();
        const copy: BoardMeta = {
          id: uid(),
          name: `${src.name} (copy)`,
          icon: src.icon,
          createdAt: now,
          updatedAt: now,
        };
        set({ boards: [copy, ...get().boards] });
        if (typeof window !== "undefined") {
          const raw = localStorage.getItem(boardItemsKey(sourceId));
          if (raw) localStorage.setItem(boardItemsKey(copy.id), raw);
        }
        return copy;
      },

      toggleStar: (id) => {
        const s = get().starred;
        set({
          starred: s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
        });
      },
    }),
    {
      name: "aedas.boards.index",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ boards: s.boards, starred: s.starred }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);

export function boardItemsKey(id: string) {
  return `aedas.board.${id}`;
}
