"use client";

import { create } from "zustand";

export type TeamMember = {
  userId: string;
  name: string;
  email: string;
  addedAt: number;
};

export type Team = {
  id: string;
  name: string;
  members: TeamMember[];
  createdAt: number;
  updatedAt: number;
};

type TeamsState = {
  teams: Team[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  createTeam: (init: { name: string; members: TeamMember[] }) => Promise<Team | null>;
  updateTeam: (id: string, patch: { name?: string; members?: TeamMember[] }) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
};

const JSON_HEADERS: HeadersInit = { "Content-Type": "application/json" };

export const useTeams = create<TeamsState>((set, get) => ({
  teams: [],
  hydrated: false,

  hydrate: async () => {
    if (typeof window === "undefined") return;
    try {
      const res = await fetch("/api/teams");
      if (!res.ok) {
        set({ hydrated: true });
        return;
      }
      const teams = (await res.json()) as Team[];
      set({ teams, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  createTeam: async ({ name, members }) => {
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ name, members }),
      });
      if (!res.ok) return null;
      const team = (await res.json()) as Team;
      set({ teams: [...get().teams, team] });
      return team;
    } catch {
      return null;
    }
  },

  updateTeam: async (id, patch) => {
    const prev = get().teams;
    const next = prev.map((t) =>
      t.id === id
        ? {
            ...t,
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            ...(patch.members !== undefined ? { members: patch.members } : {}),
            updatedAt: Date.now(),
          }
        : t,
    );
    set({ teams: next });
    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify(patch),
      });
      if (!res.ok) set({ teams: prev });
    } catch {
      set({ teams: prev });
    }
  },

  deleteTeam: async (id) => {
    const prev = get().teams;
    set({ teams: prev.filter((t) => t.id !== id) });
    try {
      const res = await fetch(`/api/teams/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) set({ teams: prev });
    } catch {
      set({ teams: prev });
    }
  },
}));
