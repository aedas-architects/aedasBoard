"use client";

import { create } from "zustand";

export type SpaceIcon = "folder" | "flow" | "grid" | "user";

export type Space = {
  id: string;
  name: string;
  icon: SpaceIcon;
  createdAt: number;
};

type SpacesState = {
  spaces: Space[];
  /**
   * Board → space mapping. Derived from each board's own `spaceId` (now
   * persisted on the board doc in Cosmos). Kept here for O(1) lookups from
   * the sidebar and home view.
   */
  boardSpace: Record<string, string>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /** Called whenever boards load so we can keep `boardSpace` in sync. */
  syncBoardAssignments: (boards: Array<{ id: string; spaceId?: string }>) => void;
  createSpace: (init?: Partial<Pick<Space, "name" | "icon">>) => Promise<Space | null>;
  renameSpace: (id: string, name: string) => Promise<void>;
  setSpaceIcon: (id: string, icon: SpaceIcon) => Promise<void>;
  deleteSpace: (id: string) => Promise<void>;
  setBoardSpace: (boardId: string, spaceId: string | null) => Promise<void>;
};

const JSON_HEADERS: HeadersInit = { "Content-Type": "application/json" };

/* -------- legacy localStorage keys — read once, then cleared after migrating
 *  to Cosmos so old browsers don't keep shadowing the server state. */
const LEGACY_SPACES_KEY = "aedas.spaces";
const LEGACY_ASSIGN_KEY = "aedas.boardSpaces";

function loadLegacySpaces(): Space[] | null {
  try {
    const raw = localStorage.getItem(LEGACY_SPACES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as Space[];
  } catch {
    return null;
  }
}

function loadLegacyAssignments(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(LEGACY_ASSIGN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Object.keys(parsed).length === 0) return null;
    return parsed as Record<string, string>;
  } catch {
    return null;
  }
}

function clearLegacyStorage() {
  try {
    localStorage.removeItem(LEGACY_SPACES_KEY);
    localStorage.removeItem(LEGACY_ASSIGN_KEY);
  } catch {
    /* noop */
  }
}

/** Migrate any localStorage spaces / assignments to the server, one-time. */
async function migrateLegacy(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const legacySpaces = loadLegacySpaces();
  const legacyAssign = loadLegacyAssignments();
  if (!legacySpaces && !legacyAssign) return false;

  const remoteByLegacyId = new Map<string, string>();
  if (legacySpaces) {
    for (const s of legacySpaces) {
      try {
        const res = await fetch("/api/spaces", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ name: s.name, icon: s.icon, createdAt: s.createdAt }),
        });
        if (res.ok) {
          const created = (await res.json()) as Space;
          remoteByLegacyId.set(s.id, created.id);
        }
      } catch {
        /* ignore — we'll just drop the unmigrated space */
      }
    }
  }
  if (legacyAssign) {
    for (const [boardId, oldSpaceId] of Object.entries(legacyAssign)) {
      const newSpaceId = remoteByLegacyId.get(oldSpaceId) ?? oldSpaceId;
      try {
        await fetch(`/api/boards/${boardId}`, {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify({ spaceId: newSpaceId }),
        });
      } catch {
        /* ignore */
      }
    }
  }
  clearLegacyStorage();
  return true;
}

export const useSpaces = create<SpacesState>((set, get) => ({
  spaces: [],
  boardSpace: {},
  hydrated: false,

  hydrate: async () => {
    if (typeof window === "undefined") return;
    // Best-effort migration from localStorage (one-time, silent on failure).
    await migrateLegacy();
    try {
      const res = await fetch("/api/spaces");
      if (!res.ok) {
        set({ hydrated: true });
        return;
      }
      const spaces = (await res.json()) as Space[];
      set({ spaces, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  syncBoardAssignments: (boards) => {
    const next: Record<string, string> = {};
    for (const b of boards) {
      if (b.spaceId) next[b.id] = b.spaceId;
    }
    set({ boardSpace: next });
  },

  createSpace: async (init) => {
    try {
      const res = await fetch("/api/spaces", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ name: init?.name ?? "New space", icon: init?.icon ?? "folder" }),
      });
      if (!res.ok) return null;
      const space = (await res.json()) as Space;
      set({ spaces: [...get().spaces, space] });
      return space;
    } catch {
      return null;
    }
  },

  renameSpace: async (id, name) => {
    // Optimistic — the rename is cheap to roll back if the server rejects.
    const prev = get().spaces;
    set({ spaces: prev.map((s) => (s.id === id ? { ...s, name } : s)) });
    try {
      const res = await fetch(`/api/spaces/${id}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ name }),
      });
      if (!res.ok) set({ spaces: prev });
    } catch {
      set({ spaces: prev });
    }
  },

  setSpaceIcon: async (id, icon) => {
    const prev = get().spaces;
    set({ spaces: prev.map((s) => (s.id === id ? { ...s, icon } : s)) });
    try {
      const res = await fetch(`/api/spaces/${id}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ icon }),
      });
      if (!res.ok) set({ spaces: prev });
    } catch {
      set({ spaces: prev });
    }
  },

  deleteSpace: async (id) => {
    const prevSpaces = get().spaces;
    const prevAssign = get().boardSpace;
    // Optimistic — drop the space client-side and clear assignments pointing
    // at it so the sidebar / filters update immediately.
    const nextAssign = { ...prevAssign };
    for (const k of Object.keys(nextAssign)) {
      if (nextAssign[k] === id) delete nextAssign[k];
    }
    set({
      spaces: prevSpaces.filter((s) => s.id !== id),
      boardSpace: nextAssign,
    });
    try {
      const res = await fetch(`/api/spaces/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        set({ spaces: prevSpaces, boardSpace: prevAssign });
      }
    } catch {
      set({ spaces: prevSpaces, boardSpace: prevAssign });
    }
  },

  setBoardSpace: async (boardId, spaceId) => {
    const prev = get().boardSpace;
    const next = { ...prev };
    if (spaceId === null) delete next[boardId];
    else next[boardId] = spaceId;
    set({ boardSpace: next });
    try {
      const res = await fetch(`/api/boards/${boardId}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ spaceId: spaceId ?? null }),
      });
      if (!res.ok) set({ boardSpace: prev });
    } catch {
      set({ boardSpace: prev });
    }
  },
}));
